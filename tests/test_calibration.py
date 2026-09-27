"""The playtest harness must not recommend gates that random baselines also clear."""
from tools.calibrate_objectives import calibrate, percentile, suggest_threshold


def test_percentiles_and_separation():
    assert percentile([4, 1, 3, 2], .5) == 2.5
    assert suggest_threshold([0, 1, 2], [10, 11, 12]) == 6.0
    assert suggest_threshold([0, 10, 20], [10, 11, 12]) is None
    narrow = suggest_threshold([1.000], [1.001])
    assert 1.000 < narrow < 1.001


def test_real_caller_seeds_produce_a_valid_suggested_gate():
    report = calibrate("caller", hands=100, seeds=3, seed_start=4,
                       baseline="passive", counter="value")
    assert report["metric"] == "player_bb100"
    if report["suggested_threshold"] is not None:
        assert report["baseline_p90"] < report["suggested_threshold"] < report["counter_p10"]
    else:
        assert "No separation" in report["note"]
