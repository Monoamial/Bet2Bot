"""Focused coverage for public current-hand betting-history strategy rules."""

import random

import pytest

from poker.action import CALL, CHECK, FOLD, RAISE
from poker.bots import caller
from poker.cards import Card
from poker.engine import GameConfig, play_hand
from poker.match import run_match
from poker.state import GameState
from poker.strategy import StrategyBot, all_hand_classes


def _state(history=(), *, street="flop", my_seat=0, num_players=3, active_players=None):
    board = {
        "flop": ["2c", "3d", "4h"],
        "turn": ["2c", "3d", "4h", "5s"],
        "river": ["2c", "3d", "4h", "5s", "6c"],
    }[street]
    return GameState(
        hole_cards=[Card.from_str("As"), Card.from_str("Kd")],
        my_seat=my_seat,
        my_contribution=2,
        community_cards=[Card.from_str(card) for card in board],
        street=street,
        pot=14,
        to_call=2,
        bet_size=2,
        raises_so_far=0,
        raise_cap=4,
        button=1,
        num_players=num_players,
        active_players=active_players or list(range(num_players)),
        contributions=[2] * num_players,
        betting_history=list(history),
        legal_actions=[FOLD, CALL, RAISE],
    )


def _policy(rules):
    street = {"rules": rules, "default": CALL}
    return {
        "preflop": {hand: CALL for hand in all_hand_classes()},
        "flop": dict(street),
        "turn": dict(street),
        "river": dict(street),
    }


def _history_policy():
    return _policy([
        {"when": {"oppRaisedThisHand": True}, "action": RAISE},
        {"when": {"oppRaisedThisHand": False}, "action": FOLD},
    ])


@pytest.mark.parametrize("street", ["flop", "turn", "river"])
def test_public_opponent_raise_from_earlier_hand_history_matches_across_streets(street):
    # GameState history contains ordered actions from the whole hand, with no street
    # partition; a raise that happened before this postflop decision remains visible.
    bot = StrategyBot(_history_policy())

    assert bot.act(_state([(1, RAISE), (0, CALL)], street=street)) == RAISE


def test_own_raise_does_not_count_but_an_opponent_raise_does():
    bot = StrategyBot(_history_policy())

    assert bot.act(_state([(0, RAISE), (1, CALL)])) == FOLD
    assert bot.act(_state([(1, RAISE), (0, CALL)])) == RAISE


def test_multiway_condition_matches_a_raise_by_any_nonself_seat():
    bot = StrategyBot(_history_policy())
    state = _state(
        [(1, CALL), (0, RAISE), (2, CHECK), (3, RAISE)],
        num_players=4,
        active_players=[0, 1, 2, 3],
    )

    assert bot.act(state) == RAISE


def test_legacy_rule_without_history_key_remains_a_wildcard():
    bot = StrategyBot(_policy([{"when": {"handTier": "nothing"}, "action": RAISE}]))

    assert bot.act(_state([])) == RAISE
    assert bot.act(_state([(0, RAISE), (1, RAISE)])) == RAISE


@pytest.mark.parametrize(
    "when",
    [
        {"oppRaisedThisHand": "true"},  # wrong type does not equal the boolean context
        {"oppRaiseThisHand": True},      # unknown key does not match the public context
    ],
)
def test_invalid_history_conditions_fail_closed(when):
    bot = StrategyBot(_policy([
        {"when": when, "action": RAISE},
        {"when": {}, "action": FOLD},
    ]))

    assert bot.act(_state([(1, RAISE)])) == FOLD


def test_legacy_policy_keeps_seeded_match_and_hand_driver_parity():
    seed = 4761
    hands = 5
    policy = _policy([{"when": {"handTier": "nothing"}, "action": CHECK}])
    match = run_match(
        {"You": StrategyBot(policy), "Caller": caller},
        hands=hands,
        seed=seed,
        capture_events=hands,
    )

    rng = random.Random(seed)
    seats = [StrategyBot(policy), caller]
    legacy_events = [
        play_hand(
            seats,
            button=hand % len(seats),
            config=GameConfig(),
            rng=rng,
            record_events=True,
        ).events
        for hand in range(hands)
    ]

    assert match.replays == legacy_events
