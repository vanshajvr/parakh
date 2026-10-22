"""Project-wide settings for the ML pipeline."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
ARTIFACTS_DIR = ROOT / "artifacts"
DOCS_DIR = ROOT / "docs"

# Ticker -> (display name, sector)
STOCKS = {
    "HDFCBANK.NS": ("HDFC Bank", "Financials"),
    "ICICIBANK.NS": ("ICICI Bank", "Financials"),
    "SBIN.NS": ("State Bank of India", "Financials"),
    "KOTAKBANK.NS": ("Kotak Mahindra Bank", "Financials"),
    "AXISBANK.NS": ("Axis Bank", "Financials"),
    "BAJFINANCE.NS": ("Bajaj Finance", "Financials"),
    "TCS.NS": ("Tata Consultancy Services", "IT"),
    "INFY.NS": ("Infosys", "IT"),
    "RELIANCE.NS": ("Reliance Industries", "Energy"),
    "NTPC.NS": ("NTPC", "Utilities"),
    "ITC.NS": ("ITC", "Consumer"),
    "HINDUNILVR.NS": ("Hindustan Unilever", "Consumer"),
    "ASIANPAINT.NS": ("Asian Paints", "Consumer"),
    "TITAN.NS": ("Titan Company", "Consumer"),
    "MARUTI.NS": ("Maruti Suzuki", "Automobiles"),
    "LT.NS": ("Larsen & Toubro", "Industrials"),
    "TATASTEEL.NS": ("Tata Steel", "Materials"),
    "ULTRACEMCO.NS": ("UltraTech Cement", "Materials"),
    "BHARTIARTL.NS": ("Bharti Airtel", "Telecom"),
    "SUNPHARMA.NS": ("Sun Pharmaceutical", "Healthcare"),
}
TICKERS = list(STOCKS)
BENCHMARK = "^NSEI"
START_DATE = "2016-01-01"

# Prediction horizon in trading days.
HORIZON = 5

# Walk-forward: each calendar year from FIRST_TEST_YEAR onwards is one out-of-sample fold.
FIRST_TEST_YEAR = 2019

# Walk-forward test years used to choose between models (decision D-022). Later years are the
# holdout: reported, never used to choose.
LAST_RESEARCH_YEAR = 2024

# Share of stock-days the model should make a call on. The "No call" band around 50% is sized
# on each model's calibration slice to hit this coverage (decision D-010).
TARGET_COVERAGE = 0.25

# Rough round-trip cost of a delivery trade in India (STT both sides, brokerage, charges).
ROUND_TRIP_COST = 0.0025

RANDOM_SEED = 42
