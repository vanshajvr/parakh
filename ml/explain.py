"""Plain-English reasons for each call, built from per-feature contributions (decision D-007).

Contributions are SHAP values for LightGBM and coefficient x scaled value for logistic
regression. Because the call is relative to other stocks, each contribution is centred on that
day's average, so a reason reads as "compared with the other stocks today".
"""

import warnings

import numpy as np
import pandas as pd
import shap

from ml.features import FEATURE_COLUMNS
from ml.model import SignalModel


def _pct(x: float) -> str:
    return f"{abs(x) * 100:.1f}%"


def phrase(feature: str, value: float) -> str:
    """One clause describing a feature's current value, written for a beginner."""
    up = value >= 0
    match feature:
        case "ret_1d":
            return f"it {'rose' if up else 'fell'} {_pct(value)} in the last session"
        case "ret_5d":
            return f"it's {'up' if up else 'down'} {_pct(value)} over the past week"
        case "ret_20d":
            return f"it's {'up' if up else 'down'} {_pct(value)} over the past month"
        case "rsi_14":
            if value < 30:
                return f"it looks oversold (RSI {value:.0f})"
            if value > 70:
                return f"it looks overbought (RSI {value:.0f})"
            return f"its momentum reading is neutral (RSI {value:.0f})"
        case "macd_hist":
            return f"short-term momentum is turning {'up' if up else 'down'}"
        case "dist_dma20":
            return f"it's trading {_pct(value)} {'above' if up else 'below'} its 20-day average"
        case "dist_dma50":
            return f"it's trading {_pct(value)} {'above' if up else 'below'} its 50-day average"
        case "dma20_vs_dma50":
            return f"its short-term trend is {'above' if up else 'below'} its longer-term trend"
        case "vol_20d":
            size = "large" if value > 0.35 else "small" if value < 0.20 else "moderate"
            return f"recent price swings are {size} ({value * 100:.0f}% annualised volatility)"
        case "atr_pct":
            return f"its daily price swings are around {_pct(value)}"
        case "bb_pctb":
            if value > 0.8:
                return "it's near the top of its recent price range"
            if value < 0.2:
                return "it's near the bottom of its recent price range"
            return "it's in the middle of its recent price range"
        case "volume_z":
            if value > 1.5:
                return "trading volume is unusually heavy"
            if value < -1.5:
                return "trading volume is unusually light"
            return "trading volume is normal"
        case "mkt_ret_5d":
            return f"the NIFTY 50 is {'up' if up else 'down'} {_pct(value)} over the past week"
        case "mkt_ret_20d":
            return f"the NIFTY 50 is {'up' if up else 'down'} {_pct(value)} over the past month"
        case "rel_strength_20d":
            return f"it has {'outperformed' if up else 'underperformed'} the NIFTY 50 by {_pct(value)} over the past month"
    raise KeyError(feature)


def contributions(model: SignalModel, X: pd.DataFrame) -> pd.DataFrame:
    """Per-feature contribution to each prediction, centred within each date."""
    features = X[FEATURE_COLUMNS]
    if model.kind == "lightgbm":
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="LightGBM binary classifier")
            values = shap.TreeExplainer(model.base).shap_values(features)
        if isinstance(values, list):  # one array per class: take the "beats index" class
            values = values[1]
    else:
        scaler, linear = model.scaler_and_linear
        values = scaler.transform(features) * linear.coef_[0]
    contrib = pd.DataFrame(np.asarray(values), index=X.index, columns=FEATURE_COLUMNS)
    return contrib - contrib.groupby(X["date"]).transform("mean")


def reason(lean: str, contrib: pd.Series, values: pd.Series, n: int = 2) -> str:
    """The one-line 'why' shown on a signal card."""
    if lean == "no_call":
        return "No clear edge today: the signals for this stock are mixed or weak."
    # "Biggest factors", not "because": the model often bets on reversals and its effects depend
    # on combinations of features, so a causal-sounding sentence would mislead (decision D-013).
    sign = 1 if lean == "bullish" else -1
    drivers = (contrib * sign).sort_values(ascending=False)
    drivers = drivers[drivers > 0].head(n)
    clauses = [phrase(f, values[f]) for f in drivers.index]
    direction = "outperforming" if lean == "bullish" else "lagging"
    if not clauses:
        return f"Leaning towards {direction} the NIFTY 50, with no single standout factor."
    factors = "; ".join(c[0].upper() + c[1:] for c in clauses)
    return f"Leaning towards {direction} the NIFTY 50. Biggest factors: {factors}."


def top_factors(contrib: pd.Series, values: pd.Series, n: int = 3) -> list[dict]:
    """The strongest factors either way, for the 'Why' breakdown on the stock page."""
    strongest = contrib.abs().sort_values(ascending=False).head(n).index
    return [
        {
            "feature": f,
            "value": float(values[f]),
            "contribution": float(contrib[f]),
            "pushes": "towards outperforming" if contrib[f] > 0 else "towards lagging",
            "text": phrase(f, values[f]),
        }
        for f in strongest
    ]
