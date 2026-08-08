"""Tests for the game-mode plumbing: multiway interactive play, survival carry,
and the game_api payloads the worker serves."""

from poker.bots import caller, maniac
from poker.engine import GameConfig
from poker.game_api import human_act, human_deal, human_new, run_level, run_session
from poker.interactive import InteractiveMatch
from poker.strategy import all_hand_classes


def _play_out(match, payload, pick="call"):
    """Drive one hand to completion with a naive human."""
    while payload["done"] is None:
        legal = payload["pending"]["legal"]
        action = "check" if "check" in legal else (pick if pick in legal else legal[0])
        payload = match.act(action) if match else human_act(action)
    return payload


def test_interactive_multiway_six_max():
    m = InteractiveMatch([caller] * 5, config=GameConfig(), seed=3)
    assert m.n == 6
    buttons = []
    for _ in range(6):
        payload = m.start_hand()
        assert payload["players"] == 6
        # Only the human's hole cards are streamed live.
        hole_events = [e for e in payload["events"] if e["type"] == "hole"]
        assert all(e["seat"] == 0 for e in hole_events)
        buttons.append(payload["button"])
        payload = _play_out(m, payload)
        assert payload["done"] is not None
    assert buttons == [0, 1, 2, 3, 4, 5]  # rotates around the full table


def test_interactive_stacked_payload_exposes_stacks():
    m = InteractiveMatch([caller], config=GameConfig(betting="no_limit"),
                         seed=5, stack=200)
    payload = m.start_hand()
    assert payload["stacks"] is not None and len(payload["stacks"]) == 2
    p = payload["pending"]
    assert p["betting"] == "no_limit"
    assert p["myStack"] is not None
    assert p["maxRaiseTo"] >= p["minRaiseTo"] > 0


def test_interactive_survival_busts_and_stops():
    m = InteractiveMatch([maniac], config=GameConfig(betting="no_limit"),
                         seed=7, stack=8, carry=True)
    hands = 0
    while not m.busted and hands < 50:
        payload = m.start_hand()
        payload = _play_out(m, payload, pick="fold")
        hands += 1
    assert m.busted
    assert m.player_stack <= 0
    final = m.start_hand()          # after busting: no new hand is dealt
    assert final["busted"] is True
    assert final["pending"] is None
    assert final["handsPlayed"] == hands


def _strategy():
    street = {"rules": [], "default": "call"}
    return {"preflop": {c: "call" for c in all_hand_classes()},
            "flop": street, "turn": street, "river": street}


def test_run_level_accepts_opponent_list():
    res = run_level(opponent=["caller", "caller", "rock"], strategy=_strategy(),
                    hands=60, seed=1, capture=2)
    assert res["error"] is None
    assert len(res["players"]) == 4
    assert res["players"][0] == "You"
    assert res["summary"][2]["name"] == "caller 2"  # duplicates get numbered
    assert len(res["timeline"]) == 60


def test_run_session_payload():
    res = run_session(opponent="maniac", strategy=_strategy(), stack=20,
                      max_hands=400, seed=9, capture=4,
                      config={"betting": "no_limit"})
    assert res["error"] is None
    assert res["start_stack"] == 20
    assert res["hands_survived"] == len(res["timeline"])
    if res["busted"]:
        assert res["final_stack"] == 0
        assert res["timeline"][-1] <= 0
    assert all(v >= -20 for v in res["timeline"])


def test_human_new_multiway_and_modes():
    payload = human_new(["caller", "rock", "maniac"], seed=2,
                        config={"betting": "no_limit"}, stack=100)
    assert payload.get("error") is None
    assert payload["players"] == 4
    payload = _play_out(None, payload)
    assert payload["done"] is not None
    payload = human_deal()
    assert payload["players"] == 4

    bad = human_new(["caller", "nope"], seed=2)
    assert bad["error"]
