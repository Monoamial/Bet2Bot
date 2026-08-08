"""Tests for stacks / all-ins / side pots (D1+E2 foundation) and betting formats (E1).

The heavyweight check is `test_side_pots_match_independent_reconstruction`: for many
random stacked hands it replays the public event stream, independently recomputes the
layered side-pot awards from contributions + revealed showdown hands, and requires the
engine's nets to match exactly.
"""

import random

import pytest

from poker.action import parse_action
from poker.bots import caller, folder, maniac, random_bot, tight_aggressive
from poker.cards import Card
from poker.engine import GameConfig, play_hand, play_hand_gen
from poker.evaluator import evaluate
from poker.match import run_match, run_session


NL = GameConfig(betting="no_limit")
LIMIT = GameConfig()


# --- action parsing -------------------------------------------------------------

def test_parse_action_forms():
    assert parse_action("raise") == ("raise", None)
    assert parse_action("raise:12") == ("raise", 12)
    assert parse_action("raise 12") == ("raise", 12)
    assert parse_action(("raise", 12)) == ("raise", 12)
    assert parse_action(["call"]) == ("call", None)
    assert parse_action("FOLD ") == ("fold", None)
    assert parse_action("banana") == (None, None)
    assert parse_action(None) == (None, None)


# --- helpers ----------------------------------------------------------------------

def _scripted_hand(config, stacks, scripts, button=0, seed=1):
    """Drive play_hand_gen with per-seat queues of raw actions."""
    gen = play_hand_gen(len(stacks), button, config, random.Random(seed),
                        record_events=True, stacks=stacks)
    try:
        state = next(gen)
        while True:
            raw = scripts[state.my_seat].pop(0)
            state = gen.send((raw, None))
    except StopIteration as e:
        return e.value


def _contribs_from_events(events, n):
    """Recompute per-seat contributions and folds from the public event stream."""
    contrib = [0] * n
    folded = [False] * n
    for e in events:
        if e["type"] == "blinds":
            contrib[e["sb_seat"]] += e["sb"]
            contrib[e["bb_seat"]] += e["bb"]
        elif e["type"] == "action":
            contrib[e["seat"]] += e["amount"]
            if e["action"] == "fold":
                folded[e["seat"]] = True
    return contrib, folded


def _expected_nets(events, n):
    """Independent side-pot reconstruction: layered pots from contributions,
    winners per layer from the revealed showdown hands."""
    contrib, folded = _contribs_from_events(events, n)
    net = [-contrib[s] for s in range(n)]
    survivors = [s for s in range(n) if not folded[s]]
    showdown = next((e for e in events if e["type"] == "showdown"), None)
    award = next(e for e in events if e["type"] == "award")
    button = next(e for e in events if e["type"] == "blinds")["button"]
    order = [(button + 1 + i) % n for i in range(n)]

    if showdown is None:
        assert len(survivors) == 1
        net[survivors[0]] += sum(contrib)
        return net

    board = [Card.from_str(c) for c in showdown["board"]]
    scores = {
        int(s): evaluate([Card.from_str(c) for c in cards] + board)
        for s, cards in showdown["reveals"].items()
    }
    levels = sorted({contrib[s] for s in survivors})
    prev = 0
    assigned = 0
    layers = []
    for lv in levels:
        amount = sum(min(contrib[s], lv) - min(contrib[s], prev) for s in range(n))
        layers.append((amount, [s for s in survivors if contrib[s] >= lv]))
        assigned += amount
        prev = lv
    if assigned < sum(contrib):
        amount, eligible = layers[-1]
        layers[-1] = (amount + sum(contrib) - assigned, eligible)
    for amount, eligible in layers:
        if amount == 0:
            continue
        best = max(scores[s] for s in eligible)
        winners = [s for s in eligible if scores[s] == best]
        share, rem = divmod(amount, len(winners))
        ordered = [s for s in order if s in winners]
        for i, s in enumerate(ordered):
            net[s] += share + (rem if i == 0 else 0)
    assert award["pot"] == sum(contrib)
    return net


# --- conservation & stack bounds over many random stacked hands --------------------

@pytest.mark.parametrize("config", [LIMIT, NL], ids=["limit", "no_limit"])
@pytest.mark.parametrize("n,stacks", [
    (2, [12, 300]),
    (3, [15, 60, 300]),
    (6, [8, 20, 40, 80, 160, 320]),
])
def test_side_pots_match_independent_reconstruction(config, n, stacks):
    bots = [maniac, caller, random_bot, tight_aggressive, maniac, caller][:n]
    for seed in range(60):
        rng = random.Random(seed)
        result = play_hand(bots, button=seed % n, config=config, rng=rng,
                           record_events=True, stacks=list(stacks))
        assert sum(result.net) == 0
        for s in range(n):
            assert result.net[s] >= -stacks[s], "lost more than the stack"
        assert result.net == _expected_nets(result.events, n)
        assert result.final_stacks == [stacks[s] + result.net[s] for s in range(n)]


def test_unlimited_play_has_no_stack_fields():
    result = play_hand([maniac, caller], 0, LIMIT, random.Random(3),
                       record_events=True)
    assert result.final_stacks is None
    for e in result.events:
        assert "stack" not in e and "stacks" not in e


# --- uncalled bets & short calls ----------------------------------------------------

def test_uncalled_raise_is_returned():
    """Maniac pot-raises, folder folds: the raiser wins only the blinds."""
    stats = run_match({"M": maniac, "F": folder}, hands=40,
                      config=GameConfig(betting="no_limit", stack=200), seed=5)
    m, f = stats.seats
    assert m.net + f.net == 0
    # Every hand ends preflop with the folder losing exactly its blind.
    assert f.net == -sum(1 if h % 2 == 0 else 2 for h in range(40))


def test_short_stack_call_is_capped():
    """A 10-chip caller vs a deep maniac can never win or lose more than 10/hand."""
    for seed in range(30):
        result = play_hand([caller, maniac], button=seed % 2,
                           config=NL, rng=random.Random(seed),
                           record_events=True, stacks=[10, 500])
        assert -10 <= result.net[0] <= 10
        assert sum(result.net) == 0


# --- no-limit raise window ------------------------------------------------------------

def test_nl_raise_amounts_are_clamped():
    """Heads-up NL, button/SB acts first preflop: min raise-to is 2*bb; a huge
    request becomes an all-in; a tiny request becomes the min raise."""
    # Scripted: seat 0 (button, SB) raises tiny -> clamped to min (4). Seat 1 calls.
    # Postflop both check down.
    result = _scripted_hand(
        NL, [200, 200],
        scripts={0: ["raise:1", "check", "check", "check"],
                 1: ["call", "check", "check", "check"]},
    )
    raises = [e for e in result.events if e.get("action") == "raise"]
    assert raises[0]["raise_to"] == 4  # min raise over the 2-chip big blind

    # A huge request is an all-in at the stack.
    result = _scripted_hand(
        NL, [50, 200],
        scripts={0: ["raise:999999"], 1: ["fold"]},
    )
    raises = [e for e in result.events if e.get("action") == "raise"]
    assert raises[0]["raise_to"] == 50
    assert raises[0]["all_in"] is True


def test_nl_default_raise_is_pot_sized():
    """A bare 'raise' verb in NL raises pot: preflop button raise-to is 3bb+sb... =
    to_call + pot-after-call on top of the call (here: raise to 7)."""
    result = _scripted_hand(NL, [200, 200], scripts={0: ["raise"], 1: ["fold"]})
    raises = [e for e in result.events if e.get("action") == "raise"]
    # Button posted SB 1, to_call 1, pot 3; after call pot = 4 -> raise to 1+1+4 = 6.
    assert raises[0]["raise_to"] == 6


def test_limit_raises_keep_fixed_size_with_stacks():
    result = _scripted_hand(
        LIMIT, [200, 200],
        scripts={0: ["raise:999", "check", "check", "check"],
                 1: ["call", "check", "check", "check"]},
    )
    raises = [e for e in result.events if e.get("action") == "raise"]
    assert raises[0]["raise_to"] == 4  # bb 2 + small_bet 2, amount request ignored


def test_all_in_players_are_skipped_but_reach_showdown():
    """Both blinds all-in on posting: no decisions, full runout, showdown."""
    result = play_hand([caller, caller], 0, NL, random.Random(9),
                       record_events=True, stacks=[1, 2])
    assert not [e for e in result.events if e["type"] == "action"]
    assert [e for e in result.events if e["type"] == "showdown"]
    assert sum(result.net) == 0


# --- sessions (D1) ---------------------------------------------------------------------

def test_session_bust_ends_early():
    stats = run_session({"hero": folder, "villain": maniac}, stack=6,
                        max_hands=500, config=NL, seed=11)
    assert stats.session_busted
    assert stats.session_final_stack == 0
    assert len(stats.session_stack) < 500          # ended early
    assert stats.session_stack[-1] <= 0 or stats.session_stack[-1] == 0
    # The timeline is exactly the running stack.
    roll = 6
    for h, v in enumerate(stats.session_stack):
        roll += stats.seats[0].bankroll[h] - (stats.seats[0].bankroll[h - 1] if h else 0)
        assert v == roll


def test_session_survivor_keeps_winnings():
    stats = run_session({"hero": maniac, "villain": folder}, stack=50,
                        max_hands=100, config=NL, seed=11)
    assert not stats.session_busted
    assert stats.session_final_stack > 50          # collected blinds all session
    assert len(stats.session_stack) == 100


def test_session_never_loses_more_than_carried_stack():
    stats = run_session({"hero": caller, "villain": maniac}, stack=30,
                        max_hands=300, config=NL, seed=2)
    assert min(stats.session_stack) >= 0
