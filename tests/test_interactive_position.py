"""Tests for InteractiveMatch's fixed_button option (Academy position drills)."""

from poker.bots import caller
from poker.interactive import InteractiveMatch


def _play_hands(match: InteractiveMatch, n: int) -> list:
    """Play n hands with a naive check/call human; return the button per hand."""
    buttons = []
    for _ in range(n):
        payload = match.start_hand()
        blinds = [e for e in payload["events"] if e["type"] == "blinds"]
        buttons.append(blinds[0]["button"])
        while payload["done"] is None:
            legal = payload["pending"]["legal"]
            payload = match.act("check" if "check" in legal else "call")
    return buttons


def test_button_rotates_by_default():
    m = InteractiveMatch(caller, seed=7)
    assert _play_hands(m, 4) == [0, 1, 0, 1]


def test_fixed_button_human_in_position():
    m = InteractiveMatch(caller, seed=7, fixed_button=0)
    assert _play_hands(m, 4) == [0, 0, 0, 0]


def test_fixed_button_human_out_of_position():
    m = InteractiveMatch(caller, seed=7, fixed_button=1)
    assert _play_hands(m, 4) == [1, 1, 1, 1]
