"""Today's signals: what the Today screen and the live ledger will show."""

import joblib
import pandas as pd

from ml import config
from ml.explain import contributions, reason, top_factors
from ml.features import FEATURE_COLUMNS
from ml.model import SignalModel
from ml.signals import LEAN_LABELS, confidence_band, lean_from_prob

MODEL_PATH = config.ARTIFACTS_DIR / "model.joblib"


def save_model(model: SignalModel) -> None:
    config.ARTIFACTS_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODEL_PATH)


def load_model() -> SignalModel:
    return joblib.load(MODEL_PATH)


def model_version(model: SignalModel) -> str:
    return f"{model.kind}-{model.trained_through:%Y%m%d}"


def latest_signals(model: SignalModel, data: pd.DataFrame) -> list[dict]:
    """One signal per ticker for the most recent date with complete features."""
    complete = data.dropna(subset=FEATURE_COLUMNS)
    latest = complete[complete["date"] == complete["date"].max()]
    p_up = model.predict_proba(latest)
    contrib = contributions(model, latest)

    signals = []
    for (idx, row), p in zip(latest.iterrows(), p_up):
        lean = lean_from_prob(p, model.margin)
        signals.append({
            "date": str(row["date"].date()),
            "ticker": row["ticker"],
            "p_outperform": round(float(p), 4),
            "lean": lean,
            "lean_label": LEAN_LABELS[lean],
            "confidence": confidence_band(p, model.margin, model.strong_margin),
            "reason": reason(lean, contrib.loc[idx], row[FEATURE_COLUMNS]),
            "factors": top_factors(contrib.loc[idx], row[FEATURE_COLUMNS]),
            "model_version": model_version(model),
        })
    return sorted(signals, key=lambda s: -abs(s["p_outperform"] - 0.5))
