"""Model definitions: a base classifier plus Platt-scaling calibration."""

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

from ml import config
from ml.features import FEATURE_COLUMNS

MODEL_KINDS = ["logreg", "lightgbm"]


def make_base(kind: str):
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


class SignalModel:
    """Base classifier trained on the earlier dates, calibrated on the latest dates of the window.

    The calibration slice is separated from the fitting slice by `horizon` trading days so that
    no fitting label overlaps the calibration period. After calibration the base model is refit on
    the whole window so it still learns from the most recent data.

    Probabilities are centred on 50% within each date: the target is relative to the index, so on
    any day roughly half the stocks beat it, and centring stops the calibrator's view of the recent
    base rate from turning every call bullish or bearish at once (decision D-011).

    The calibration slice also sizes the "No call" band: `margin` is set so that about
    TARGET_COVERAGE of calibration rows would get a call, and `strong_margin` splits those calls
    into a less and a more confident half.
    """

    def __init__(self, kind: str, horizon: int = config.HORIZON):
        self.kind = kind
        self.horizon = horizon
        self.base = make_base(kind)
        self.calibrator = LogisticRegression()
        self.margin = 0.0
        self.strong_margin = 0.0

    def fit(self, df: pd.DataFrame) -> "SignalModel":
        dates = np.sort(df["date"].unique())
        n_calib = max(int(len(dates) * config.CALIBRATION_FRACTION), 1)
        calib_start = dates[-n_calib]
        fit_end = dates[max(len(dates) - n_calib - self.horizon, 1)]

        fit_part = df[df["date"] < fit_end]
        calib_part = df[df["date"] >= calib_start]

        self.base.fit(fit_part[FEATURE_COLUMNS], fit_part["label"].astype(int))
        raw = self.base.predict_proba(calib_part[FEATURE_COLUMNS])[:, 1]
        self.calibrator.fit(_logit(raw), calib_part["label"].astype(int))

        calibrated = self._centre(self.calibrator.predict_proba(_logit(raw))[:, 1], calib_part["date"])
        distance = np.abs(calibrated - 0.5)
        self.margin = float(np.quantile(distance, 1 - config.TARGET_COVERAGE))
        self.strong_margin = float(np.median(distance[distance >= self.margin]))

        self.base.fit(df[FEATURE_COLUMNS], df["label"].astype(int))
        self.trained_through = pd.Timestamp(df["date"].max())
        return self

    @staticmethod
    def _centre(p: np.ndarray, dates: pd.Series) -> np.ndarray:
        p = pd.Series(p, index=dates.index)
        return (p - p.groupby(dates).transform("mean") + 0.5).clip(0.01, 0.99).to_numpy()

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Calibrated probability that the stock beats the index over `horizon` trading days.

        `X` needs a `date` column; probabilities are centred within each date.
        """
        raw = self.base.predict_proba(X[FEATURE_COLUMNS])[:, 1]
        return self._centre(self.calibrator.predict_proba(_logit(raw))[:, 1], X["date"])

    @property
    def scaler_and_linear(self) -> tuple[StandardScaler, LogisticRegression]:
        assert isinstance(self.base, Pipeline)
        return self.base[0], self.base[-1]
