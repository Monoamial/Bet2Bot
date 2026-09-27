"""Game-facing entry point, called from the browser (Pyodide) worker.

Three flows, all returning plain JSON-able dicts so they're unit-testable without a
browser:
  * `run_level`   — run a block `strategy` vs one or more named opponents (Campaign).
  * `run_session` — a fixed-stack roll: one stack, bust or survive (survival mode).
  * `human_*`     — drive an interactive human-vs-bots session (Play / Academy).

A block strategy is the JSON policy produced by the visual builder and interpreted by
StrategyBot (poker/strategy.py). `config` dicts map onto GameConfig — including
`betting` ("limit" | "no_limit") and `stack` — so game modes are pure configuration.
"""

from typing import Callable, Dict, List, Optional, Union

from poker.bots import (
    ProfilingBot,
    caller,
    folder,
    maniac,
    position_aware,
    pot_odds_caller,
    rock,
    tight_aggressive,
    over_folder,
    river_bluffer,
    trapper,
)
from poker.engine import GameConfig
from poker.interactive import InteractiveMatch
from poker.match import run_match, run_session as _run_session
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
    "river_bluffer": lambda: river_bluffer,
    "over_folder": lambda: over_folder,
    "trapper": lambda: trapper,
}


def _resolve_opponents(opponent: Union[str, List[str]]) -> Optional[List[str]]:
    """Normalize to a list of known opponent keys; None if any is unknown."""
    keys = [opponent] if isinstance(opponent, str) else list(opponent)
    if not keys or any(k not in OPPONENTS for k in keys):
        return None
    return keys


def _bot_table(player_name: str, strategy: dict, keys: List[str]) -> Dict[str, object]:
    """Player in seat 0, then one bot per key (duplicate keys get numbered names)."""
    bots: Dict[str, object] = {player_name: StrategyBot(strategy)}
    for k in keys:
        name = k
        i = 2
        while name in bots:
            name = f"{k} {i}"
            i += 1
        bots[name] = OPPONENTS[k]()
    return bots


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
        "by_end_street": bs.by_end_street,
        "by_final_tier": bs.by_final_tier,
    }


def _payload(stats, cfg: GameConfig, hands: int) -> dict:
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


POLICY_MATCH_MAX_HANDS = 500
POLICY_MATCH_MAX_CAPTURE = 8
_POLICY_MATCH_CONFIG_FIELDS = {
    "small_bet", "big_bet", "small_blind", "big_blind", "raise_cap", "betting", "stack",
}


def _policy_match_config(config: Optional[dict]):
    """Validate the JSON-safe subset of GameConfig exposed to policy matches."""
    if config is None:
        return GameConfig(), None
    if not isinstance(config, dict):
        return None, "Match config must be an object."
    unknown = set(config) - _POLICY_MATCH_CONFIG_FIELDS
    if unknown:
        return None, f"Unsupported match config field: {sorted(unknown)[0]}."

    betting = config.get("betting", "limit")
    if betting not in ("limit", "no_limit", "pot_limit"):
        return None, "Betting must be limit, no_limit, or pot_limit."

    for key in ("small_bet", "big_bet", "small_blind", "big_blind", "raise_cap"):
        if key in config:
            value = config[key]
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                return None, f"{key} must be a positive whole number."
    stack = config.get("stack")
    if stack is not None and (not isinstance(stack, int) or isinstance(stack, bool) or stack <= 0):
        return None, "stack must be a positive whole number."

    small_blind = config.get("small_blind", GameConfig.small_blind)
    big_blind = config.get("big_blind", GameConfig.big_blind)
    if small_blind > big_blind:
        return None, "small_blind cannot exceed big_blind."
    try:
        return GameConfig(**config), None
    except (TypeError, ValueError) as exc:
        return None, f"Invalid match config: {exc}"


def run_policy_match(
    strategy_a: dict,
    strategy_b: dict,
    hands: int = 500,
    seed: Optional[int] = None,
    capture: int = 4,
    config: Optional[dict] = None,
) -> dict:
    """Run two Builder JSON policies head-to-head through the batch match runner.

    Both seats are StrategyBots, not entries from OPPONENTS. `seed` is passed through
    unchanged for reproducible deals. Policies are data interpreted by StrategyBot;
    this API does not execute Python or accept custom bot code.
    """
    if not isinstance(strategy_a, dict) or not isinstance(strategy_b, dict):
        return {"error": "Both bot strategies must be policy objects."}
    if not isinstance(hands, int) or isinstance(hands, bool) or not 1 <= hands <= POLICY_MATCH_MAX_HANDS:
        return {"error": f"Hands must be a whole number from 1 to {POLICY_MATCH_MAX_HANDS}."}
    if seed is not None and (not isinstance(seed, int) or isinstance(seed, bool)):
        return {"error": "Seed must be a whole number or omitted."}
    if not isinstance(capture, int) or isinstance(capture, bool) or not 0 <= capture <= POLICY_MATCH_MAX_CAPTURE:
        return {"error": f"Replay capture must be a whole number from 0 to {POLICY_MATCH_MAX_CAPTURE}."}

    cfg, config_error = _policy_match_config(config)
    if config_error:
        return {"error": config_error}
    bots = {
        "Bot A": StrategyBot(strategy_a),
        "Bot B": StrategyBot(strategy_b),
    }
    stats = run_match(bots, hands=hands, config=cfg, seed=seed, curate=capture // 2)
    result = _payload(stats, cfg, hands)
    result["seed"] = seed
    return result


def run_level(
    opponent: Union[str, List[str]],
    strategy: dict,
    hands: int = 500,
    seed: Optional[int] = None,
    capture: int = 6,
    player_name: str = "You",
    config: Optional[dict] = None,
) -> dict:
    """Run one level: the player's block `strategy` vs named opponent(s).

    `opponent` may be a single key (heads-up, the Campaign) or a list of keys (a
    multiway table; the player is seat 0). `seed=None` (the default) deals a fresh,
    fully random set of hands each run. Returns a JSON-able dict; on an unknown
    opponent, returns {"error": <message>}.

    `capture` is the total number of *curated* replays to return: the player's
    `capture // 2` biggest wins and biggest losses (see run_match). `timeline` is
    the player's cumulative net (chips) after each hand, for the winnings graph.
    """
    keys = _resolve_opponents(opponent)
    if keys is None:
        return {"error": f"Unknown opponent: {opponent!r}"}

    cfg = GameConfig(**config) if config else GameConfig()
    bots = _bot_table(player_name, strategy, keys)
    stats = run_match(bots, hands=hands, config=cfg, seed=seed,
                      curate=capture // 2)
    return _payload(stats, cfg, hands)


def run_session(
    opponent: Union[str, List[str]],
    strategy: dict,
    stack: int = 100,
    max_hands: int = 500,
    seed: Optional[int] = None,
    capture: int = 6,
    player_name: str = "You",
    config: Optional[dict] = None,
) -> dict:
    """A fixed-stack roll (survival): the player's strategy starts with `stack`
    chips carried hand to hand; opponents refill each hand. Ends on bust or
    `max_hands`. The payload's `timeline` is the player's stack after each hand,
    plus `busted`, `final_stack`, and `hands_survived`.
    """
    keys = _resolve_opponents(opponent)
    if keys is None:
        return {"error": f"Unknown opponent: {opponent!r}"}

    cfg = GameConfig(**config) if config else GameConfig()
    bots = _bot_table(player_name, strategy, keys)
    stats = _run_session(bots, stack=stack, max_hands=max_hands, config=cfg,
                         seed=seed, curate=capture // 2)
    out = _payload(stats, cfg, len(stats.session_stack))
    out["timeline"] = stats.session_stack       # stack curve, not cumulative net
    out["start_stack"] = stack
    out["busted"] = stats.session_busted
    out["final_stack"] = stats.session_final_stack
    out["hands_survived"] = len(stats.session_stack)
    return out


# --- Interactive "play vs bots" session (one at a time) ------------------------------
_match: Optional[InteractiveMatch] = None


def human_new(opponent: Union[str, List[str]], seed: Optional[int] = None,
              config: Optional[dict] = None,
              fixed_button: Optional[int] = None,
              stack: Optional[int] = None,
              carry: bool = False) -> dict:
    """Start a fresh live match vs named opponent(s) and deal the first hand.

    `opponent` may be a key or a list of keys (multiway; the human is seat 0).
    `fixed_button` (0 = human) pins the button for every hand — the Academy's
    in-position / out-of-position drills; None rotates normally. `stack` gives every
    seat that many chips per hand; with `carry=True` the human's stack persists
    across hands (survival) while bots refill.
    """
    global _match
    keys = _resolve_opponents(opponent)
    if keys is None:
        return {"error": f"Unknown opponent: {opponent!r}"}
    cfg = GameConfig(**config) if config else GameConfig()
    _match = InteractiveMatch([OPPONENTS[k]() for k in keys], config=cfg, seed=seed,
                              fixed_button=fixed_button, stack=stack, carry=carry)
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


def human_opponent_names() -> List[str]:
    """Roster keys, for UIs that want to build tables."""
    return list(OPPONENTS.keys())
