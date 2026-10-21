"""Prediction target: does the stock beat the NIFTY 50 over the next `horizon` trading days?

The honest alternative for a beginner is an index fund, so the question the product answers is
"is this stock likely to do better than simply holding the index?" (decision D-008).
"""

import pandas as pd

from ml import config


def add_labels(feats: pd.DataFrame, prices: pd.DataFrame, horizon: int = config.HORIZON) -> pd.DataFrame:
    """Add forward stock return, forward index return, excess return and the binary label.

    Rows whose outcome is not known yet (the last `horizon` days) get NaN.
    """
    feats = feats.sort_values(["ticker", "date"]).copy()
    future_close = feats.groupby("ticker")["close"].shift(-horizon)
    feats["fwd_return"] = future_close / feats["close"] - 1

    mkt = prices[prices["ticker"] == config.BENCHMARK].set_index("date")["close"].sort_index()
    mkt_fwd = (mkt.shift(-horizon) / mkt - 1).rename("mkt_fwd_return")
    feats = feats.merge(mkt_fwd, left_on="date", right_index=True, how="left")

    feats["excess_return"] = feats["fwd_return"] - feats["mkt_fwd_return"]
    feats["label"] = (feats["excess_return"] > 0).astype("float").where(feats["excess_return"].notna())
    return feats.sort_values(["date", "ticker"]).reset_index(drop=True)
