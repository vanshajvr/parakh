"""Project-wide settings for the ML pipeline."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
ARTIFACTS_DIR = ROOT / "artifacts"
DOCS_DIR = ROOT / "docs"

TICKERS = [
    # Banks / financials
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS", "BAJFINANCE.NS",
    # IT
    "TCS.NS", "INFY.NS",
    # Energy / utilities
    "RELIANCE.NS", "NTPC.NS",
    # Consumer
    "ITC.NS", "HINDUNILVR.NS", "ASIANPAINT.NS", "TITAN.NS", "MARUTI.NS",
    # Industrials / materials
    "LT.NS", "TATASTEEL.NS", "ULTRACEMCO.NS",
    # Others
    "BHARTIARTL.NS", "SUNPHARMA.NS",
]
BENCHMARK = "^NSEI"
START_DATE = "2016-01-01"

# Prediction horizon in trading days.
HORIZON = 5

# Walk-forward: each calendar year from FIRST_TEST_YEAR onwards is one out-of-sample fold.
FIRST_TEST_YEAR = 2019

# Share of each training window (latest dates) held out to fit probability calibration.
CALIBRATION_FRACTION = 0.2

# Share of stock-days the model should make a call on. The "No call" band around 50% is sized
# on each model's calibration slice to hit this coverage (decision D-010).
TARGET_COVERAGE = 0.25

# Rough round-trip cost of a delivery trade in India (STT both sides, brokerage, charges).
ROUND_TRIP_COST = 0.0025

RANDOM_SEED = 42
