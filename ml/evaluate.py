"""Walk-forward evaluation and the metrics reported in the model card.

A "hit" is a bullish call on a stock that then beat the NIFTY 50 over the horizon, or a bearish
call on one that lagged it (see ml.metrics).
"""

from collections.abc import Iterator

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, roc_auc_score

from ml import config
from ml.metrics import calibration_table, call_stats, expected_calibration_error
from ml.model import SignalModel
from ml.signals import confidence_band, lean_from_prob


def walk_forward_splits(
    dates: pd.Series, first_test_year: int = config.FIRST_TEST_YEAR, horizon: int = config.HORIZON
) -> Iterator[tuple[int, pd.Series, pd.Series]]:
    """Yield (year, train_mask, test_mask) with an expanding training window.

    Training stops `horizon` trading days before the test year starts, because a label at date d
    depends on the close at d + horizon.
    """
    unique_dates = np.sort(dates.unique())
    years = sorted({d.year for d in pd.DatetimeIndex(unique_dates) if d.year >= first_test_year})
    for year in years:
        test_mask = dates.dt.year == year
        test_start_idx = np.searchsorted(unique_dates, dates[test_mask].min())
        train_end = unique_dates[max(test_start_idx - horizon, 0)]
        train_mask = dates < train_end
        yield year, train_mask, test_mask


def run_walk_forward(labeled: pd.DataFrame, kind: str) -> pd.DataFrame:
    """Out-of-sample predictions for every test year, each from a model trained only on the past."""
    folds = []
    for year, train_mask, test_mask in walk_forward_splits(labeled["date"]):
        model = SignalModel(kind).fit(labeled[train_mask])
        test = labeled.loc[test_mask, ["date", "ticker", "label", "fwd_return", "excess_return"]].copy()
        test["p_up"] = model.predict_proba(labeled[test_mask])
        test["lean"] = [lean_from_prob(p, model.margin) for p in test["p_up"]]
        test["confidence"] = [
            confidence_band(p, model.margin, model.strong_margin) for p in test["p_up"]
        ]
        test["fold"] = year
        folds.append(test)
    return pd.concat(folds, ignore_index=True)


def summary_metrics(oos: pd.DataFrame) -> dict:
    p, y = oos["p_up"].to_numpy(), oos["label"].to_numpy()
    base_rate = float(y.mean())
    return {
        "n_predictions": int(len(oos)),
        "period": [str(oos["date"].min().date()), str(oos["date"].max().date())],
        "base_rate_beat_index": base_rate,
        "accuracy": float(((p > 0.5) == y).mean()),
        "auc": float(roc_auc_score(y, p)),
        "brier": float(brier_score_loss(y, p)),
        # Brier of always predicting the true base rate: the bar any model must clear.
        "brier_constant": float(brier_score_loss(y, np.full_like(p, base_rate))),
        "ece": expected_calibration_error(p, y),
        "avg_excess_all": float(oos["excess_return"].mean()),
        **call_stats(oos),
        "by_confidence": {
            band: call_stats(g) for band, g in oos[oos["lean"] != "no_call"].groupby("confidence")
        },
    }


def coverage_table(oos: pd.DataFrame, coverages=(0.05, 0.10, 0.25, 0.50, 1.0)) -> pd.DataFrame:
    """What-if: hit rate if the model made fewer or more calls (most confident first)."""
    distance = (oos["p_up"] - 0.5).abs()
    rows = []
    for c in coverages:
        margin = float(distance.quantile(1 - c)) if c < 1 else 0.0
        leans = [lean_from_prob(p, margin) for p in oos["p_up"]]
        rows.append({"target_coverage": c, **call_stats(oos.assign(lean=leans))})
    return pd.DataFrame(rows)


def yearly_table(oos: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for year, g in oos.groupby("fold"):
        rows.append({
            "year": int(year),
            "base_rate_beat_index": float(g["label"].mean()),
            "auc": float(roc_auc_score(g["label"], g["p_up"])),
            **call_stats(g),
        })
    return pd.DataFrame(rows)
