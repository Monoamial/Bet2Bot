"""Tests for the engine-first true-elimination tournament driver."""

import random

import pytest

from poker.action import CALL, CHECK, RAISE
from poker.bots import caller, folder, maniac
from poker.engine import GameConfig, HandResult
from poker.tournament import run_tournament
import poker.tournament as tournament


NL = GameConfig(betting="no_limit")


def _blind_event(player_count, button):
    if player_count == 2:
        sb, bb = button, (button + 1) % player_count
    else:
        sb, bb = (button + 1) % player_count, (button + 2) % player_count
    return {
        "type": "blinds",
        "button": button,
        "sb_seat": sb,
        "sb": 1,
        "bb_seat": bb,
        "bb": 2,
        "players": player_count,
    }


def _fake_hand_result(stacks, final_stacks, button, winner, pots=None):
    net = [after - before for before, after in zip(stacks, final_stacks)]
    pots = pots or [{"amount": sum(stacks), "winners": [winner]}]
    events = [
        _blind_event(len(stacks), button),
        {"type": "award", "winners": [winner], "pot": sum(p["amount"] for p in pots),
         "net": net, "pots": pots},
    ]
    return HandResult(
        net=net,
        winners=[winner],
        pots=pots,
        events=events,
        final_stacks=list(final_stacks),
    )


class _SeatBot:
    def __init__(self, player_id):
        self.player_id = player_id

    def act(self, state):
        return CHECK if state.to_call == 0 else CALL


def test_eliminations_recompact_active_ring_and_rotate_button_through_heads_up(monkeypatch):
    """Busted IDs disappear next hand; button skips them and HU uses compact seats."""
    bots = {f"P{i}": _SeatBot(i) for i in range(4)}
    outcomes = [
        ([6, 0, 8, 6], 0),       # P1 busts; next button skips P1 and lands on P2.
        ([7, 0, 13], 2),         # P2 busts; the remaining ring transitions to P0/P3.
        ([10, 10], 1),           # HU: local button 1 (P3) is the small blind.
        ([20, 0], 0),            # P3 busts, P0 wins.
    ]
    calls = []

    def fake_play_hand(seats, button, config, rng=None, log=False,
                       record_events=False, stacks=None):
        index = len(calls)
        local_to_global = tuple(bot.player_id for bot in seats)
        calls.append((local_to_global, button, tuple(stacks), record_events))
        final_stacks, winner = outcomes[index]
        assert len(final_stacks) == len(stacks)
        return _fake_hand_result(stacks, final_stacks, button, winner)

    monkeypatch.setattr(tournament, "play_hand", fake_play_hand)
    result = run_tournament(
        bots, starting_stack=5, max_hands=10, config=NL, seed=17, curate=4
    )

    assert result.status == "winner"
    assert result.winner_id == 0
    assert result.winner == "P0"
    assert result.hands_played == 4
    assert result.stacks == {"P0": 20, "P1": 0, "P2": 0, "P3": 0}
    assert result.stacks_by_id == {0: 20, 1: 0, 2: 0, 3: 0}

    # Active seats are packed in stable clockwise/original-ID order. The button
    # advances after the previous button, skipping busted players; on hand 3 there
    # are exactly two active seats and the local button is seat 1 (P3).
    assert calls == [
        ((0, 1, 2, 3), 0, (5, 5, 5, 5), True),
        ((0, 2, 3), 1, (6, 8, 6), True),
        ((0, 3), 1, (7, 13), True),
        ((0, 3), 0, (10, 10), True),
    ]
    assert [hand.seat_map for hand in result.hands] == [
        (0, 1, 2, 3), (0, 2, 3), (0, 3), (0, 3)
    ]
    assert [hand.button_id for hand in result.hands] == [0, 2, 3, 0]
    assert [hand.local_button for hand in result.hands] == [0, 1, 1, 0]
    assert all(sum(hand.stacks) == 20 and sum(hand.net) == 0 for hand in result.hands)

    assert [(e.player_id, e.hand, e.place) for e in result.elimination_order] == [
        (1, 1, 4), (2, 2, 3), (3, 4, 2)
    ]
    assert len(result.replays) == 4
    replay_by_hand = {replay["hand"]: replay for replay in result.replays}
    assert replay_by_hand[2]["seat_map"] == [
        {"local_seat": 0, "player_id": 0, "name": "P0"},
        {"local_seat": 1, "player_id": 2, "name": "P2"},
        {"local_seat": 2, "player_id": 3, "name": "P3"},
    ]
    # Engine replay event seats stay local; the explicit map resolves them.
    blinds = replay_by_hand[3]["events"][0]
    assert blinds["button"] == replay_by_hand[3]["local_button"] == 1
    assert replay_by_hand[3]["seat_map"][1]["player_id"] == replay_by_hand[3]["button_id"] == 3


def test_heads_up_transition_uses_button_as_small_blind_on_compacted_seats():
    result = run_tournament(
        {"Maniac": maniac, "Caller": caller, "Folder": folder},
        starting_stack=2,
        max_hands=2,
        config=NL,
        seed=12,
        curate=2,
    )

    assert result.hands_played == 2
    assert result.hands[0].eliminated_ids == (0,)
    heads_up = result.hands[1]
    assert heads_up.seat_map == (1, 2)
    assert heads_up.button_id == 1
    assert heads_up.local_button == 0

    replay = next(replay for replay in result.replays if replay["hand"] == 2)
    blinds = next(event for event in replay["events"] if event["type"] == "blinds")
    assert blinds["players"] == 2
    assert blinds["button"] == 0
    assert blinds["sb_seat"] == 0  # In heads-up, the button is the small blind.
    assert blinds["bb_seat"] == 1
    assert replay["seat_map"][0]["player_id"] == 1
    assert replay["seat_map"][1]["player_id"] == 2


def test_real_side_pots_can_bust_multiple_players_simultaneously():
    """The tournament carries engine side-pot outcomes into tied eliminations."""
    result = run_tournament(
        {"Maniac": maniac, "Caller": caller, "Folder": folder},
        starting_stack=3,
        max_hands=20,
        config=NL,
        seed=6,
        curate=1,
    )

    assert result.status == "winner"
    assert result.winner_id == 1
    assert result.hands_played == 2
    assert result.final_stacks == (0, 9, 0)
    assert result.hands[1].seat_map == (0, 1, 2)
    assert result.hands[1].eliminated_ids == (0, 2)
    assert all(sum(hand.stacks) == 9 and sum(hand.net) == 0 for hand in result.hands)
    assert [(e.player_id, e.hand, e.place) for e in result.elimination_order] == [
        (0, 2, 2), (2, 2, 2)
    ]

    # Curation is bounded, includes the global/local seat map, and preserves the
    # engine's two separate pot layers without rewriting the betting result.
    assert len(result.replays) == 1
    replay = result.replays[0]
    assert replay["hand"] == 2
    assert [row["player_id"] for row in replay["seat_map"]] == [0, 1, 2]
    award = next(event for event in replay["events"] if event["type"] == "award")
    assert len(award["pots"]) == 2
    assert [pot["amount"] for pot in award["pots"]] == [3, 6]
    assert sum(pot["amount"] for pot in award["pots"]) == replay["pot"] == 9


def test_simultaneous_busts_after_side_pot_awards_share_place_and_conserve(monkeypatch):
    """A synthetic multi-layer result checks same-hand grouping at the driver edge."""
    bots = {f"P{i}": _SeatBot(i) for i in range(4)}
    pots = [
        {"amount": 12, "winners": [2], "eligible": [0, 1, 2, 3]},
        {"amount": 10, "winners": [2], "eligible": [0, 1, 2]},
        {"amount": 18, "winners": [3], "eligible": [2, 3]},
    ]

    def fake_play_hand(seats, button, config, rng=None, log=False,
                       record_events=False, stacks=None):
        assert stacks == [10, 10, 10, 10]
        result = _fake_hand_result(stacks, [0, 0, 19, 21], button, 2, pots=pots)
        result.winners = [2, 3]
        result.events[-1]["winners"] = [2, 3]
        return result

    monkeypatch.setattr(tournament, "play_hand", fake_play_hand)
    result = run_tournament(bots, starting_stack=10, max_hands=1, config=NL, curate=1)

    assert result.status == "hand_cap"
    assert result.winner is None
    assert result.final_stacks == (0, 0, 19, 21)
    assert sum(result.final_stacks) == 40
    assert result.hands[0].pot == 40
    assert result.hands[0].eliminated_ids == (0, 1)
    assert [(e.player_id, e.hand, e.place) for e in result.elimination_order] == [
        (0, 1, 3), (1, 1, 3)
    ]
    assert len(result.replays) == 1
    replay_award = next(e for e in result.replays[0]["events"] if e["type"] == "award")
    assert len(replay_award["pots"]) == 3


def test_hand_cap_returns_remaining_stacks_without_a_false_winner():
    result = run_tournament(
        {"A": caller, "B": caller, "C": caller},
        starting_stack=100,
        max_hands=2,
        config=GameConfig(),
        seed=31,
    )

    assert result.status == "hand_cap"
    assert result.hand_cap_reached
    assert result.winner is None
    assert result.winner_id is None
    assert result.hands_played == 2
    assert not result.elimination_order
    assert all(stack > 0 for stack in result.final_stacks)
    assert sum(result.final_stacks) == 300
    assert len(result.replays) == 0


def test_seeded_decision_streams_are_stable_by_original_seat_and_repeatable():
    class SeededBot:
        def __init__(self):
            self.seed_values = []
            self.rng = random.Random(0)

        def seed_decisions(self, seed):
            self.seed_values.append(seed)
            self.rng = random.Random(seed)

        def act(self, state):
            if RAISE in state.legal_actions and self.rng.random() < 0.4:
                return RAISE
            return CHECK if CHECK in state.legal_actions else CALL

    def run_once():
        bots = {f"P{i}": SeededBot() for i in range(3)}
        result = run_tournament(
            bots,
            starting_stack=40,
            max_hands=12,
            config=NL,
            seed=314159,
            curate=3,
        )
        return result, bots

    first, first_bots = run_once()
    second, second_bots = run_once()

    assert first == second
    assert [bot.seed_values for bot in first_bots.values()] == [
        bot.seed_values for bot in second_bots.values()
    ]
    assert all(len(bot.seed_values) == 1 for bot in first_bots.values())
    assert len({bot.seed_values[0] for bot in first_bots.values()}) == 3
    assert sum(first.final_stacks) == 120
    assert len(first.replays) <= 3


def test_zero_hand_cap_returns_a_valid_unstarted_tournament():
    result = run_tournament({"A": caller, "B": folder}, starting_stack=20, max_hands=0)

    assert result.status == "hand_cap"
    assert result.hands_played == 0
    assert result.winner is None
    assert result.final_stacks == (20, 20)
    assert result.hands == ()
    assert result.replays == ()


@pytest.mark.parametrize(
    "kwargs",
    [
        {"starting_stack": 0, "max_hands": 1},
        {"starting_stack": True, "max_hands": 1},
        {"starting_stack": 10, "max_hands": -1},
        {"starting_stack": 10, "max_hands": True},
        {"starting_stack": 10, "max_hands": 1, "curate": -1},
    ],
)
def test_invalid_tournament_bounds_are_rejected(kwargs):
    starting_stack = kwargs.pop("starting_stack")
    max_hands = kwargs.pop("max_hands")
    with pytest.raises(ValueError):
        run_tournament({"A": caller, "B": folder}, starting_stack, max_hands, **kwargs)
