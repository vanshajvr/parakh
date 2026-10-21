import numpy as np
import pandas as pd
import pytest

from ml import config


def make_prices(tickers: list[str], n_days: int = 400, seed: int = 0) -> pd.DataFrame:
    """Random-walk OHLCV prices in the same long format as ml.data.load_prices."""
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2020-01-01", periods=n_days)
    frames = []
    for ticker in tickers:
        close = 100 * np.exp(np.cumsum(rng.normal(0, 0.015, n_days)))
        spread = close * rng.uniform(0.002, 0.02, n_days)
        frames.append(pd.DataFrame({
            "date": dates,
            "ticker": ticker,
            "open": close * (1 + rng.normal(0, 0.003, n_days)),
            "high": close + spread,
            "low": close - spread,
            "close": close,
            "volume": rng.integers(1_000_000, 5_000_000, n_days).astype(float),
        }))
    return pd.concat(frames, ignore_index=True)


@pytest.fixture
def prices() -> pd.DataFrame:
    return make_prices(["AAA.NS", "BBB.NS", "CCC.NS", "DDD.NS", config.BENCHMARK])
