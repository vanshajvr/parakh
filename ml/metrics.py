"""How calls are scored. Shared by the walk-forward evaluation and the API's live track record.

Expects rows with `lean`, `label` (1 if the stock beat the index), `excess_return`, and for
calibration `p_up`.
"""

import numpy as np
import pandas as pd


def _mean(s: pd.Series) -> float:
    return float(s.mean()) if len(s) else float("nan")


def call_stats(rows: pd.DataFrame) -> dict:
    """How the bullish/bearish calls did, ignoring 'No call' rows."""
    calls = rows[rows["lean"] != "no_call"]
    bull = calls[calls["lean"] == "bullish"]
    bear = calls[calls["lean"] == "bearish"]
    hits = np.where(calls["lean"] == "bullish", calls["label"] == 1, calls["label"] == 0)
    return {
        "coverage": len(calls) / len(rows) if len(rows) else 0.0,
        "n_calls": int(len(calls)),
        "hit_rate": float(hits.mean()) if len(calls) else float("nan"),
        "n_bullish": int(len(bull)),
        "bullish_hit_rate": _mean(bull["label"] == 1),
        "n_bearish": int(len(bear)),
        "bearish_hit_rate": _mean(bear["label"] == 0),
        "avg_excess_after_bullish": _mean(bull["excess_return"]),
        "avg_excess_after_bearish": _mean(bear["excess_return"]),
    }


def expected_calibration_error(p: np.ndarray, y: np.ndarray, n_bins: int = 10) -> float:
    bins = np.minimum((p * n_bins).astype(int), n_bins - 1)
    ece = 0.0
    for b in np.unique(bins):
        in_bin = bins == b
        ece += in_bin.mean() * abs(p[in_bin].mean() - y[in_bin].mean())
    return float(ece)


def calibration_table(rows: pd.DataFrame, n_bins: int = 10) -> pd.DataFrame:
    """Predicted vs actual frequency, binned by predicted probability (empty bins dropped)."""
    lo, hi = rows["p_up"].quantile([0.005, 0.995])
    edges = np.linspace(lo, hi, n_bins + 1)
    edges[0], edges[-1] = 0.0, 1.0
    binned = pd.cut(rows["p_up"], edges, include_lowest=True)
    table = rows.groupby(binned, observed=True).agg(
        n=("label", "size"), predicted=("p_up", "mean"), actual=("label", "mean")
    )
    return table.reset_index(drop=True)


def rank_ic(rows: pd.DataFrame, step: int = 5) -> dict:
    """Daily rank IC: how well each day's probabilities ordered the stocks by excess return.

    The t-stat uses every `step`-th trading day, because 5-day outcomes on neighbouring days
    overlap and would otherwise count the same price move several times (decision D-022).
    A day where every probability is equal (the model abstained) counts as an IC of zero.
    """
    def day_ic(day: pd.DataFrame) -> float:
        if day["p_up"].nunique() < 2 or day["excess_return"].nunique() < 2:
            return 0.0
        return float(day["p_up"].rank().corr(day["excess_return"].rank()))

    daily = rows.groupby("date")[["p_up", "excess_return"]].apply(day_ic).sort_index()
    sampled = daily.iloc[::step]
    sd = sampled.std()
    by_year = daily.groupby(daily.index.year).mean()
    return {
        "ic": float(daily.mean()),
        "ic_t": float(sampled.mean() / sd * np.sqrt(len(sampled))) if sd > 0 else 0.0,
        "ic_by_year": {int(y): float(v) for y, v in by_year.items()},
        "negative_years": int((by_year < 0).sum()),
    }
