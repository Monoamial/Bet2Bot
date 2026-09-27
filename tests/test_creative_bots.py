"""Deterministic behavior checks for the creative opponent archetypes."""

from poker.bots import over_folder, river_bluffer, trapper
from poker.cards import Card
from poker.game_api import OPPONENTS
from poker.state import GameState


def _state(street, hole, board, *, to_call=0, legal_actions=None):
    if legal_actions is None:
        legal_actions = ["check", "raise"] if to_call == 0 else ["fold", "call", "raise"]
    return GameState(
        hole_cards=[Card.from_str(card) for card in hole],
        my_seat=0,
        my_contribution=4,
        community_cards=[Card.from_str(card) for card in board],
        street=street,
        pot=12,
        to_call=to_call,
        bet_size=2,
        raises_so_far=0,
        raise_cap=4,
        button=0,
        num_players=2,
        active_players=[0, 1],
        contributions=[4, 4],
        betting_history=[],
        legal_actions=legal_actions,
    )


def test_river_bluffer_attacks_river_air_but_not_turn_air():
    hole = ["7d", "3c"]
    turn_board = ["As", "Kd", "8c", "5h"]
    river_board = turn_board + ["2s"]

    assert river_bluffer(_state("turn", hole, turn_board)) == "check"
    assert river_bluffer(_state("river", hole, river_board)) == "raise"


def test_over_folder_dumps_a_pair_to_pressure_but_continues_with_trips():
    pair = _state(
        "river", ["As", "Kd"], ["Ah", "8c", "5h", "3s", "2d"], to_call=2,
    )
    trips = _state(
        "river", ["As", "Ah"], ["Ad", "8c", "5h", "3s", "2d"], to_call=2,
    )

    assert over_folder(pair) == "fold"
    assert over_folder(trips) == "call"


def test_trapper_checks_a_monster_then_raises_after_opponent_bets():
    hole = ["As", "Ah"]
    board = ["Ad", "8c", "5h", "3s", "2d"]

    checked_to = _state("river", hole, board)
    facing_bet = _state("river", hole, board, to_call=2)

    assert trapper(checked_to) == "check"
    assert trapper(facing_bet) == "raise"


def test_creative_archetypes_are_additive_game_api_opponents():
    assert {"caller", "rock", "maniac", "profiler"} <= set(OPPONENTS)
    assert OPPONENTS["river_bluffer"]() is river_bluffer
    assert OPPONENTS["over_folder"]() is over_folder
    assert OPPONENTS["trapper"]() is trapper
