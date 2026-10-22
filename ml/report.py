"""Writes the evaluation outputs: metrics JSON, calibration chart and docs/model-card.md."""

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from ml import config
from ml.evaluate import coverage_table, passes, yearly_table
from ml.features import FEATURE_COLUMNS, FEATURE_INFO, model_features
from ml.metrics import calibration_table

IMG_DIR = config.DOCS_DIR / "img"


def _p(x: float, digits: int = 1) -> str:
    return "—" if pd.isna(x) else f"{x * 100:.{digits}f}%"


def _bp(x: float) -> str:
    """Excess return in percentage points with sign, e.g. +0.22%."""
    return "—" if pd.isna(x) else f"{x * 100:+.2f}%"


def write_metrics(results: dict, chosen: str, version: str) -> dict:
    """Write artifacts/metrics.json and return its contents."""
    payload = {
        "model_version": version,
        "chosen_model": chosen,
        "models": {kind: r["metrics"] for kind, r in results.items()},
        "research": {kind: r["research"] for kind, r in results.items()},
        "holdout": {kind: r["holdout"] for kind, r in results.items()},
        "last_research_year": config.LAST_RESEARCH_YEAR,
        "yearly": yearly_table(results[chosen]["oos"]).to_dict(orient="records"),
        "calibration": calibration_table(results[chosen]["oos"]).to_dict(orient="records"),
        "coverage_tradeoff": coverage_table(results[chosen]["oos"]).to_dict(orient="records"),
    }
    config.ARTIFACTS_DIR.mkdir(exist_ok=True)
    (config.ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(payload, indent=2, default=float))
    return payload


def plot_calibration(oos: pd.DataFrame) -> None:
    table = calibration_table(oos)
    lo = min(table["predicted"].min(), table["actual"].min()) - 0.01
    hi = max(table["predicted"].max(), table["actual"].max()) + 0.01
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot([lo, hi], [lo, hi], linestyle="--", color="#999", label="Perfect calibration")
    ax.scatter(table["predicted"], table["actual"], s=table["n"] / table["n"].max() * 300,
               color="#2f6fde", alpha=0.8, label="Model (size = no. of predictions)")
    ax.set(xlim=(lo, hi), ylim=(lo, hi), xlabel="Predicted chance of beating NIFTY 50",
           ylabel="Actual share that beat NIFTY 50", title="Calibration (walk-forward, out-of-sample)")
    ax.legend(loc="upper left", fontsize=8)
    fig.tight_layout()
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(IMG_DIR / "calibration.png", dpi=150)
    plt.close(fig)


MODEL_NAMES = {
    "reversal": "Reversal rule",
    "logreg": "Logistic regression",
    "lightgbm": "LightGBM",
}
MODEL_DESCRIPTIONS = {
    "reversal": "stocks that did worst over the past week, compared with the "
                "other stocks, lean towards beating the index over the next week. Nothing is learned "
                "except how strong that tendency has been (the calibration)",
    "logreg": "logistic regression on the 15 price and volume features",
    "lightgbm": "LightGBM, a collection of small decision trees, on the 15 price and volume features",
}


def _ic_row(kind: str, r: dict, chosen: str) -> str:
    verdict = "passes" if passes(r) else "fails"
    name = f"**{MODEL_NAMES[kind]}** (chosen)" if kind == chosen else MODEL_NAMES[kind]
    return (f"| {name} | {r['ic']:+.4f} | {r['ic_t']:+.2f} | {r['negative_years']} of {len(r['ic_by_year'])} | "
            f"{_p(r['ece'])} | {_p(r['hit_rate'])} | {verdict} |")


def write_model_card(results: dict, chosen: str, version: str, n_rows: int) -> None:
    m = results[chosen]["metrics"]
    research = results[chosen]["research"]
    holdout = results[chosen]["holdout"]
    oos = results[chosen]["oos"]
    cost = config.ROUND_TRIP_COST
    spread = m["avg_excess_after_bullish"] - m["avg_excess_after_bearish"]
    last = config.LAST_RESEARCH_YEAR

    selection = "\n".join(_ic_row(kind, r["research"], chosen) for kind, r in results.items())
    holdout_rows = "\n".join(
        f"| {MODEL_NAMES[kind]}{' (chosen)' if kind == chosen else ''} | {h['ic']:+.4f} | {h['ic_t']:+.2f} | "
        f"{_p(h['hit_rate'])} | {h['n_calls']:,} | {_bp(h['avg_excess_after_bullish'])} | {_bp(h['avg_excess_after_bearish'])} |"
        for kind, r in results.items() if (h := r["holdout"])
    )
    by_conf = "\n".join(
        f"| {band} | {s['n_calls']:,} | {_p(s['hit_rate'])} |"
        for band, s in sorted(m["by_confidence"].items(), key=lambda kv: kv[0] != "Slight edge")
    )
    yearly = "\n".join(
        f"| {int(r.year)}{' (holdout)' if r.year > last else ''} | {_p(r.coverage, 0)} | {_p(r.hit_rate)} | "
        f"{m['ic_by_year'][int(r.year)]:+.3f} | {_bp(r.avg_excess_after_bullish)} | {_bp(r.avg_excess_after_bearish)} |"
        for r in yearly_table(oos).itertuples()
    )
    tradeoff = "\n".join(
        f"| {_p(r.target_coverage, 0)} | {_p(r.coverage, 0)} | {_p(r.hit_rate)} | "
        f"{_bp(r.avg_excess_after_bullish)} | {_bp(r.avg_excess_after_bearish)} |"
        for r in coverage_table(oos).itertuples()
    )
    used = model_features(chosen)
    features = "\n".join(f"| `{f}` | {FEATURE_INFO[f]} |" for f in used)
    candidates = "\n".join(f"| `{f}` | {FEATURE_INFO[f]} |" for f in FEATURE_COLUMNS)

    if passes(research):
        edge = (f"In the research years ({config.FIRST_TEST_YEAR}–{last}) the model passed the bar set in advance: "
                f"a rank IC of {research['ic']:+.3f} with a t-stat of {research['ic_t']:.2f}. That is a **small but "
                f"real-looking edge**, not a large one.")
    else:
        edge = (f"In the research years ({config.FIRST_TEST_YEAR}–{last}) the model did **not** pass the bar set in "
                f"advance (rank IC {research['ic']:+.3f}, t-stat {research['ic_t']:.2f}), so we can't tell its edge "
                f"apart from chance.")
    if holdout:
        verdict = "held up" if holdout["ic"] > 0 and holdout["hit_rate"] >= 0.5 else "did not hold up well"
        edge += (f" On the holdout ({holdout['period'][0]} to {holdout['period'][1]}), which played no part in "
                 f"choosing, it {verdict}: rank IC {holdout['ic']:+.3f} (t-stat {holdout['ic_t']:.2f}) and "
                 f"{_p(holdout['hit_rate'])} of {holdout['n_calls']:,} calls right.")

    card = f"""# Model Card

> Generated by `python -m jobs.retrain`. Don't edit by hand; change `ml/report.py` instead.
> Model version: `{version}`

## What it predicts

For each of {len(config.TICKERS)} large NIFTY 50 stocks, after each trading day's close: **the probability
that the stock beats the NIFTY 50 index over the next {config.HORIZON} trading days.** The product turns that
probability into a *Bullish lean* (likely to outperform), a *Bearish lean* (likely to lag), or *No call*.

- **Intended use:** education. It helps beginners see what price data says about a stock compared
  with simply holding an index fund, and how reliable that has been.
- **Not intended for:** trading decisions, personalised advice, intraday use, or any stock outside the list.

## Data

- Daily adjusted prices from Yahoo Finance (via `yfinance`), {config.START_DATE} onwards, plus the NIFTY 50 index.
- {n_rows:,} labelled stock-days after indicator warm-up.
- Universe: {", ".join(t.removesuffix(".NS") for t in config.TICKERS)}.

## The model

**{MODEL_NAMES[chosen]}:** {MODEL_DESCRIPTIONS[chosen]}.

| Input | Meaning |
|---|---|
{features}

## How it was chosen

The rules were written down before the experiments were run (decision D-022):

- **Research years:** {config.FIRST_TEST_YEAR}–{last}. Each year is predicted by a model trained only on earlier data,
  with a {config.HORIZON}-day gap so no training outcome overlaps the test year.
- **Holdout:** {last + 1} onwards. It is reported below, but it is never used to choose or tune anything.
- **Main measure:** daily rank IC, the correlation between each day's probabilities and how the stocks actually did
  against the index. The t-stat uses every {config.HORIZON}th trading day, because neighbouring days share most of
  their {config.HORIZON}-day price move.
- **The bar:** IC t-stat of at least 2.0, at most one negative research year, and calibration error of at most 2%.
- **Simpler wins:** the models are tried simplest first. A more complex one is chosen only if it passes the bar
  and beats the current choice's IC by at least 0.005.

### Research years ({config.FIRST_TEST_YEAR}–{last})

| Model | Rank IC | t-stat | Negative years | Calibration error | Hit rate on calls | Bar |
|---|---|---|---|---|---|---|
{selection}

### Holdout ({last + 1} onwards, reported as it came out)

| Model | Rank IC | t-stat | Hit rate on calls | Calls | Excess after bullish | after bearish |
|---|---|---|---|---|---|---|
{holdout_rows}

### Also tried (decisions D-009, D-023, D-024)

- Extra features for LightGBM: 12-month momentum, distance from the 52-week high and sector-relative return (D-009);
  last week's relative return scaled by volatility, a 1-week vs 3-month volume shock, and NIFTY 50 volatility (D-024).
  None cleared the bar by enough to beat the reversal rule.
- Ranking every feature against the other stocks each day: worse in 4 of 6 research years.
- 10- and 20-day horizons: weaker than 5 days for both the rule and LightGBM.

The 15 price and volume features the ML candidates used:

| Feature | Meaning |
|---|---|
{candidates}

## Calibration and "No call"

- **Calibration:** Platt scaling fitted on out-of-fold scores. Each year of the training window is scored by a model
  trained only on earlier years, and each day's scores are standardised before calibrating. If the scores haven't
  lined up with outcomes, the model abstains instead of flipping its ranking (decision D-023). Probabilities are
  centred on 50% within each day (decision D-011).
- **"No call" band:** sized on those out-of-fold scores so that about {int(config.TARGET_COVERAGE * 100)}% of stock-days
  get a call. The more confident half of calls is labelled *Stronger edge*, the rest *Slight edge* (decision D-010).

## Results, all years ({m["period"][0]} to {m["period"][1]})

### Do more confident calls do better?

| Confidence | Calls | Hit rate |
|---|---|---|
{by_conf}

![Calibration chart](img/calibration.png)

### Year by year

| Year | Coverage | Hit rate | Rank IC | Avg excess return after bullish | after bearish |
|---|---|---|---|---|---|
{yearly}

### Fewer vs more calls (what-if)

| Target coverage | Actual | Hit rate | Excess after bullish | after bearish |
|---|---|---|---|---|
{tradeoff}

## Honest summary

- {edge}
- Across all years, {_p(m["hit_rate"])} of calls were right, against 50% for a coin flip, with a calibration error
  of {_p(m["ece"])}.
- Over {config.HORIZON} days, stocks with a bullish lean did {_bp(m["avg_excess_after_bullish"])} relative to the index on average,
  and stocks with a bearish lean did {_bp(m["avg_excess_after_bearish"])}. The gap ({_bp(spread)}) is **smaller than a typical
  round-trip trading cost of about {_p(cost, 2)}**, so trading on these signals alone would not be expected to make money.
- Per-stock hit rates are shown with a likely range. With a few hundred overlapping calls per stock, most of the
  spread between stocks is within what chance alone produces.

## Limitations

- Uses price and volume only: no fundamentals, news or earnings dates.
- Large, liquid stocks are the hardest to predict. This is expected behaviour, not a bug.
- yfinance data can be delayed or revised. Yahoo rewrites adjusted price history after dividends and
  corporate actions, so the simulated numbers above can shift slightly between retrains (we have
  seen hit rates move by about 0.2 points). Live calls can't shift: each one is stored when it's published.
- Past out-of-sample performance does not guarantee future performance. The live ledger is the real test.

## Disclaimer

This is an educational project. It is not investment advice, and it is not registered with SEBI.
"""
    (config.DOCS_DIR / "model-card.md").write_text(card)
