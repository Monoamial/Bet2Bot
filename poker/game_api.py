"""Game-facing entry point, called from the browser (Pyodide) worker.

Two flows, both returning plain JSON-able dicts so they're unit-testable without a
browser:
  * `run_level`  — run a block `strategy` heads-up vs a named opponent (the Campaign).
  * `human_*`    — drive an interactive human-vs-bot session (Play / Academy).

A block strategy is the JSON policy produced by the visual builder and interpreted by
StrategyBot (poker/strategy.py).
"""

from typing import Callable, Dict, Optional

from poker.bots import (
    ProfilingBot,
    caller,
    folder,
    maniac,
    position_aware,
    pot_odds_caller,
    rock,
    tight_aggressive,
)
from poker.engine import GameConfig
from poker.interactive import InteractiveMatch
from poker.match import run_match
from poker.strategy import StrategyBot

# Opponent roster. Values are *factories* so stateful bots get a fresh instance.
OPPONENTS: Dict[str, Callable[[], object]] = {
    "folder": lambda: folder,
    "caller": lambda: caller,
    "maniac": lambda: maniac,
    "rock": lambda: rock,
    "pot_odds_caller": lambda: pot_odds_caller,
    "position_aware": lambda: position_aware,
    "tight_aggressive": lambda: tight_aggressive,
    "profiler": lambda: ProfilingBot(),
}


def _row(bs, big_blind: int) -> dict:
    af = bs.aggression_factor
    return {
        "name": bs.name,
        "hands": bs.hands,
        "net": bs.net,
        "bb100": bs.bb_per_100(big_blind),
        "vpip": bs.vpip_pct,
        "pfr": bs.pfr_pct,
        "af": None if af == float("inf") else af,
        "win_pct": bs.win_pct,
        "showdown_pct": bs.showdown_pct,
        "biggest_win": bs.biggest_win,
        "biggest_loss": bs.biggest_loss,
        "showdowns_won": bs.showdowns_won,
        "illegal": bs.illegal,
    }


def run_level(
    opponent: str,
    strategy: dict,
    hands: int = 500,
    seed: Optional[int] = None,
    capture: int = 6,
    player_name: str = "You",
    config: Optional[dict] = None,
) -> dict:
    """Run one level: the player's block `strategy` heads-up vs a named opponent.

    `seed=None` (the default) deals a fresh, fully random set of hands each run.
    Returns a JSON-able dict; on an unknown opponent, returns {"error": <message>}.

    `capture` is the total number of *curated* replays to return: the player's
    `capture // 2` biggest wins and biggest losses (see run_match). `timeline` is
    the player's cumulative net (chips) after each hand, for the winnings graph.
    """
    if opponent not in OPPONENTS:
        return {"error": f"Unknown opponent: {opponent!r}"}

    cfg = GameConfig(**config) if config else GameConfig()
    bots = {player_name: StrategyBot(strategy), opponent: OPPONENTS[opponent]()}
    stats = run_match(bots, hands=hands, config=cfg, seed=seed,
                      curate=capture // 2)

    player = stats.seats[0]          # player was inserted first, so seat 0
    return {
        "error": None,
        "players": [b.name for b in stats.seats],
        "player_index": 0,
        "opponent_index": 1,
        "summary": [_row(b, cfg.big_blind) for b in stats.seats],
        "replays": stats.curated,
        "timeline": player.bankroll,
        "big_blind": cfg.big_blind,
        "player_net": player.net,
        "player_bb100": player.bb_per_100(cfg.big_blind),
        "hands": hands,
    }


# --- Interactive "play vs a bot" session (one at a time) ------------------------------
_match: Optional[InteractiveMatch] = None


def human_new(opponent: str, seed: Optional[int] = None,
              config: Optional[dict] = None,
              fixed_button: Optional[int] = None) -> dict:
    """Start a fresh live match vs a named opponent and deal the first hand.

    `fixed_button` (0 = human, 1 = opponent) pins the button for every hand —
    the Academy's in-position / out-of-position drills; None rotates normally.
    """
    global _match
    if opponent not in OPPONENTS:
        return {"error": f"Unknown opponent: {opponent!r}"}
    cfg = GameConfig(**config) if config else GameConfig()
    _match = InteractiveMatch(OPPONENTS[opponent](), config=cfg, seed=seed,
                              fixed_button=fixed_button)
    return _match.start_hand()


def human_deal() -> dict:
    """Deal the next hand of the current match."""
    if _match is None:
        return {"error": "No active match. Call human_new first."}
    return _match.start_hand()


def human_act(action: str) -> dict:
    """Apply the human's action to the current hand and advance."""
    if _match is None:
        return {"error": "No active match. Call human_new first."}
    return _match.act(action)
