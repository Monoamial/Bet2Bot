"""Playtest objective thresholds against a baseline and a taught counter-strategy.

Run from the repo root: PYTHONPATH=. python tools/calibrate_objectives.py \
    --opponent caller --hands 500 --seeds 24

Recommendations are diagnostics, not automatically applied to live levels. If the
high tail of the baseline overlaps the low tail of the counter, *do not* claim the
objective discriminates learning — change the lesson, bot, or hand count first.
"""

import argparse
import json
import math

from poker.game_api import run_level, run_session
from poker.strategy import caller_strategy, folder_strategy, value_strategy

STRATEGIES = {"passive": caller_strategy, "value": value_strategy,
              "folder": folder_strategy}


def percentile(values: list[float], q: float) -> float:
    """Linearly interpolated empirical percentile, insensitive to input order."""
    if not values or not 0 <= q <= 1:
        raise ValueError("percentile needs nonempty values and q between 0 and 1")
    data = sorted(values)
    position = (len(data) - 1) * q
    below = math.floor(position)
    above = math.ceil(position)
    return data[below] + (data[above] - data[below]) * (position - below)


def suggest_threshold(baseline: list[float], counter: list[float]) -> float | None:
    """Only suggest a gate when the weakest taught play beats baseline's upper tail."""
    high_baseline = percentile(baseline, 0.90)
    low_counter = percentile(counter, 0.10)
    if high_baseline >= low_counter:
        return None
    middle = (high_baseline + low_counter) / 2
    rounded = round(middle, 2)
    # Do not round a narrow gap into one boundary (a strict gate would lie).
    return rounded if high_baseline < rounded < low_counter else middle


def calibrate(opponent: str, hands: int, seeds: int, seed_start: int,
              baseline: str, counter: str, stack: int | None = None) -> dict:
    if hands <= 0 or seeds <= 0 or seed_start < 0 or (stack is not None and stack <= 0):
        raise ValueError("hands, seeds, and stack must be positive; seed_start nonnegative")
    results: dict[str, list[float]] = {}
    for name in (baseline, counter):
        series = []
        for seed in range(seed_start, seed_start + seeds):
            policy = STRATEGIES[name]()
            if stack is None:
                result = run_level(opponent=opponent, strategy=policy, hands=hands,
                                   seed=seed, capture=0)
                metric = "player_bb100"
            else:
                result = run_session(opponent=opponent, strategy=policy, stack=stack,
                                     max_hands=hands, seed=seed, capture=0,
                                     config={"betting": "no_limit"})
                metric = "hands_survived"
            if result.get("error"):
                raise ValueError(result["error"])
            series.append(result[metric])
        results[name] = series
    left, right = results[baseline], results[counter]
    recommendation = suggest_threshold(left, right)
    return {
        "opponent": opponent, "metric": metric, "hands": hands, "seeds": seeds,
        "seed_start": seed_start, "baseline": baseline, "counter": counter,
        "baseline_p90": round(percentile(left, 0.9), 2),
        "counter_p10": round(percentile(right, 0.1), 2),
        "suggested_threshold": recommendation,
        "note": "No separation: do not gate progression on this metric" if recommendation is None
                else "Taught counter clears this threshold across the tested seed range",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--opponent", default="caller")
    parser.add_argument("--hands", type=int, default=500)
    parser.add_argument("--seeds", type=int, default=24)
    parser.add_argument("--seed-start", type=int, default=1)
    parser.add_argument("--baseline", choices=STRATEGIES, default="passive")
    parser.add_argument("--counter", choices=STRATEGIES, default="value")
    parser.add_argument("--session-stack", type=int,
                        help="use a carried No-Limit stack and calibrate hands survived")
    args = parser.parse_args()
    print(json.dumps(calibrate(args.opponent, args.hands, args.seeds, args.seed_start,
                               args.baseline, args.counter, args.session_stack), indent=2))
