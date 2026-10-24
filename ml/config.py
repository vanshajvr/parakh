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

# Today's NIFTY 50 members: ticker -> (display name, NSE sector). Shown in the movers lists and the
# screener with daily prices only. Parakh's calls and model use STOCKS above, which are all members.
# Source: Wikipedia's NIFTY 50 article, October 2026; update when the index is rebalanced.
MARKET = {
    "ADANIENT.NS": ("Adani Enterprises", "Metals & Mining"),
    "ADANIPORTS.NS": ("Adani Ports & SEZ", "Services"),
    "APOLLOHOSP.NS": ("Apollo Hospitals", "Healthcare"),
    "ASIANPAINT.NS": ("Asian Paints", "Consumer Durables"),
    "AXISBANK.NS": ("Axis Bank", "Financial Services"),
    "BAJAJ-AUTO.NS": ("Bajaj Auto", "Automobile and Auto Components"),
    "BAJFINANCE.NS": ("Bajaj Finance", "Financial Services"),
    "BAJAJFINSV.NS": ("Bajaj Finserv", "Financial Services"),
    "BEL.NS": ("Bharat Electronics", "Capital Goods"),
    "BHARTIARTL.NS": ("Bharti Airtel", "Telecommunication"),
    "BSE.NS": ("BSE", "Financial Services"),
    "CIPLA.NS": ("Cipla", "Healthcare"),
    "COALINDIA.NS": ("Coal India", "Oil, Gas & Consumable Fuels"),
    "DRREDDY.NS": ("Dr. Reddy's Laboratories", "Healthcare"),
    "EICHERMOT.NS": ("Eicher Motors", "Automobile and Auto Components"),
    "ETERNAL.NS": ("Eternal", "Consumer Services"),
    "GRASIM.NS": ("Grasim Industries", "Construction Materials"),
    "HCLTECH.NS": ("HCLTech", "Information Technology"),
    "HDFCBANK.NS": ("HDFC Bank", "Financial Services"),
    "HDFCLIFE.NS": ("HDFC Life", "Financial Services"),
    "HINDALCO.NS": ("Hindalco Industries", "Metals & Mining"),
    "HINDUNILVR.NS": ("Hindustan Unilever", "Fast Moving Consumer Goods"),
    "ICICIBANK.NS": ("ICICI Bank", "Financial Services"),
    "INDIGO.NS": ("IndiGo", "Services"),
    "INFY.NS": ("Infosys", "Information Technology"),
    "ITC.NS": ("ITC", "Fast Moving Consumer Goods"),
    "JIOFIN.NS": ("Jio Financial Services", "Financial Services"),
    "JSWSTEEL.NS": ("JSW Steel", "Metals & Mining"),
    "KOTAKBANK.NS": ("Kotak Mahindra Bank", "Financial Services"),
    "LT.NS": ("Larsen & Toubro", "Construction"),
    "M&M.NS": ("Mahindra & Mahindra", "Automobile and Auto Components"),
    "MARUTI.NS": ("Maruti Suzuki", "Automobile and Auto Components"),
    "MAXHEALTH.NS": ("Max Healthcare", "Healthcare"),
    "NESTLEIND.NS": ("Nestlé India", "Fast Moving Consumer Goods"),
    "NTPC.NS": ("NTPC", "Power"),
    "ONGC.NS": ("Oil and Natural Gas Corporation", "Oil, Gas & Consumable Fuels"),
    "POWERGRID.NS": ("Power Grid", "Power"),
    "RELIANCE.NS": ("Reliance Industries", "Oil, Gas & Consumable Fuels"),
    "SBILIFE.NS": ("SBI Life Insurance Company", "Financial Services"),
    "SHRIRAMFIN.NS": ("Shriram Finance", "Financial Services"),
    "SBIN.NS": ("State Bank of India", "Financial Services"),
    "SUNPHARMA.NS": ("Sun Pharma", "Healthcare"),
    "TCS.NS": ("Tata Consultancy Services", "Information Technology"),
    "TATACONSUM.NS": ("Tata Consumer Products", "Fast Moving Consumer Goods"),
    "TMPV.NS": ("Tata Motors Passenger Vehicles", "Automobile and Auto Components"),
    "TATASTEEL.NS": ("Tata Steel", "Metals & Mining"),
    "TECHM.NS": ("Tech Mahindra", "Information Technology"),
    "TITAN.NS": ("Titan Company", "Consumer Durables"),
    "TRENT.NS": ("Trent", "Consumer Services"),
    "ULTRACEMCO.NS": ("UltraTech Cement", "Construction Materials"),
}
MARKET_TICKERS = list(MARKET)
# The index fund in the practice simulator (decision D-039): a real NIFTY 50 ETF, because the index
# itself leaves out dividends and an ETF's price includes them, minus its fees.
INDEX_FUND = "NIFTYBEES.NS"
EXTRA_TICKERS = [t for t in MARKET_TICKERS if t not in STOCKS] + [INDEX_FUND]
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
