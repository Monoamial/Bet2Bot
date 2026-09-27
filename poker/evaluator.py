"""Poker hand evaluation.

`evaluate(cards)` takes 5, 6, or 7 cards and returns a comparable score tuple for
the best 5-card hand. Larger tuples are stronger, so two scores can be compared with
ordinary Python comparison operators (>, ==, <).

The score is (category, tiebreakers...) where category is an int 0..8:
    8 straight flush   5 flush
    7 four of a kind   4 straight
    6 full house       3 three of a kind
    2 two pair         1 one pair          0 high card

Implementation favours clarity over speed: it checks all 5-card combinations of the
given cards. That is plenty fast for thousands of hands and easy for students to read.
"""

from collections import Counter
from itertools import combinations
from typing import List, Tuple

from poker.cards import Card

# Human-readable category names, indexed by the category int.
CATEGORY_NAMES = [
    "High Card",        # 0
    "One Pair",         # 1
    "Two Pair",         # 2
    "Three of a Kind",  # 3
    "Straight",         # 4
    "Flush",            # 5
    "Full House",       # 6
    "Four of a Kind",   # 7
    "Straight Flush",   # 8
]

Score = Tuple[int, ...]


def _straight_high(ranks: set) -> int:
    """Return the high card of a straight made from `ranks`, or 0 if none.

    Handles the wheel (A-2-3-4-5), where the ace plays low and the high card is 5.
    """
    if len(ranks) < 5:
        return 0
    # Ace can be low: add a "1" so 14,5,4,3,2 becomes a run ending at 5.
    extended = set(ranks)
    if 14 in extended:
        extended.add(1)
    high = 0
    for low in extended:
        run = {low + i for i in range(5)}
        if run <= extended:
            high = max(high, low + 4)
    return high


def _score_5(cards: List[Card]) -> Score:
    """Score exactly 5 cards into a comparable tuple."""
    ranks = sorted((c.rank for c in cards), reverse=True)
    rank_counts = Counter(ranks)
    is_flush = len({c.suit for c in cards}) == 1
    straight_high = _straight_high(set(ranks))

    # Order ranks by (count, rank) so pairs/trips lead the tiebreakers.
    by_count = sorted(rank_counts.items(), key=lambda rc: (rc[1], rc[0]), reverse=True)
    counts = [c for _, c in by_count]
    ordered_ranks = [r for r, _ in by_count]

    if straight_high and is_flush:
        return (8, straight_high)
    if counts[0] == 4:
        return (7, ordered_ranks[0], ordered_ranks[1])
    if counts[0] == 3 and counts[1] == 2:
        return (6, ordered_ranks[0], ordered_ranks[1])
    if is_flush:
        return (5, *ranks)
    if straight_high:
        return (4, straight_high)
    if counts[0] == 3:
        return (3, ordered_ranks[0], *ordered_ranks[1:])
    if counts[0] == 2 and counts[1] == 2:
        return (2, ordered_ranks[0], ordered_ranks[1], ordered_ranks[2])
    if counts[0] == 2:
        return (1, ordered_ranks[0], *ordered_ranks[1:])
    return (0, *ranks)


def evaluate(cards: List[Card]) -> Score:
    """Return the best 5-card score from 5-7 cards."""
    if len(cards) < 5:
        raise ValueError("need at least 5 cards to evaluate")
    if len(cards) == 5:
        return _score_5(cards)
    return max(_score_5(list(combo)) for combo in combinations(cards, 5))


def best_five(cards: List[Card]) -> List[Card]:
    """The five cards that play, in dealt order (one deterministic choice on ties)."""
    if len(cards) < 5:
        raise ValueError("need at least 5 cards to evaluate")
    return list(max(combinations(cards, 5), key=lambda combo: _score_5(list(combo))))


def category_name(score: Score) -> str:
    """Human-readable name for a score's hand category (for logging)."""
    return CATEGORY_NAMES[score[0]]


_RANK_NAMES = {
    14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "Ten",
    9: "Nine", 8: "Eight", 7: "Seven", 6: "Six", 5: "Five",
    4: "Four", 3: "Three", 2: "Two",
}
_RANK_SYMBOLS = {
    14: "A", 13: "K", 12: "Q", 11: "J", 10: "T", 9: "9",
    8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2",
}


def _rank_name(rank: int) -> str:
    return _RANK_NAMES[rank]


def _rank_symbols(ranks: Tuple[int, ...]) -> str:
    return "-".join(_RANK_SYMBOLS[rank] for rank in ranks)


def describe_score(score: Score) -> str:
    """Explain a hand from its actual evaluator score, including every tiebreaker.

    The score tuple is also what decides hand order in ``evaluate``. Keeping this
    explanation score-based handles category-specific ordering (notably full houses
    and wheels) without trying to infer strength from the category label alone.
    """
    category, *ranks = score
    name = category_name(score)

    if category == 0:
        high, *kickers = ranks
        return f"{name} — {_rank_name(high)} high; {_rank_symbols(tuple(kickers))} kickers"
    if category == 1:
        pair, *kickers = ranks
        return f"{name} — pair of {_rank_name(pair)}s; {_rank_symbols(tuple(kickers))} kickers"
    if category == 2:
        high_pair, low_pair, kicker = ranks
        return (
            f"{name} — {_rank_name(high_pair)}s and {_rank_name(low_pair)}s; "
            f"{_rank_name(kicker)} kicker"
        )
    if category == 3:
        trips, *kickers = ranks
        return f"{name} — three {_rank_name(trips)}s; {_rank_symbols(tuple(kickers))} kickers"
    if category == 4:
        high = ranks[0]
        wheel = " (wheel)" if high == 5 else ""
        return f"{name} — {_rank_name(high)}-high straight{wheel}"
    if category == 5:
        return f"{name} — {_rank_symbols(tuple(ranks))}"
    if category == 6:
        trips, pair = ranks
        return f"{name} — {_rank_name(trips)}s full of {_rank_name(pair)}s"
    if category == 7:
        quads, kicker = ranks
        return f"{name} — four {_rank_name(quads)}s; {_rank_name(kicker)} kicker"
    if category == 8:
        high = ranks[0]
        wheel = " (wheel)" if high == 5 else ""
        return f"{name} — {_rank_name(high)}-high straight flush{wheel}"
    raise ValueError(f"invalid hand category: {category}")
