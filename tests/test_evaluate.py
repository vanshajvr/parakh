import numpy as np
import pandas as pd

from ml.evaluate import call_stats, walk_forward_splits


def test_walk_forward_leaves_a_gap_before_each_test_year():
    dates = pd.Series(pd.bdate_range("2016-01-01", "2020-12-31")).repeat(3).reset_index(drop=True)
    unique = np.sort(dates.unique())
    folds = list(walk_forward_splits(dates, first_test_year=2018, horizon=5))

    assert [year for year, _, _ in folds] == [2018, 2019, 2020]
    for year, train, test in folds:
        assert (dates[test].dt.year == year).all()
        last_train = np.searchsorted(unique, dates[train].max())
        first_test = np.searchsorted(unique, dates[test].min())
        # A label at the last training date looks 5 days ahead; that must stay before the test year.
        assert last_train + 5 < first_test


def test_call_stats_counts_bearish_hits_as_lagging():
    oos = pd.DataFrame({
        "lean": ["bullish", "bullish", "bearish", "bearish", "no_call"],
        "label": [1.0, 0.0, 0.0, 0.0, 1.0],
        "excess_return": [0.02, -0.01, -0.03, -0.01, 0.05],
    })
    stats = call_stats(oos)
    assert stats["n_calls"] == 4
    assert stats["coverage"] == 0.8
    assert stats["hit_rate"] == 0.75
    assert stats["bullish_hit_rate"] == 0.5
    assert stats["bearish_hit_rate"] == 1.0
