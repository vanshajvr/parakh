import numpy as np

from ml import config
from ml.features import build_features
from ml.labels import add_labels


def test_label_is_excess_return_vs_benchmark(prices):
    data = add_labels(build_features(prices), prices, horizon=5)
    row = data.dropna(subset=["label"]).iloc[100]

    def close(ticker, offset):
        series = prices[prices["ticker"] == ticker].set_index("date")["close"]
        return series.iloc[series.index.get_loc(row["date"]) + offset]

    stock = close(row["ticker"], 5) / close(row["ticker"], 0) - 1
    index = close(config.BENCHMARK, 5) / close(config.BENCHMARK, 0) - 1
    assert np.isclose(row["excess_return"], stock - index)
    assert row["label"] == float(stock > index)


def test_last_horizon_days_are_unlabelled(prices):
    data = add_labels(build_features(prices), prices, horizon=5)
    last_dates = np.sort(data["date"].unique())[-5:]
    assert data[data["date"].isin(last_dates)]["label"].isna().all()
    assert data[~data["date"].isin(last_dates)]["label"].notna().all()
