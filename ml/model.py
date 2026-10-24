"""Model definitions: a base scorer plus Platt-scaling calibration."""

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

from ml import config
from ml.features import FEATURE_COLUMNS

# Ordered simplest first: on a tie, the simpler model wins (decision D-022).
MODEL_KINDS = ["reversal", "logreg", "lightgbm"]


class ReversalRule:
    """The one-line baseline: last week's biggest losers lean towards beating the index.

    Nothing is learned here; calibration still decides how strong the rule's edge has been.
    """

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "ReversalRule":
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        p = 1 / (1 + np.exp(10 * X["ret_5d"].to_numpy()))
        return np.column_stack([1 - p, p])


def make_base(kind: str):
    if kind == "reversal":
        return ReversalRule()
    if kind == "logreg":
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=1000))
    if kind == "lightgbm":
        return LGBMClassifier(
            n_estimators=300,
            learning_rate=0.03,
            num_leaves=15,
            min_child_samples=200,
            subsample=0.8,
            subsample_freq=1,
            colsample_bytree=0.8,
            reg_lambda=1.0,
            random_state=config.RANDOM_SEED,
            verbose=-1,
        )
    raise ValueError(f"Unknown model kind: {kind}")


def _logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p)).reshape(-1, 1)


def _daily_z(raw: np.ndarray, dates: pd.Series) -> np.ndarray:
    """Each score's log-odds as a z-score within its date: how far it stands out that day."""
    logit = pd.Series(_logit(raw).ravel(), index=dates.index)
    by_day = logit.groupby(dates)
    z = (logit - by_day.transform("mean")) / by_day.transform("std").replace(0, np.nan)
    return z.fillna(0.0).to_numpy().reshape(-1, 1)


class SignalModel:
    """Base scorer trained on the whole window, calibrated on out-of-fold scores (decision D-023).

    Calibration data comes from an inner walk-forward: each year of the training window after the
    first is scored by a base model trained only on earlier years, with a `horizon`-day gap. That
    gives the calibrator several years of honest scores instead of one short recent slice, which
    was noisy enough to flip the model's ranking in one year. A calibrator slope at or below zero
    means the scores haven't lined up with outcomes, so the model abstains (every stock gets
    "No call") rather than inverting its ranking.

    The calibrator sees each score as a z-score within its date rather than the raw log-odds. The
    out-of-fold models are trained on less data than the final one, so their raw scores are spread
    differently; within-day z-scores keep the calibration (and the "No call" band) transferable.

    Probabilities are centred on 50% within each date: the target is relative to the index, so on
    any day roughly half the stocks beat it, and centring stops the calibrator's view of the recent
    base rate from turning every call bullish or bearish at once (decision D-011).

    The out-of-fold scores also size the "No call" band: `margin` is set so that about
    TARGET_COVERAGE of those rows would get a call.
    """

    def __init__(self, kind: str, horizon: int = config.HORIZON):
        self.kind = kind
        self.horizon = horizon
        self.base = make_base(kind)
        self.calibrator = LogisticRegression()
        self.margin = 0.0
        self.daily_z = True

    def _calibrator_input(self, raw: np.ndarray, dates: pd.Series) -> np.ndarray:
        # Models stored before decision D-023 were calibrated on raw log-odds.
        return _daily_z(raw, dates) if getattr(self, "daily_z", False) else _logit(raw)

    def fit(self, df: pd.DataFrame) -> "SignalModel":
        oof = self._out_of_fold(df)
        y = oof["label"].astype(int)
        x = self._calibrator_input(oof["raw"].to_numpy(), oof["date"])
        self.calibrator.fit(x, y)
        if self.calibrator.coef_[0][0] <= 0:
            # No edge in the out-of-fold scores: predict the base rate, so every probability
            # centres on exactly 50% and nothing clears the band below.
            self.calibrator.coef_[:] = 0.0
            self.calibrator.intercept_[:] = np.log(y.mean() / (1 - y.mean()))

        calibrated = self._centre(self.calibrator.predict_proba(x)[:, 1], oof["date"])
        distance = np.abs(calibrated - 0.5)
        if distance.max() < 1e-9:
            self.margin = 1.0
        else:
            self.margin = float(np.quantile(distance, 1 - config.TARGET_COVERAGE))

        self.base.fit(df[FEATURE_COLUMNS], df["label"].astype(int))
        self.trained_through = pd.Timestamp(df["date"].max())
        return self

    def _out_of_fold(self, df: pd.DataFrame) -> pd.DataFrame:
        """Scores for every year after the first, each from a base model trained only on earlier years."""
        dates = np.sort(df["date"].unique())
        years = pd.DatetimeIndex(dates).year
        parts = []
        for year in np.unique(years)[1:]:
            first = np.searchsorted(years, year)
            if first <= self.horizon:
                continue
            train = df[df["date"] < dates[first - self.horizon]]
            test = df[df["date"].dt.year == year]
            base = make_base(self.kind).fit(train[FEATURE_COLUMNS], train["label"].astype(int))
            parts.append(pd.DataFrame({
                "date": test["date"],
                "label": test["label"],
                "raw": base.predict_proba(test[FEATURE_COLUMNS])[:, 1],
            }))
        if not parts:
            raise ValueError("Calibration needs at least two calendar years of training data")
        return pd.concat(parts)

    @staticmethod
    def _centre(p: np.ndarray, dates: pd.Series) -> np.ndarray:
        p = pd.Series(p, index=dates.index)
        return (p - p.groupby(dates).transform("mean") + 0.5).clip(0.01, 0.99).to_numpy()

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Calibrated probability that the stock beats the index over `horizon` trading days.

        `X` needs a `date` column; probabilities are centred within each date.
        """
        raw = self.base.predict_proba(X[FEATURE_COLUMNS])[:, 1]
        x = self._calibrator_input(raw, X["date"])
        return self._centre(self.calibrator.predict_proba(x)[:, 1], X["date"])

    @property
    def scaler_and_linear(self) -> tuple[StandardScaler, LogisticRegression]:
        assert isinstance(self.base, Pipeline)
        return self.base[0], self.base[-1]
