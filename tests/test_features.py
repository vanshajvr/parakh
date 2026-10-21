import numpy as np
import pandas as pd

from ml import config
from ml.features import FEATURE_COLUMNS, build_features


def test_features_do_not_use_future_data(prices):
    """Features at a date must be identical whether or not later prices exist."""
    full = build_features(prices)
    cutoff = prices["date"].sort_values().unique()[300]
    truncated = build_features(prices[prices["date"] <= cutoff])

    at_cutoff_full = full[full["date"] == cutoff].set_index("ticker")[FEATURE_COLUMNS]
    at_cutoff_trunc = truncated[truncated["date"] == cutoff].set_index("ticker")[FEATURE_COLUMNS]
    pd.testing.assert_frame_equal(at_cutoff_full, at_cutoff_trunc)


def test_benchmark_is_not_a_prediction_row(prices):
    feats = build_features(prices)
    assert config.BENCHMARK not in set(feats["ticker"])
    assert len(feats) == len(prices[prices["ticker"] != config.BENCHMARK])


def test_features_are_complete_after_warmup(prices):
    feats = build_features(prices)
    after_warmup = feats[feats["date"] > feats["date"].sort_values().unique()[60]]
    assert not after_warmup[FEATURE_COLUMNS].isna().any().any()
    assert np.isfinite(after_warmup[FEATURE_COLUMNS].to_numpy()).all()
