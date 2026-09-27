"""The five playing cards must explain the showdown, including board-play ties."""
from poker.cards import Card
from poker.evaluator import best_five, evaluate
from poker.engine import GameConfig, play_hand_gen
import random


def test_best_five_scores_like_all_seven_and_keeps_deal_order():
    cards = [Card.from_str(c) for c in ['Ah', '2h', '3h', '4h', '5h', 'Ks', 'Kd']]
    best = best_five(cards)
    assert [str(c) for c in best] == ['Ah', '2h', '3h', '4h', '5h']
    assert evaluate(best) == evaluate(cards)


def test_showdown_event_best_five_matches_engine_score():
    for seed in range(30):
        rng = random.Random(seed)
        gen = play_hand_gen(2, seed % 2, GameConfig(), rng, record_events=True)
        try:
            state = next(gen)
            while True:
                state = gen.send(('check' if 'check' in state.legal_actions else 'call', None))
        except StopIteration as stopped:
            result = stopped.value
        for ev in result.events:
            if ev['type'] != 'showdown':
                continue
            for seat, cards in ev['reveals'].items():
                selected = ev['best_five'][seat]
                assert len(selected) == 5
                assert len(set(selected)) == 5
                seven = [Card.from_str(c) for c in cards + ev['board']]
                assert evaluate([Card.from_str(c) for c in selected]) == evaluate(seven)
