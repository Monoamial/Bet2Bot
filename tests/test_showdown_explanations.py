"""Score-based showdown explanations and side-pot eligibility in recorded events."""

import random

import poker.engine as engine
from poker.cards import Card, RANKS, SUITS
from poker.engine import GameConfig, play_hand_gen
from poker.evaluator import describe_score, evaluate


class _FixedDeck:
    def __init__(self, cards):
        self.cards = list(cards)

    def shuffle(self):
        pass

    def deal(self, n=1):
        dealt = self.cards[:n]
        self.cards = self.cards[n:]
        return dealt


def _fixed_deck(monkeypatch, prefix):
    ordered = [Card.from_str(code) for code in prefix]
    used = set(ordered)
    full_deck = ordered + [
        Card(rank, suit)
        for suit in SUITS
        for rank in RANKS
        if Card(rank, suit) not in used
    ]
    monkeypatch.setattr(engine, "Deck", lambda _rng: _FixedDeck(full_deck))


def _play_hand(monkeypatch, prefix, n, button, config, stacks=None, scripts=None):
    _fixed_deck(monkeypatch, prefix)
    gen = play_hand_gen(
        n, button, config, random.Random(0), record_events=True, stacks=stacks,
    )
    try:
        state = next(gen)
        while True:
            if scripts is None:
                action = "check" if "check" in state.legal_actions else "call"
            else:
                action = scripts[state.my_seat].pop(0)
            state = gen.send((action, None))
    except StopIteration as stopped:
        return stopped.value


def test_pair_kicker_explanation_uses_the_evaluator_score(monkeypatch):
    # Both seats pair the ace on the board; the queen kicker beats the jack.
    result = _play_hand(
        monkeypatch,
        ["Ah", "Qd", "Ac", "Jd", "As", "Kd", "7h", "4c", "2s"],
        n=2, button=0, config=GameConfig(),
    )
    showdown = next(event for event in result.events if event["type"] == "showdown")
    award = next(event for event in result.events if event["type"] == "award")

    assert showdown["hand_details"] == {
        0: "One Pair — pair of Aces; K-Q-7 kickers",
        1: "One Pair — pair of Aces; K-J-7 kickers",
    }
    assert award["pots"][0]["eligible"] == [0, 1]
    assert award["pots"][0]["winners"] == [0]
    assert result.winners == [0]


def test_score_explanation_handles_wheel_and_full_house_order():
    wheel = evaluate([Card.from_str(code) for code in ["As", "2h", "3d", "4c", "5s", "Kh", "Qd"]])
    full_house = evaluate([Card.from_str(code) for code in ["Kh", "Kd", "Kc", "Qs", "Qd", "As", "2h"]])

    assert wheel == (4, 5)
    assert describe_score(wheel) == "Straight — Five-high straight (wheel)"
    assert full_house == (6, 13, 12)
    assert describe_score(full_house) == "Full House — Kings full of Queens"


def test_board_play_tie_is_reported_as_a_split(monkeypatch):
    # The board is a king-high straight flush; neither player's hole cards improve it.
    result = _play_hand(
        monkeypatch,
        ["2c", "3d", "4c", "5d", "9h", "Th", "Jh", "Qh", "Kh"],
        n=2, button=0, config=GameConfig(),
    )
    showdown = next(event for event in result.events if event["type"] == "showdown")
    award = next(event for event in result.events if event["type"] == "award")

    assert showdown["hand_details"] == {
        0: "Straight Flush — King-high straight flush",
        1: "Straight Flush — King-high straight flush",
    }
    assert showdown["best_five"] == {
        0: ["9h", "Th", "Jh", "Qh", "Kh"],
        1: ["9h", "Th", "Jh", "Qh", "Kh"],
    }
    assert award["pots"] == [{"amount": 4, "winners": [0, 1], "eligible": [0, 1]}]
    assert set(result.winners) == {0, 1}


def test_side_pot_awards_record_eligibility_and_layer_winners(monkeypatch):
    # The shortest stack wins the main pot; middle stack wins the side pot;
    # the deepest stack's unmatched excess is a single-eligible layer.
    result = _play_hand(
        monkeypatch,
        ["Ah", "Ac", "Kh", "Ks", "Qh", "Qc", "2s", "5d", "7h", "9c", "Jd"],
        n=3, button=0, config=GameConfig(betting="no_limit"), stacks=[10, 20, 40],
        scripts={0: ["raise:10"], 1: ["raise:20"], 2: ["raise:40"]},
    )
    award = next(event for event in result.events if event["type"] == "award")

    assert award["pots"] == [
        {"amount": 30, "winners": [0], "eligible": [0, 1, 2]},
        {"amount": 20, "winners": [1], "eligible": [1, 2]},
        {"amount": 20, "winners": [2], "eligible": [2]},
    ]
    assert set(award["winners"]) == {0, 1, 2}
    assert result.net == [20, 0, -20]
    assert sum(pot["amount"] for pot in award["pots"]) == award["pot"]
