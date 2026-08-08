"""Tests for the multi-output results: curated replays, timeline, and summary stats.

These cover the C1/C2/C3 buildout: run_match(curate=...) keeps the seat-0 player's
biggest wins/losses, BotStats tracks win rate / biggest swings, and run_level surfaces
the bankroll timeline the winnings graph animates.
"""

import json

from poker.bots import caller, maniac
from poker.engine import GameConfig
from poker.game_api import run_level
from poker.match import run_match
from poker.strategy import all_hand_classes

SEED = 42
HANDS = 300


def _match(curate=0, capture_events=0, seed=SEED, hands=HANDS):
    return run_match(
        {"A": maniac, "B": caller},
        hands=hands,
        config=GameConfig(),
        seed=seed,
        capture_events=capture_events,
        curate=curate,
    )


def _hand_nets(stats):
    """Per-hand net for seat 0, recovered from the cumulative bankroll."""
    roll = stats.seats[0].bankroll
    return [roll[0]] + [roll[i] - roll[i - 1] for i in range(1, len(roll))]


def test_reproducible_with_seed():
    a, b = _match(), _match()
    assert a.seats[0].net == b.seats[0].net
    assert a.seats[0].bankroll == b.seats[0].bankroll


def test_curation_picks_biggest_wins_and_losses():
    k = 3
    stats = _match(curate=k)
    nets = _hand_nets(stats)

    wins = [c for c in stats.curated if c["kind"] == "win"]
    losses = [c for c in stats.curated if c["kind"] == "loss"]
    assert stats.curated == wins + losses  # wins first, then losses

    # Exactly the top-k positive / bottom-k negative hands, biggest first.
    expected_wins = sorted((n for n in nets if n > 0), reverse=True)[:k]
    expected_losses = sorted(n for n in nets if n < 0)[:k]
    assert [c["net"] for c in wins] == expected_wins
    assert [c["net"] for c in losses] == expected_losses

    # Each curated entry's metadata is consistent with the recorded hand.
    for c in stats.curated:
        assert nets[c["hand"]] == c["net"]
        award = [e for e in c["events"] if e["type"] == "award"]
        assert award and award[-1]["net"][0] == c["net"]


def test_curation_does_not_change_play():
    plain, curated = _match(), _match(curate=3)
    assert plain.seats[0].bankroll == curated.seats[0].bankroll


def test_capture_events_still_records_first_hands():
    stats = _match(capture_events=2)
    assert len(stats.replays) == 2
    assert all(ev[0]["type"] == "blinds" for ev in stats.replays)


def test_botstats_extremes_and_win_rate():
    stats = _match()
    nets = _hand_nets(stats)
    bs = stats.seats[0]
    assert bs.biggest_win == max(nets)
    assert bs.biggest_loss == min(nets)
    assert bs.hands_won == sum(1 for n in nets if n > 0)
    assert 0.0 <= bs.win_pct <= 100.0
    assert 0.0 <= bs.showdown_pct <= 100.0


def _call_everything_strategy():
    street = {"rules": [], "default": "call"}
    return {
        "preflop": {cls: "call" for cls in all_hand_classes()},
        "flop": street, "turn": street, "river": street,
    }


def test_run_level_payload():
    res = run_level(opponent="caller", strategy=_call_everything_strategy(),
                    hands=200, seed=SEED, capture=6)
    assert res["error"] is None
    json.dumps(res)  # everything must be JSON-able for the Pyodide bridge

    # Timeline: one cumulative point per hand, ending at the player's net.
    assert len(res["timeline"]) == 200
    assert res["timeline"][-1] == res["player_net"]
    assert res["big_blind"] == GameConfig().big_blind

    # Replays are curated: at most 3 wins + 3 losses, labeled and ordered.
    assert len(res["replays"]) <= 6
    kinds = [r["kind"] for r in res["replays"]]
    assert kinds == sorted(kinds, key=lambda k: 0 if k == "win" else 1)
    for r in res["replays"]:
        assert set(r) >= {"kind", "hand", "net", "events"}

    # Summary rows carry the richer metrics.
    for row in res["summary"]:
        for key in ("win_pct", "showdown_pct", "biggest_win", "biggest_loss"):
            assert key in row


def test_run_level_unknown_opponent():
    res = run_level(opponent="nope", strategy=_call_everything_strategy(), hands=10)
    assert res["error"]
