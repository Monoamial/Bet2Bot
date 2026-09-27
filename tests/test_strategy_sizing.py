"""Focused coverage for No-Limit raise sizing in block strategies."""

import random

import pytest

from poker.action import CALL, FOLD, RAISE
from poker.bots import caller
from poker.cards import Card
from poker.engine import GameConfig, play_hand
from poker.state import GameState
from poker.strategy import StrategyBot, all_hand_classes


def _strategy(raise_size=None):
    rule = {"when": {}, "action": RAISE}
    if raise_size is not None:
        rule["raiseSize"] = raise_size
    passive = {"rules": [], "default": "check"}
    return {
        "preflop": {hand: RAISE for hand in all_hand_classes()},
        "flop": {"rules": [rule], "default": "check"},
        "turn": passive,
        "river": passive,
    }


def _flop_state(*, betting="no_limit", pot=13, to_call=4, my_street_contrib=2):
    return GameState(
        hole_cards=[Card.from_str("As"), Card.from_str("Kd")],
        my_seat=0,
        my_contribution=my_street_contrib,
        community_cards=[Card.from_str("2c"), Card.from_str("3d"), Card.from_str("4h")],
        street="flop",
        pot=pot,
        to_call=to_call,
        bet_size=2,
        raises_so_far=0,
        raise_cap=4,
        button=1,
        num_players=2,
        active_players=[0, 1],
        contributions=[my_street_contrib, pot - my_street_contrib],
        betting_history=[],
        legal_actions=[FOLD, CALL, RAISE],
        betting=betting,
        current_bet=my_street_contrib + to_call,
        my_street_contrib=my_street_contrib,
        my_stack=100,
        stacks=[100, 100],
        min_raise_to=2,
        max_raise_to=100,
    )


def _play_sized_raise(raise_size, *, betting="no_limit", stack=200, seed=23):
    return play_hand(
        [StrategyBot(_strategy(raise_size)), caller],
        button=1,
        config=GameConfig(betting=betting, stack=stack),
        rng=random.Random(seed),
        record_events=True,
    )


def _flop_raise(result):
    return next(
        event for event in result.events
        if event.get("type") == "action"
        and event.get("street") == "flop"
        and event.get("seat") == 0
        and event.get("action") == "raise"
    )


@pytest.mark.parametrize(
    ("raise_size", "expected_raise_to"),
    [("small", 15), ("pot", 23), ("overbet", 40)],
)
def test_strategy_sizing_uses_pot_after_call_and_raise_to_amounts(raise_size, expected_raise_to):
    # Pot after calling is 13 + 4; the raise-to also includes the 2 already committed
    # this street and the 4 needed to call. Small rounds half-pot up to a chip.
    action = StrategyBot(_strategy(raise_size)).act(_flop_state())
    assert action == f"raise:{expected_raise_to}"


def test_replay_reason_shows_only_an_applied_no_limit_raise_size():
    sized_bot = StrategyBot(_strategy("small"))
    assert sized_bot.act(_flop_state()) == "raise:15"
    assert sized_bot.last_decision == "Nothing → raise (½ pot)"

    legacy_bot = StrategyBot(_strategy())
    legacy_bot.act(_flop_state())
    assert legacy_bot.last_decision == "Nothing → raise"

    limit_bot = StrategyBot(_strategy("overbet"))
    assert limit_bot.act(_flop_state(betting="limit")) == RAISE
    assert limit_bot.last_decision == "Nothing → raise"


@pytest.mark.parametrize(
    ("raise_size", "expected_raise_to"),
    [("small", 6), ("pot", 12), ("overbet", 24)],
)
def test_no_limit_policy_sizes_reach_engine_as_raise_to_targets(raise_size, expected_raise_to):
    result = _play_sized_raise(raise_size)
    raise_event = _flop_raise(result)

    assert raise_event["raise_to"] == expected_raise_to
    assert raise_event["to_call"] == 0


def test_no_limit_overbet_is_clamped_to_the_all_in_raise_to():
    result = _play_sized_raise("overbet", stack=20)
    raise_event = _flop_raise(result)

    assert raise_event["raise_to"] == 14
    assert raise_event["all_in"] is True


def test_legacy_unsized_raise_keeps_seeded_no_limit_pot_default():
    first = _play_sized_raise(None)
    replay = _play_sized_raise(None)

    assert first.events == replay.events
    assert _flop_raise(first)["raise_to"] == 12


@pytest.mark.parametrize("raise_size", [None, "overbet"], ids=["legacy", "size-ignored"])
def test_default_limit_keeps_fixed_raise_size(raise_size):
    result = _play_sized_raise(raise_size, betting="limit")

    # GameConfig defaults to Limit; explicit sizing metadata does not change it.
    assert GameConfig(stack=200).betting == "limit"
    assert _flop_raise(result)["raise_to"] == 2


def test_sized_rule_keeps_bare_raise_semantics_in_limit_interpreter():
    action = StrategyBot(_strategy("overbet")).act(_flop_state(betting="limit"))
    assert action == RAISE

@pytest.mark.parametrize(
    ("size", "expected"),
    [("small", "raise:15"), ("pot", "raise:23"), ("overbet", "raise:40")],
)
def test_preflop_raise_size_is_applied_to_raised_grid_cells(size, expected):
    policy = _strategy()
    policy["preflopRaiseSize"] = size
    state = _flop_state()
    state.street = "preflop"
    state.community_cards = []
    bot = StrategyBot(policy)
    assert bot.act(state) == expected
    assert bot.last_decision.startswith("Preflop AKo → raise (")


def test_preflop_sizing_is_ignored_in_limit_and_absent_metadata_keeps_legacy():
    policy = _strategy()
    limit_state = _flop_state(betting="limit")
    limit_state.street = "preflop"
    limit_state.community_cards = []
    policy["preflopRaiseSize"] = "overbet"
    assert StrategyBot(policy).act(limit_state) == RAISE
    del policy["preflopRaiseSize"]
    limit_state.betting = "no_limit"
    assert StrategyBot(policy).act(limit_state) == RAISE
