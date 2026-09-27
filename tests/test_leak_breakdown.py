"""Entire-hand net grouped by finishing street and own hand tier conserves chips."""
from poker.bots import caller, maniac
from poker.engine import GameConfig
from poker.game_api import run_level, run_session
from poker.match import run_match
from poker.strategy import caller_strategy, value_strategy


def _assert_conserved(stats):
    for bot in stats.seats:
        for breakdown in (bot.by_end_street, bot.by_final_tier):
            assert sum(b["hands"] for b in breakdown.values()) == bot.hands
            assert sum(b["net"] for b in breakdown.values()) == bot.net


def test_breakdown_conserves_hands_and_net_without_replay_capture():
    for cfg in (GameConfig(), GameConfig(betting="no_limit", stack=80),
                GameConfig(betting="pot_limit", stack=80)):
        stats = run_match({"player": caller, "rival": maniac}, hands=80,
                          config=cfg, seed=12, curate=0, capture_events=0)
        assert not stats.replays
        _assert_conserved(stats)
        assert set(stats.seats[0].by_end_street) <= {"preflop", "flop", "turn", "river"}


def test_level_payload_breakdowns_are_reproducible_and_net_conserving():
    left = run_level("caller", value_strategy(), hands=100, seed=15, capture=0)
    right = run_level("caller", value_strategy(), hands=100, seed=15, capture=0)
    player = left["summary"][left["player_index"]]
    assert player["by_end_street"] == right["summary"][right["player_index"]]["by_end_street"]
    assert player["by_final_tier"] == right["summary"][right["player_index"]]["by_final_tier"]
    assert sum(row["net"] for row in player["by_end_street"].values()) == left["player_net"]
    assert sum(row["net"] for row in player["by_final_tier"].values()) == left["player_net"]
    assert sum(row["hands"] for row in player["by_end_street"].values()) == left["hands"]


def test_survival_payload_breakdown_still_measures_full_hand_outcomes():
    result = run_session("caller", caller_strategy(), stack=50, max_hands=40,
                         seed=31, config={"betting": "no_limit"}, capture=0)
    player = result["summary"][result["player_index"]]
    assert sum(row["net"] for row in player["by_end_street"].values()) == result["final_stack"] - result["start_stack"]
    assert sum(row["hands"] for row in player["by_final_tier"].values()) == result["hands_survived"]
