"""Actions a bot can take, plus legality checking and sanitizing.

Bots return one of the four action strings below. Because this is *Limit* Hold'em,
a raise has a fixed size, so the action is just a label -- no bet amount needed.
"""

from typing import List

FOLD = "fold"
CHECK = "check"
CALL = "call"
RAISE = "raise"

ACTIONS = (FOLD, CHECK, CALL, RAISE)


def legal_actions(to_call: int, raises_so_far: int, raise_cap: int) -> List[str]:
    """Return the actions that are legal in the current spot.

    - If facing a bet (to_call > 0): you may FOLD or CALL, and RAISE if the cap
      has not been reached.
    - If not facing a bet (to_call == 0): you may CHECK, and RAISE (i.e. open a bet)
      if the cap has not been reached. Folding is legal but pointless.
    """
    actions: List[str] = []
    if to_call > 0:
        actions.append(FOLD)
        actions.append(CALL)
    else:
        actions.append(CHECK)
    if raises_so_far < raise_cap:
        actions.append(RAISE)
    return actions


def sanitize(action: object, legal: List[str]) -> str:
    """Map any bot return value to a safe, legal action.

    Returns a tuple-free single action string. The engine uses the boolean result of
    `action not in legal or ...` separately to count mistakes; here we just pick the
    safe fallback:
      - RAISE when not allowed  -> CALL if facing a bet, else CHECK
      - CHECK when facing a bet -> FOLD  (shouldn't happen: CHECK illegal then)
      - FOLD when checking free  -> CHECK (never fold for free)
      - garbage / None           -> CHECK if free, else FOLD
    """
    if isinstance(action, str):
        action = action.strip().lower()

    if action in legal:
        # Never fold when checking is free -- treat it as a check.
        if action == FOLD and CHECK in legal:
            return CHECK
        return action

    # Illegal or unrecognised: choose the safest legal fallback.
    if RAISE == action and CALL in legal:
        return CALL
    if CALL in legal:
        return CALL
    if CHECK in legal:
        return CHECK
    return FOLD


def is_legal(action: object, legal: List[str]) -> bool:
    """True if `action` is exactly one of the legal action strings."""
    return isinstance(action, str) and action.strip().lower() in legal
