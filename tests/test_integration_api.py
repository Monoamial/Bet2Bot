"""Contract tests for the versioned JSON boundary used by Godot."""

import json

from poker.integration_api import POLICY_SCHEMA_VERSION, PROTOCOL, describe, handle_json
from poker.strategy import all_hand_classes


def starter_policy():
    street = {
        "rules": [
            {"when": {"handTier": "monster", "facingBet": False}, "action": "raise"},
            {"when": {"handTier": "twoPairPlus", "facingBet": False}, "action": "raise"},
            {"when": {"handTier": "pair", "facingBet": False}, "action": "raise"},
            {"when": {"handTier": "nothing", "facingBet": True}, "action": "fold"},
        ],
        "default": "call",
    }
    return {
        "schemaVersion": POLICY_SCHEMA_VERSION,
        "preflop": {hand: "call" for hand in all_hand_classes()},
        "flop": street,
        "turn": street,
        "river": street,
    }


def call(type_, payload=None, request_id="test-1"):
    return json.loads(handle_json(json.dumps({
        "protocol": PROTOCOL,
        "id": request_id,
        "type": type_,
        "payload": payload or {},
    })))


def test_describe_has_stable_contract_metadata():
    result = describe()
    assert result["ok"]
    assert result["protocol"] == PROTOCOL
    assert result["result"]["policySchemaVersion"] == POLICY_SCHEMA_VERSION
    assert "caller" in result["result"]["opponents"]
    assert result["result"]["actions"] == ["fold", "check", "call", "raise"]


def test_match_is_deterministic_and_echoes_id():
    payload = {
        "strategy": starter_policy(),
        "opponents": ["caller"],
        "hands": 100,
        "seed": 314159,
        "capture": 2,
        "config": {"betting": "limit"},
    }
    one = call("run_match", payload, "match-7")
    two = call("run_match", payload, "match-7")
    assert one == two
    assert one["ok"] is True
    assert one["id"] == "match-7"
    result = one["result"]
    assert result["hands"] == 100
    assert result["players"] == ["You", "caller"]
    assert len(result["timeline"]) == 100
    assert len(result["summary"]) == 2
    assert len(result["replays"]) <= 2


def test_invalid_strategy_returns_field_error_without_traceback():
    response = call("run_match", {"strategy": {"schemaVersion": 1}, "opponents": ["caller"]})
    assert response["ok"] is False
    assert response["error"]["code"] == "INVALID_POLICY"
    assert response["error"]["field"] == "strategy.preflop"
    assert "Traceback" not in json.dumps(response)


def test_bad_json_and_unknown_protocol_are_structured():
    bad_json = json.loads(handle_json("not json"))
    assert bad_json["error"]["code"] == "INVALID_JSON"

    bad_protocol = json.loads(handle_json(json.dumps({"protocol": "future/v9", "type": "describe"})))
    assert bad_protocol["error"]["code"] == "UNSUPPORTED_PROTOCOL"


def test_bounds_protect_host():
    policy = starter_policy()
    response = call("run_match", {"strategy": policy, "opponents": ["caller"], "hands": 999999})
    assert response["error"]["code"] == "INVALID_REQUEST"
    assert response["error"]["field"] == "payload.hands"


def test_unknown_opponent_is_rejected_before_engine():
    response = call("run_match", {"strategy": starter_policy(), "opponents": ["cheater"]})
    assert response["error"]["code"] == "UNKNOWN_OPPONENT"
