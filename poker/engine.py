"""Plays a single hand of Limit Texas Hold'em.

Simplifications (see the plan): stacks are effectively infinite, so there are no
all-ins and no side pots. We track each seat's net chip change for the hand.
"""

import random
from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Set

from poker.action import CALL, CHECK, FOLD, RAISE, is_legal, legal_actions, sanitize
from poker.cards import Card, Deck
from poker.evaluator import category_name, evaluate
from poker.state import STREETS, GameState, HandSummary

# A bot is either a function `act(state) -> action`, or a class instance exposing an
# `act(self, state) -> action` method (and optionally an `on_hand_end(self, summary)`
# hook for learning across hands).
BotFn = Callable[[GameState], str]


def resolve_act(bot) -> BotFn:
    """Return the callable that chooses an action for `bot`.

    Accepts a plain function (used directly) or an object with an `act` method.
    """
    act = getattr(bot, "act", None)
    if callable(act):
        return act
    return bot


def resolve_hook(bot):
    """Return the bot's on_hand_end callable, or None if it has no learning hook."""
    hook = getattr(bot, "on_hand_end", None)
    return hook if callable(hook) else None


@dataclass
class GameConfig:
    """Betting structure for a Limit Hold'em table."""

    small_bet: int = 2          # raise increment preflop and flop
    big_bet: int = 4            # raise increment on turn and river
    small_blind: int = 1
    big_blind: int = 2
    raise_cap: int = 4          # max bets+raises per street (1 bet + 3 raises)


@dataclass
class HandResult:
    """Outcome of one hand, with per-seat metrics for the stats tracker."""

    net: List[int]                              # net chip change per seat
    log: List[str] = field(default_factory=list)
    vpip_seats: Set[int] = field(default_factory=set)
    pfr_seats: Set[int] = field(default_factory=set)
    bet_raise_count: List[int] = field(default_factory=list)
    call_count: List[int] = field(default_factory=list)
    illegal_count: List[int] = field(default_factory=list)
    showdown_seats: List[int] = field(default_factory=list)
    won_showdown_seats: Set[int] = field(default_factory=set)
    # Public info for the end-of-hand summary handed to stateful bots:
    board: List[Card] = field(default_factory=list)
    betting_history: List[tuple] = field(default_factory=list)
    winners: List[int] = field(default_factory=list)
    revealed: Dict[int, List[Card]] = field(default_factory=dict)
    # Ordered, JSON-able events for animating/replaying the hand (only populated when
    # play_hand is called with record_events=True). See _EVENT TYPES_ in play_hand.
    events: List[dict] = field(default_factory=list)


def _order_from(start: int, n: int) -> List[int]:
    """Seat indices clockwise starting at `start`."""
    return [(start + i) % n for i in range(n)]


def play_hand_gen(
    n: int,
    button: int,
    config: GameConfig,
    rng: random.Random,
    log: bool = False,
    record_events: bool = False,
    event_sink: Optional[List[dict]] = None,
):
    """Core hand logic as a generator, so it can be driven by bots or a live human.

    It yields a GameState each time the seat `state.my_seat` must act, and expects the
    driver to `.send((raw_action, explain))` back. On completion it returns (via
    StopIteration.value) a HandResult. `play_hand` drives it with bots; the interactive
    session (poker/interactive.py) drives it with a human in one seat.

    EVENT TYPES recorded when record_events=True (each has a "type" key):
      blinds   {button, sb_seat, sb, bb_seat, bb, players}
      hole     {seat, cards:[str,str]}
      action   {seat, street, action, amount, pot, to_call, explain}
      board    {street, cards:[str...], board:[str...]}
      showdown {board:[str...], reveals:{seat:[str,str]}, hands:{seat:name}}
      award    {winners:[seat...], pot, net:[int...]}
    """
    deck = Deck(rng)
    deck.shuffle()

    hole: List[List[Card]] = [deck.deal(2) for _ in range(n)]
    board: List[Card] = []

    contrib = [0] * n          # total chips committed this hand, per seat
    folded = [False] * n
    history: List[tuple] = []

    result = HandResult(
        net=[0] * n,
        bet_raise_count=[0] * n,
        call_count=[0] * n,
        illegal_count=[0] * n,
    )
    lines: List[str] = []
    events: List[dict] = []

    def emit(msg: str) -> None:
        if log:
            lines.append(msg)

    def ev(event: dict) -> None:
        if record_events:
            events.append(event)
        if event_sink is not None:
            event_sink.append(event)

    # --- Post blinds ---
    if n == 2:
        sb_seat, bb_seat = button, (button + 1) % n
    else:
        sb_seat, bb_seat = (button + 1) % n, (button + 2) % n
    contrib[sb_seat] += config.small_blind
    contrib[bb_seat] += config.big_blind
    emit(f"Seat {sb_seat} posts SB {config.small_blind}, "
         f"seat {bb_seat} posts BB {config.big_blind}")
    ev({"type": "blinds", "button": button, "sb_seat": sb_seat,
        "sb": config.small_blind, "bb_seat": bb_seat, "bb": config.big_blind,
        "players": n})
    for s in range(n):
        ev({"type": "hole", "seat": s, "cards": [str(c) for c in hole[s]]})

    def active_seats() -> List[int]:
        return [s for s in range(n) if not folded[s]]

    def run_betting_round(street_idx: int) -> None:
        """Run one street of betting. Mutates contrib/folded/history/result."""
        preflop = street_idx == 0
        bet_size = config.small_bet if street_idx <= 1 else config.big_bet

        # street_contrib tracks chips put in *this* street only.
        if preflop:
            street_contrib = [0] * n
            street_contrib[sb_seat] = config.small_blind
            street_contrib[bb_seat] = config.big_blind
            current_bet = config.big_blind
            raises_so_far = 1            # the big blind is the opening bet
            first = button if n == 2 else (button + 3) % n
        else:
            street_contrib = [0] * n
            current_bet = 0
            raises_so_far = 0
            first = (button + 1) % n     # left of button (heads-up: the BB)

        # Build the action queue clockwise from `first`, skipping folded seats.
        order = [s for s in _order_from(first, n) if not folded[s]]
        queue = deque(order)
        acted: Set[int] = set()

        while queue:
            if len(active_seats()) <= 1:
                return
            seat = queue.popleft()
            if folded[seat]:
                continue
            to_call = current_bet - street_contrib[seat]
            if seat in acted and to_call == 0:
                continue  # already matched the current bet; nothing to do

            legal = legal_actions(to_call, raises_so_far, config.raise_cap)
            state = GameState(
                hole_cards=list(hole[seat]),
                my_seat=seat,
                my_contribution=contrib[seat],
                community_cards=list(board),
                street=STREETS[street_idx],
                pot=sum(contrib),
                to_call=to_call,
                bet_size=bet_size,
                raises_so_far=raises_so_far,
                raise_cap=config.raise_cap,
                button=button,
                num_players=n,
                active_players=active_seats(),
                contributions=list(contrib),
                betting_history=list(history),
                legal_actions=list(legal),
            )

            raw, explain = yield state
            if not is_legal(raw, legal):
                result.illegal_count[seat] += 1
            action = sanitize(raw, legal)

            acted.add(seat)
            history.append((seat, action))
            emit(f"  {STREETS[street_idx]}: seat {seat} {action}")

            paid = 0
            if action == FOLD:
                folded[seat] = True
            elif action == CHECK:
                pass
            elif action == CALL:
                paid = to_call
                contrib[seat] += paid
                street_contrib[seat] += paid
                result.call_count[seat] += 1
                if preflop:
                    result.vpip_seats.add(seat)
            elif action == RAISE:
                current_bet += bet_size
                raises_so_far += 1
                paid = current_bet - street_contrib[seat]
                contrib[seat] += paid
                street_contrib[seat] += paid
                result.bet_raise_count[seat] += 1
                if preflop:
                    result.vpip_seats.add(seat)
                    result.pfr_seats.add(seat)
                # A raise reopens the action: everyone else must respond again.
                acted = {seat}
                queue = deque(
                    s for s in _order_from((seat + 1) % n, n)
                    if not folded[s] and s != seat
                )

            ev({"type": "action", "seat": seat, "street": STREETS[street_idx],
                "action": action, "amount": paid, "pot": sum(contrib),
                "to_call": to_call, "explain": explain})

    # --- Run the four streets, dealing the board between them ---
    for street_idx in range(4):
        if len(active_seats()) <= 1:
            break
        if street_idx == 1:
            new_cards = deck.deal(3)
            board.extend(new_cards)
            emit(f"Flop: {' '.join(str(c) for c in board)}")
        elif street_idx == 2:
            new_cards = deck.deal(1)
            board.extend(new_cards)
            emit(f"Turn: {' '.join(str(c) for c in board)}")
        elif street_idx == 3:
            new_cards = deck.deal(1)
            board.extend(new_cards)
            emit(f"River: {' '.join(str(c) for c in board)}")
        else:
            new_cards = []
        if new_cards:
            ev({"type": "board", "street": STREETS[street_idx],
                "cards": [str(c) for c in new_cards],
                "board": [str(c) for c in board]})
        yield from run_betting_round(street_idx)

    # --- Award the pot ---
    pot = sum(contrib)
    survivors = active_seats()
    if len(survivors) == 1:
        winners = survivors
        emit(f"Seat {winners[0]} wins {pot} (all others folded)")
    else:
        # Showdown: best 7-card hand wins; ties split. Hole cards become public.
        result.showdown_seats = list(survivors)
        result.revealed = {s: list(hole[s]) for s in survivors}
        scores = {s: evaluate(hole[s] + board) for s in survivors}
        best = max(scores.values())
        winners = [s for s in survivors if scores[s] == best]
        result.won_showdown_seats = set(winners)
        for s in survivors:
            emit(f"  Seat {s} shows {' '.join(str(c) for c in hole[s])} "
                 f"-> {category_name(scores[s])}")
        emit(f"Seat(s) {winners} win {pot}")
        ev({"type": "showdown", "board": [str(c) for c in board],
            "reveals": {s: [str(c) for c in hole[s]] for s in survivors},
            "hands": {s: category_name(scores[s]) for s in survivors}})

    # Split the pot; give any odd-chip remainder to the earliest winning seat
    # (left of the button), which is the standard rule.
    share, remainder = divmod(pot, len(winners))
    for s in range(n):
        result.net[s] -= contrib[s]
    ordered_winners = [s for s in _order_from((button + 1) % n, n) if s in winners]
    for i, s in enumerate(ordered_winners):
        result.net[s] += share + (remainder if i == 0 else 0)

    ev({"type": "award", "winners": list(winners), "pot": pot,
        "net": list(result.net)})

    result.board = list(board)
    result.betting_history = list(history)
    result.winners = list(winners)
    result.log = lines
    result.events = events
    return result


def play_hand(
    seats: List[BotFn],
    button: int,
    config: GameConfig,
    rng: Optional[random.Random] = None,
    log: bool = False,
    record_events: bool = False,
) -> HandResult:
    """Play one hand with bots in every seat. `seats[i]` is the bot in seat i.

    Thin driver over `play_hand_gen`: answers each yielded decision by calling that
    seat's bot (and reading its optional `last_decision` for the replay annotation).
    """
    n = len(seats)
    if n < 2:
        raise ValueError("need at least 2 players")
    rng = rng or random.Random()
    act_fns = [resolve_act(b) for b in seats]

    gen = play_hand_gen(n, button, config, rng, log, record_events)
    try:
        state = next(gen)
        while True:
            fn = act_fns[state.my_seat]
            try:
                raw = fn(state)
            except Exception:
                raw = None
            explain = getattr(seats[state.my_seat], "last_decision", None)
            state = gen.send((raw, explain))
    except StopIteration as e:
        return e.value
