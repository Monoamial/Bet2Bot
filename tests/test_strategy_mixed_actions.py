"""Coverage for bounded, seeded mixed-frequency strategy rules."""

import random

from poker.action import CALL, CHECK, FOLD, RAISE
from poker.bots import caller
from poker.cards import Card
from poker.engine import GameConfig, play_hand
from poker.match import run_match, run_session
from poker.state import GameState
from poker.strategy import StrategyBot, all_hand_classes


def _strategy(rule=None):
    return {
        "preflop": {hand: CALL for hand in all_hand_classes()},
        "flop": {"rules": [rule] if rule is not None else [], "default": CHECK},
        "turn": {"rules": [], "default": CHECK},
        "river": {"rules": [], "default": CHECK},
    }


def _mixed_rule(action=RAISE, alternate=CHECK, frequency=30, raise_size=None):
    mix = {"action": alternate, "frequency": frequency}
    if raise_size is not None:
        mix["raiseSize"] = raise_size
    return {"when": {"handTier": "nothing"}, "action": action, "mix": mix}


def _flop_state(*, betting="limit", to_call=0, pot=13, my_street_contrib=0):
    legal = [CHECK, RAISE] if to_call == 0 else [FOLD, CALL, RAISE]
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
        legal_actions=legal,
        betting=betting,
        current_bet=my_street_contrib + to_call,
        my_street_contrib=my_street_contrib,
        my_stack=100,
        stacks=[100, 100],
        min_raise_to=2,
        max_raise_to=100,
    )


def _mixed_match_policy():
    policy = _strategy()
    for street in ("flop", "turn", "river"):
        policy[street] = {
            "rules": [{"when": {}, "action": CHECK,
                       "mix": {"action": RAISE, "frequency": 50}}],
            "default": CHECK,
        }
    return policy


def _holes(stats):
    return [
        [(event["seat"], tuple(event["cards"]))
         for event in replay if event.get("type") == "hole"]
        for replay in stats.replays
    ]


def test_mixed_choice_is_seeded_and_replay_reason_names_chosen_frequency():
    rule = _mixed_rule(action=RAISE, alternate=CHECK, frequency=30)

    mixed = StrategyBot(_strategy(rule), seed=1)
    assert mixed.act(_flop_state()) == CHECK
    assert mixed.last_decision == (
        "Nothing → check (mix: raise 70% / check 30%; chose check 30%)"
    )

    primary = StrategyBot(_strategy(rule), seed=0)
    assert primary.act(_flop_state()) == RAISE
    assert "chose raise 70%" in primary.last_decision

    def choices(seed):
        bot = StrategyBot(_strategy(rule), seed=seed)
        return [bot.act(_flop_state()) for _ in range(40)]

    assert choices(1234) == choices(1234)
    assert choices(1234) != choices(1235)


def test_mixed_raise_uses_its_own_no_limit_size():
    rule = _mixed_rule(action=CHECK, alternate=RAISE, frequency=30, raise_size="small")
    bot = StrategyBot(_strategy(rule), seed=1)

    assert bot.act(_flop_state(betting="no_limit")) == "raise:7"
    assert "Nothing → raise (½ pot)" in bot.last_decision
    assert "chose raise 30%" in bot.last_decision


def test_invalid_mixes_fall_back_to_the_legacy_action_without_mixing():
    for mix in (
        {"action": RAISE, "frequency": 30},
        {"action": CHECK, "frequency": 0},
        {"action": CHECK, "frequency": 100},
        {"action": "all_in", "frequency": 30},
        {"action": CHECK, "frequency": True},
    ):
        rule = {"when": {"handTier": "nothing"}, "action": RAISE, "mix": mix}
        bot = StrategyBot(_strategy(rule), seed=1)
        assert bot.act(_flop_state()) == RAISE
        assert bot.last_decision == "Nothing → raise"


def test_hand_replay_explain_contains_the_selected_action_and_percentage():
    rule = {"when": {}, "action": CHECK,
            "mix": {"action": RAISE, "frequency": 30}}
    bot = StrategyBot(_strategy(rule), seed=1)
    result = play_hand(
        [bot, caller], button=1, config=GameConfig(), rng=random.Random(9),
        record_events=True,
    )

    first_postflop = next(
        event for event in result.events
        if event.get("type") == "action" and event.get("seat") == 0
        and event.get("street") == "flop"
    )
    assert first_postflop["action"] == RAISE
    assert "chose raise 30%" in first_postflop["explain"]


def test_match_and_session_seed_mixed_actions_and_keep_deck_rng_independent():
    baseline = run_match(
        {"You": StrategyBot(_strategy()), "Caller": caller},
        hands=8, seed=314, capture_events=8,
    )
    mixed_first = run_match(
        {"You": StrategyBot(_mixed_match_policy()), "Caller": caller},
        hands=8, seed=314, capture_events=8,
    )
    mixed_repeat = run_match(
        {"You": StrategyBot(_mixed_match_policy()), "Caller": caller},
        hands=8, seed=314, capture_events=8,
    )

    assert _holes(baseline) == _holes(mixed_first)
    assert mixed_first.replays == mixed_repeat.replays
    assert any(
        "mix:" in (event.get("explain") or "")
        for replay in mixed_first.replays for event in replay
    )

    first_session = run_session(
        {"You": StrategyBot(_mixed_match_policy()), "Caller": caller},
        stack=100, max_hands=8, seed=2718, curate=2,
    )
    repeated_session = run_session(
        {"You": StrategyBot(_mixed_match_policy()), "Caller": caller},
        stack=100, max_hands=8, seed=2718, curate=2,
    )
    assert first_session.session_stack == repeated_session.session_stack
    assert first_session.curated == repeated_session.curated


def test_strategy_bots_in_a_match_get_distinct_stable_seat_seeds():
    class SeedProbe:
        def __init__(self):
            self.seed = None

        def seed_decisions(self, seed):
            self.seed = seed

        def act(self, state):
            return CHECK

    first, second = SeedProbe(), SeedProbe()
    run_match({"first": first, "second": second}, hands=0, seed=987)
    seeds = (first.seed, second.seed)
    assert seeds[0] is not None
    assert seeds[1] is not None
    assert seeds[0] != seeds[1]

    replay = (SeedProbe(), SeedProbe())
    run_match({"first": replay[0], "second": replay[1]}, hands=0, seed=987)
    assert (replay[0].seed, replay[1].seed) == seeds


def test_non_mixed_strategy_matches_the_legacy_seeded_hand_driver():
    seed = 808
    hands = 6
    match = run_match(
        {"You": StrategyBot(_strategy()), "Caller": caller},
        hands=hands, seed=seed, capture_events=hands,
    )

    rng = random.Random(seed)
    seats = [StrategyBot(_strategy()), caller]
    legacy_events = [
        play_hand(seats, button=hand % len(seats), config=GameConfig(), rng=rng,
                  record_events=True).events
        for hand in range(hands)
    ]
    assert match.replays == legacy_events
