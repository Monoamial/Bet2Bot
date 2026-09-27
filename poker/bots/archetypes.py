"""Small, deterministic opponent archetypes with obvious counter-strategies.

These are intentionally exploitable teaching opponents, not balanced poker bots:
bluff-catch the River Bluffer, steal from the Over-folder, and take free cards
against the Trapper before respecting a delayed raise.
"""

from poker.action import CALL, CHECK, FOLD, RAISE
from poker.bots.examples import tight_aggressive
from poker.evaluator import evaluate
from poker.state import GameState


def _ordinary_postflop(state: GameState, category: int) -> str:
    """Use a simple value-first line away from the River Bluffer's signature spot."""
    if category >= 2 and RAISE in state.legal_actions:
        return RAISE
    if category >= 1:
        return CHECK if state.to_call == 0 else CALL
    return CHECK if state.to_call == 0 else FOLD


def river_bluffer(state: GameState) -> str:
    """Plays straightforwardly, but bluffs every river with unimproved high card."""
    if state.street == "preflop":
        return tight_aggressive(state)

    category = evaluate(state.hole_cards + state.community_cards)[0]
    if state.street == "river" and category == 0:
        # Treat every river with no pair as a bluff opportunity, including a
        # re-raise when facing action. If capped, give up rather than bluff-catch.
        if RAISE in state.legal_actions:
            return RAISE
        return CHECK if state.to_call == 0 else FOLD
    return _ordinary_postflop(state, category)


def over_folder(state: GameState) -> str:
    """Continues under pressure only with trips or better; bluff it off weaker hands."""
    if state.street == "preflop":
        r1, r2 = sorted((card.rank for card in state.hole_cards), reverse=True)
        premium = (r1 == r2 and r1 >= 10) or (r1 == 14 and r2 >= 13)
        if not premium:
            return CHECK if state.to_call == 0 else FOLD
        if state.to_call == 0:
            return CHECK
        return RAISE if RAISE in state.legal_actions else CALL

    category = evaluate(state.hole_cards + state.community_cards)[0]
    if state.to_call > 0:
        return CALL if category >= 3 else FOLD
    if category >= 2 and RAISE in state.legal_actions:
        return RAISE
    return CHECK


def trapper(state: GameState) -> str:
    """Slow-plays strong hands, then springs a raise with trips+ after a bet."""
    if state.street == "preflop":
        r1, r2 = sorted((card.rank for card in state.hole_cards), reverse=True)
        pair = r1 == r2
        playable = pair or (r1 >= 12 and r2 >= 10)
        if not playable:
            return CHECK if state.to_call == 0 else FOLD
        # Never open-raise preflop: keep a strong range hidden.
        return CHECK if state.to_call == 0 else CALL

    category = evaluate(state.hole_cards + state.community_cards)[0]
    if category >= 3 and state.to_call > 0 and RAISE in state.legal_actions:
        return RAISE
    if category >= 1:
        return CHECK if state.to_call == 0 else CALL
    return CHECK if state.to_call == 0 else FOLD
