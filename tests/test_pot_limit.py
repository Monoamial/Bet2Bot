"""Pot-Limit raise windows and parity between batch and interactive play."""

import random

from poker.action import CALL, CHECK, FOLD, RAISE, legal_actions
from poker.bots import caller
from poker.engine import GameConfig, play_hand, play_hand_gen
from poker.interactive import InteractiveMatch


POT_LIMIT = GameConfig(betting="pot_limit")


def _scripted_hand(config, stacks, scripts, button=0, seed=1):
    """Drive a hand with per-seat queues of raw actions."""
    gen = play_hand_gen(len(stacks), button, config, random.Random(seed),
                        record_events=True, stacks=stacks)
    try:
        state = next(gen)
        while True:
            raw = scripts[state.my_seat].pop(0)
            state = gen.send((raw, None))
    except StopIteration as e:
        return e.value


def test_pot_limit_raise_window_counts_call_before_the_pot_cap():
    gen = play_hand_gen(2, 0, POT_LIMIT, random.Random(1), stacks=[200, 200])
    state = next(gen)

    # SB faces 1; call first (pot becomes 4), then may raise 4 more, to 6.
    assert state.my_seat == 0
    assert state.min_raise_to == 4
    assert state.max_raise_to == 6
    assert state.legal_actions == [FOLD, CALL, RAISE]

    state = gen.send(("raise", None))
    # BB faces 4 with pot 8; after calling the pot is 12, so max raise-to is 18.
    assert state.my_seat == 1
    assert state.to_call == 4
    assert state.min_raise_to == 10
    assert state.max_raise_to == 18
    assert state.legal_actions == [FOLD, CALL, RAISE]
    gen.close()


def test_pot_limit_default_raise_is_pot_and_oversize_request_is_capped():
    result = _scripted_hand(
        POT_LIMIT,
        [200, 200],
        {0: ["raise:999999", "fold"], 1: ["raise"]},
    )
    raises = [event for event in result.events if event.get("action") == RAISE]

    # The button's requested raise is capped at the first pot size, 6. The BB's
    # bare raise uses the pot-after-call cap, 18. Neither spends a deep stack.
    assert [event["raise_to"] for event in raises] == [6, 18]
    assert all(not event.get("all_in") for event in raises)
    assert result.final_stacks == [194, 206]


def test_pot_limit_short_all_in_can_raise_below_the_minimum():
    result = _scripted_hand(POT_LIMIT, [3, 100], {0: ["raise"], 1: ["call"]})
    raise_event = next(event for event in result.events if event.get("action") == RAISE)

    assert raise_event["raise_to"] == 3
    assert raise_event["all_in"] is True
    assert result.final_stacks[0] == 0
    assert sum(result.net) == 0


def test_pot_limit_side_pots_keep_all_in_eligibility():
    # Seat 0 is all-in for 3, below the 4-chip full raise. Seat 1 pot-raises to 11
    # and seat 2 calls, creating a 9-chip main pot and a 16-chip side pot contested
    # only by seats 1 and 2.
    result = _scripted_hand(
        POT_LIMIT,
        [3, 100, 100],
        {
            0: ["raise"],
            1: ["raise", "check", "check", "check"],
            2: ["call", "check", "check", "check"],
        },
    )

    raises = [event for event in result.events if event.get("action") == RAISE]
    assert [event["raise_to"] for event in raises] == [3, 11]
    assert raises[0]["all_in"] is True
    assert not raises[1].get("all_in")
    assert [pot["amount"] for pot in result.pots] == [9, 16]
    assert [pot["eligible"] for pot in result.pots] == [[0, 1, 2], [1, 2]]
    assert sum(result.net) == 0
    assert result.final_stacks == [3 + result.net[0], 100 + result.net[1], 100 + result.net[2]]


def test_pot_limit_legal_actions_require_a_nonempty_raise_window():
    blocked = legal_actions(
        to_call=2,
        raises_so_far=0,
        raise_cap=4,
        stack=100,
        betting="pot_limit",
        min_raise_to=12,
        max_raise_to=11,
    )
    short_all_in = legal_actions(
        to_call=2,
        raises_so_far=0,
        raise_cap=4,
        stack=3,
        betting="pot_limit",
        min_raise_to=3,
        max_raise_to=3,
    )

    assert RAISE not in blocked
    assert RAISE in short_all_in


def _human_action(pending):
    """A deterministic human policy mirrored by the batch bot below."""
    if pending["street"] == "preflop" and pending["streetContrib"] == 1:
        if RAISE in pending["legal"]:
            return RAISE
    return CALL if pending["toCall"] > 0 else CHECK


def _batch_human(state):
    if state.street == "preflop" and state.my_street_contrib == 1:
        if RAISE in state.legal_actions:
            return RAISE
    return CALL if state.to_call > 0 else CHECK


def test_pot_limit_seeded_batch_and_interactive_events_match():
    seed = 17
    stacks = [80, 80]
    batch = play_hand(
        [_batch_human, caller],
        button=0,
        config=POT_LIMIT,
        rng=random.Random(seed),
        record_events=True,
        stacks=stacks,
    )

    match = InteractiveMatch(
        caller,
        config=POT_LIMIT,
        seed=seed,
        fixed_button=0,
        stack=80,
    )
    payload = match.start_hand()
    assert payload["pending"]["betting"] == "pot_limit"
    assert payload["pending"]["minRaiseTo"] == 4
    assert payload["pending"]["maxRaiseTo"] == 6
    live_events = list(payload["events"])
    while payload["done"] is None:
        payload = match.act(_human_action(payload["pending"]))
        live_events.extend(payload["events"])

    # Live play hides opponent hole cards; all other public events match exactly.
    batch_public = [
        event for event in batch.events
        if event["type"] != "hole" or event["seat"] == 0
    ]
    assert live_events == batch_public
    assert payload["done"]["handNet"] == batch.net[0]
    assert payload["done"]["pots"] == batch.pots


def test_pot_limit_batch_is_repeatable_for_the_same_seed():
    def deal():
        return play_hand(
            [_batch_human, caller],
            button=0,
            config=POT_LIMIT,
            rng=random.Random(89),
            record_events=True,
            stacks=[80, 80],
        )

    first = deal()
    replay = deal()
    assert replay.events == first.events
    assert replay.net == first.net
