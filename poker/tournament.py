"""Batch engine-first chip-carrying poker tournaments.

Unlike ``run_match`` (refill stacks each hand) and ``run_session`` (one carried
player versus replenished opponents), this driver carries every player's stack and
removes busted players before dealing the next hand. The engine sees a compact list
of the active players on every call; ``TournamentHand.seat_map`` and replay
``seat_map`` explicitly translate those local hand seats back to stable tournament
player IDs (zero-based insertion order in ``bots``).

This is batch, bot-only play. It does not implement a live human tournament.

History hooks are intentionally not called in this first slice. ``GameState`` uses
compact hand-local seat indices, while a useful cross-hand ``HandSummary`` must use
stable tournament IDs. Calling hooks with either one without also changing the
bot-facing state contract would silently mismatch seats after an elimination.
"""

from __future__ import annotations

import hashlib
import heapq
import random
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Optional

from poker.engine import GameConfig, play_hand


@dataclass(frozen=True)
class TournamentElimination:
    """One player's tournament finish.

    ``hand`` is one-based. Players busted in the same hand share the same
    ``place``; their order in ``TournamentResult.elimination_order`` is the
    active-seat order for that hand.
    """

    player_id: int
    name: str
    hand: int
    place: int


@dataclass(frozen=True)
class TournamentHand:
    """Compact, global-ID-indexed outcome for one hand.

    ``seat_map[local_seat]`` is the stable tournament ``player_id``. ``net`` and
    ``stacks`` are indexed by stable player ID and have an entry for every original
    player (inactive players have zero net and retain their zero stack).
    """

    number: int
    button_id: int
    local_button: int
    seat_map: tuple[int, ...]
    net: tuple[int, ...]
    stacks: tuple[int, ...]
    winners: tuple[int, ...]
    eliminated_ids: tuple[int, ...]
    pot: int


@dataclass(frozen=True)
class TournamentResult:
    """Final tournament state; all player IDs are their input-order indices."""

    player_names: tuple[str, ...]
    starting_stack: int
    max_hands: int
    hands_played: int
    status: str  # "winner" or "hand_cap"
    winner_id: Optional[int]
    final_stacks: tuple[int, ...]  # indexed by stable player ID
    elimination_order: tuple[TournamentElimination, ...]
    hands: tuple[TournamentHand, ...]
    replays: tuple[dict, ...]

    @property
    def player_ids(self) -> tuple[int, ...]:
        """Stable IDs in insertion order; ``player_names[id]`` gives the name."""
        return tuple(range(len(self.player_names)))

    @property
    def winner(self) -> Optional[str]:
        """Winner's display name, or ``None`` when the hand cap was reached."""
        if self.winner_id is None:
            return None
        return self.player_names[self.winner_id]

    @property
    def stacks(self) -> dict[str, int]:
        """Final stacks keyed by input bot name, including eliminated players at 0."""
        return dict(zip(self.player_names, self.final_stacks))

    @property
    def stacks_by_id(self) -> dict[int, int]:
        """Final stacks keyed by stable tournament player ID."""
        return dict(enumerate(self.final_stacks))

    @property
    def hand_cap_reached(self) -> bool:
        return self.status == "hand_cap"


class _CuratedReplays:
    """Keep only the K most notable event streams, not every hand's events."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        # (priority, replay); hand number makes priorities unique and avoids ever
        # comparing replay dictionaries in heap tie-breaks.
        self._heap: list[tuple[tuple[int, int, int, int], dict]] = []

    def offer(self, priority: tuple[int, int, int, int], replay: dict) -> None:
        if self.limit <= 0:
            return
        heapq.heappush(self._heap, (priority, replay))
        if len(self._heap) > self.limit:
            heapq.heappop(self._heap)

    def results(self) -> tuple[dict, ...]:
        ordered = sorted(self._heap, key=lambda item: item[0], reverse=True)
        return tuple(replay for _, replay in ordered)


def _seed_decision_streams(bots: tuple[object, ...], seed: Optional[int]) -> None:
    """Seed opt-in bot RNGs once per original tournament seat, independently of deals."""
    for player_id, bot in enumerate(bots):
        seed_decisions = getattr(bot, "seed_decisions", None)
        if not callable(seed_decisions):
            continue
        if seed is None:
            bot_seed = None
        else:
            material = f"bet2bot-tournament-v1:{seed}:{player_id}".encode("utf-8")
            bot_seed = int.from_bytes(
                hashlib.blake2b(material, digest_size=8).digest(), "big"
            )
        seed_decisions(bot_seed)


def _next_active_after(previous_button: int, active_ids: list[int], player_count: int) -> int:
    """Next live ID clockwise from a button, scanning the original seat ring."""
    active = set(active_ids)
    for offset in range(1, player_count + 1):
        candidate = (previous_button + offset) % player_count
        if candidate in active:
            return candidate
    raise RuntimeError("tournament has no active players")


def _seat_map_rows(seat_map: list[int], names: tuple[str, ...]) -> list[dict]:
    """JSON-friendly map for replay consumers; event seat numbers stay hand-local."""
    return [
        {"local_seat": local, "player_id": player_id, "name": names[player_id]}
        for local, player_id in enumerate(seat_map)
    ]


def run_tournament(
    bots: Mapping[str, object],
    starting_stack: int,
    max_hands: int,
    config: Optional[GameConfig] = None,
    seed: Optional[int] = None,
    *,
    curate: int = 0,
    log: bool = False,
) -> TournamentResult:
    """Run a true chip-carrying, batch tournament using the existing hand engine.

    ``bots`` is read in iteration order. Stable global player IDs are assigned as
    ``0..len(bots)-1`` in that order; each hand's compact local seats are mapped by
    ``TournamentHand.seat_map`` and the same explicit map is included in each replay.
    Event seat indexes in a replay remain local to that hand, as emitted by
    ``play_hand``.

    All players start with ``starting_stack`` chips. Their stacks are carried across
    hands, and any player ending a hand at zero is removed before the next hand. The
    button advances clockwise to the next remaining player in the original seat ring;
    the active players are then compacted in that clockwise order. This lets
    ``play_hand`` apply its normal three-or-more-handed and heads-up blind rules.
    ``config.stack`` does not refill or override these carried stacks: explicit
    per-seat stacks are passed to the engine on every hand.

    ``status`` is ``"winner"`` when one player remains, otherwise ``"hand_cap"``
    when ``max_hands`` is reached. ``elimination_order`` is chronological; players
    busted simultaneously share a place. ``final_stacks`` is indexed by stable ID,
    and the convenience ``stacks`` property maps names to those values.

    ``curate=K`` retains at most K event streams, prioritizing the tournament-ending
    hand, then simultaneous/more eliminations, then larger pots (earlier hands break
    ties). With ``curate=0`` no event streams are retained. Only stateless bots or
    bots that do not depend on cross-hand ``on_hand_end`` learning are supported until
    the engine supplies stable IDs in bot-facing ``GameState`` objects. Optional
    ``seed_decisions(seed)`` methods are seeded once by stable global ID, separately
    from the deck RNG. As usual, reproducibility of other bot-owned random sources is
    the bot's responsibility.
    """
    if not isinstance(bots, Mapping):
        raise TypeError("bots must be an ordered mapping of names to bots")
    entries = list(bots.items())
    if len(entries) < 2:
        raise ValueError("need at least 2 bots")
    if any(not isinstance(name, str) for name, _ in entries):
        raise ValueError("bot names must be strings")
    if isinstance(starting_stack, bool) or not isinstance(starting_stack, int) or starting_stack <= 0:
        raise ValueError("starting_stack must be a positive whole number")
    if isinstance(max_hands, bool) or not isinstance(max_hands, int) or max_hands < 0:
        raise ValueError("max_hands must be a non-negative whole number")
    if isinstance(curate, bool) or not isinstance(curate, int) or curate < 0:
        raise ValueError("curate must be a non-negative whole number")
    if seed is not None and (isinstance(seed, bool) or not isinstance(seed, int)):
        raise ValueError("seed must be a whole number or None")
    if config is None:
        config = GameConfig()
    elif not isinstance(config, GameConfig):
        raise TypeError("config must be a GameConfig or None")

    names = tuple(name for name, _ in entries)
    all_bots = tuple(bot for _, bot in entries)
    player_count = len(all_bots)
    _seed_decision_streams(all_bots, seed)

    rng = random.Random(seed)
    stacks = [starting_stack] * player_count
    total_chips = sum(stacks)
    previous_button: Optional[int] = None
    elimination_order: list[TournamentElimination] = []
    hands: list[TournamentHand] = []
    curated = _CuratedReplays(curate)
    winner_id: Optional[int] = None

    for hand_number in range(1, max_hands + 1):
        active_ids = [player_id for player_id, stack in enumerate(stacks) if stack > 0]
        if len(active_ids) <= 1:
            winner_id = active_ids[0] if active_ids else None
            break

        button_id = (
            active_ids[0]
            if previous_button is None
            else _next_active_after(previous_button, active_ids, player_count)
        )
        seat_map = active_ids  # local hand seat -> stable tournament player ID
        local_button = seat_map.index(button_id)
        hand_stacks = [stacks[player_id] for player_id in seat_map]
        hand_bots = [all_bots[player_id] for player_id in seat_map]

        result = play_hand(
            hand_bots,
            local_button,
            config,
            rng=rng,
            log=log,
            record_events=curate > 0,
            stacks=hand_stacks,
        )
        if result.final_stacks is None or len(result.final_stacks) != len(seat_map):
            raise RuntimeError("play_hand did not return one final stack per active seat")
        if len(result.net) != len(seat_map) or sum(result.net) != 0:
            raise RuntimeError("play_hand returned an invalid chip-conservation result")

        for local_seat, player_id in enumerate(seat_map):
            final_stack = result.final_stacks[local_seat]
            if final_stack < 0 or final_stack != hand_stacks[local_seat] + result.net[local_seat]:
                raise RuntimeError("play_hand returned inconsistent final stacks")
            stacks[player_id] = final_stack
        if sum(stacks) != total_chips:
            raise RuntimeError("tournament chip total changed after a hand")

        busted_now = [player_id for player_id in seat_map if stacks[player_id] == 0]
        if busted_now:
            place = len(active_ids) - len(busted_now) + 1
            for player_id in busted_now:
                elimination_order.append(TournamentElimination(
                    player_id=player_id,
                    name=names[player_id],
                    hand=hand_number,
                    place=place,
                ))

        remaining = [player_id for player_id in active_ids if stacks[player_id] > 0]
        hand_winner_id = remaining[0] if len(remaining) == 1 else None
        global_net = [0] * player_count
        for local_seat, player_id in enumerate(seat_map):
            global_net[player_id] = result.net[local_seat]
        global_winners = tuple(seat_map[local] for local in result.winners)
        pot = sum(layer["amount"] for layer in result.pots)
        hands.append(TournamentHand(
            number=hand_number,
            button_id=button_id,
            local_button=local_button,
            seat_map=tuple(seat_map),
            net=tuple(global_net),
            stacks=tuple(stacks),
            winners=global_winners,
            eliminated_ids=tuple(busted_now),
            pot=pot,
        ))

        if curate > 0:
            replay = {
                "hand": hand_number,
                "button_id": button_id,
                "local_button": local_button,
                "seat_map": _seat_map_rows(seat_map, names),
                "pot": pot,
                "eliminated_ids": list(busted_now),
                "events": result.events,
            }
            priority = (int(hand_winner_id is not None), len(busted_now), pot, -hand_number)
            curated.offer(priority, replay)

        if log:
            print(f"--- Tournament hand {hand_number} (button={names[button_id]}) ---")
            print("\n".join(result.log))

        if hand_winner_id is not None:
            winner_id = hand_winner_id
            break
        previous_button = button_id

    status = "winner" if winner_id is not None else "hand_cap"
    return TournamentResult(
        player_names=names,
        starting_stack=starting_stack,
        max_hands=max_hands,
        hands_played=len(hands),
        status=status,
        winner_id=winner_id,
        final_stacks=tuple(stacks),
        elimination_order=tuple(elimination_order),
        hands=tuple(hands),
        replays=curated.results(),
    )
