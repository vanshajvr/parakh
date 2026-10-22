import numpy as np
import pandas as pd

from jobs.retrain import choose_model
from ml.explain import contributions, explanation_values, reason
from ml.features import FEATURE_COLUMNS
from ml.model import SignalModel


def make_rows(years=("2019", "2020", "2021"), tickers=8, reversal=True, seed=0) -> pd.DataFrame:
    """Daily rows where last week's losers beat the index (or the opposite, if reversal=False)."""
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range(f"{years[0]}-01-01", f"{years[-1]}-12-31")
    df = pd.DataFrame({
        "date": np.repeat(dates, tickers),
        "ticker": np.tile([f"T{i}" for i in range(tickers)], len(dates)),
    })
    for f in FEATURE_COLUMNS:
        df[f] = rng.normal(0, 0.03, len(df))
    sign = -1 if reversal else 1
    df["label"] = (sign * df["ret_5d"] + rng.normal(0, 0.03, len(df)) > 0).astype(float)
    return df


def test_reversal_rule_leans_bullish_on_last_weeks_laggards():
    df = make_rows()
    model = SignalModel("reversal").fit(df)
    day = df[df["date"] == df["date"].max()]
    p = model.predict_proba(day)
    assert np.corrcoef(p, day["ret_5d"])[0, 1] < -0.9
    assert abs(p.mean() - 0.5) < 1e-9  # centred within the day


def test_model_abstains_instead_of_inverting_when_scores_point_the_wrong_way():
    # The rule bets on reversals, but here last week's winners keep winning.
    model = SignalModel("reversal").fit(make_rows(reversal=False))
    assert model.calibrator.coef_[0][0] == 0
    day = make_rows(reversal=False).tail(8)
    p = model.predict_proba(day)
    assert np.allclose(p, 0.5)
    assert all(abs(x - 0.5) < model.margin for x in p)  # every stock gets "No call"


def test_reversal_reason_compares_last_week_with_the_other_stocks():
    df = make_rows().tail(8).copy()
    df["ret_5d"] = [-0.06, -0.01, 0.0, 0.01, 0.01, 0.02, 0.01, 0.02]
    model = SignalModel("reversal")
    contrib, values = contributions(model, df), explanation_values(model, df)
    text = reason("bullish", contrib.iloc[0], values.iloc[0])
    assert "worse than the average of the 20 stocks" in text


def _research(ic, ic_t=2.5, negative_years=0, ece=0.01):
    return {"research": {"ic": ic, "ic_t": ic_t, "negative_years": negative_years, "ece": ece}}


def test_more_complex_model_needs_to_pass_and_clearly_beat_the_simpler_one():
    close_call = {"reversal": _research(0.030), "logreg": _research(0.010), "lightgbm": _research(0.034)}
    assert choose_model(close_call) == "reversal"
    clear_win = {**close_call, "lightgbm": _research(0.040)}
    assert choose_model(clear_win) == "lightgbm"
    fails_bar = {**close_call, "lightgbm": _research(0.050, ic_t=1.8)}
    assert choose_model(fails_bar) == "reversal"
