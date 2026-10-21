"""Evaluate all candidate models walk-forward, train the chosen one on all data, write the report.

Usage: python -m jobs.retrain [--refresh]
"""

import argparse

from ml import config
from ml.data import load_prices
from ml.evaluate import run_walk_forward, summary_metrics
from ml.features import FEATURE_COLUMNS, build_features
from ml.labels import add_labels
from ml.model import MODEL_KINDS, SignalModel
from ml.predict import latest_signals, model_version, save_model
from ml.report import plot_calibration, write_metrics, write_model_card

# Brier differences smaller than this are treated as a tie, and the simpler model wins.
BRIER_TIE = 1e-5


def choose_model(results: dict) -> str:
    """Lowest out-of-sample Brier score; MODEL_KINDS is ordered simplest first."""
    best = MODEL_KINDS[0]
    for kind in MODEL_KINDS[1:]:
        if results[kind]["metrics"]["brier"] < results[best]["metrics"]["brier"] - BRIER_TIE:
            best = kind
    return best


def main(refresh: bool) -> None:
    prices = load_prices(refresh=refresh)
    data = add_labels(build_features(prices), prices).dropna(subset=FEATURE_COLUMNS)
    labeled = data.dropna(subset=["label"])

    results = {}
    for kind in MODEL_KINDS:
        oos = run_walk_forward(labeled, kind)
        results[kind] = {"oos": oos, "metrics": summary_metrics(oos)}
        m = results[kind]["metrics"]
        print(f"{kind:9s} hit rate {m['hit_rate']:.3f}  AUC {m['auc']:.3f}  Brier {m['brier']:.4f}")

    chosen = choose_model(results)
    model = SignalModel(chosen).fit(labeled)
    version = model_version(model)
    save_model(model)
    results[chosen]["oos"].to_parquet(config.ARTIFACTS_DIR / "backtest_predictions.parquet", index=False)

    write_metrics(results, chosen, version)
    plot_calibration(results[chosen]["oos"])
    write_model_card(results, chosen, version, len(labeled))
    print(f"\nChosen: {chosen} ({version}). Model card written to docs/model-card.md\n")

    for s in latest_signals(model, data):
        print(f"{s['date']}  {s['ticker']:14s} {s['lean_label']:13s} {s['confidence']:13s} {s['reason']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="re-download prices from Yahoo Finance")
    main(parser.parse_args().refresh)
