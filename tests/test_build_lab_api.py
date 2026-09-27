import json

import pytest

from poker.game_api import POLICY_MATCH_MAX_HANDS, run_policy_match
from poker.strategy import caller_strategy, folder_strategy, value_strategy


SEED = 37


def test_two_builder_policies_run_as_named_seats_with_curated_replays():
    result = run_policy_match(
        caller_strategy(), folder_strategy(), hands=40, seed=SEED, capture=4,
    )

    assert result["error"] is None
    assert result["players"] == ["Bot A", "Bot B"]
    assert result["player_index"] == 0
    assert result["opponent_index"] == 1
    assert result["hands"] == 40
    assert result["seed"] == SEED
    assert [row["name"] for row in result["summary"]] == ["Bot A", "Bot B"]
    assert [row["hands"] for row in result["summary"]] == [40, 40]
    assert result["summary"][0]["vpip"] > result["summary"][1]["vpip"]
    assert len(result["timeline"]) == 40
    assert result["timeline"][-1] == result["player_net"]
    assert len(result["replays"]) <= 4
    assert all(replay["events"] for replay in result["replays"])
    json.dumps(result)


def test_same_policy_pair_and_seed_reproduce_summary_timeline_and_replays():
    first = run_policy_match(value_strategy(), caller_strategy(), hands=60, seed=SEED, capture=4)
    second = run_policy_match(value_strategy(), caller_strategy(), hands=60, seed=SEED, capture=4)

    assert first == second


def test_policy_match_accepts_valid_future_game_config_without_exposing_bot_code():
    result = run_policy_match(
        caller_strategy(), folder_strategy(), hands=8, seed=3, capture=0,
        config={"betting": "no_limit", "stack": 40},
    )
    assert result["error"] is None
    assert result["hands"] == 8
    assert result["replays"] == []

    non_policy = run_policy_match(lambda state: "fold", folder_strategy(), hands=8)
    assert non_policy["error"] == "Both bot strategies must be policy objects."


@pytest.mark.parametrize("hands", [0, -1, True, 1.5, POLICY_MATCH_MAX_HANDS + 1])
def test_policy_match_rejects_invalid_or_oversized_hand_counts(hands):
    result = run_policy_match(caller_strategy(), folder_strategy(), hands=hands)
    assert "Hands must be" in result["error"]


def test_policy_match_rejects_invalid_seed_capture_and_config():
    policy = caller_strategy()
    assert "Seed must" in run_policy_match(policy, policy, hands=1, seed=True)["error"]
    assert "Replay capture must" in run_policy_match(policy, policy, hands=1, capture=9)["error"]
    assert "Unsupported match config field" in run_policy_match(
        policy, policy, hands=1, config={"execute": "anything"},
    )["error"]
    assert "Betting must" in run_policy_match(
        policy, policy, hands=1, config={"betting": "custom"},
    )["error"]
    assert "small_blind cannot exceed" in run_policy_match(
        policy, policy, hands=1, config={"small_blind": 3, "big_blind": 2},
    )["error"]
    assert "Match config must be an object" in run_policy_match(
        policy, policy, hands=1, config=["limit"],
    )["error"]
    assert "small_bet must be a positive whole number" in run_policy_match(
        policy, policy, hands=1, config={"small_bet": None},
    )["error"]
