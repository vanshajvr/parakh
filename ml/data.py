"""Download and cache daily price history from Yahoo Finance."""

import pandas as pd
import yfinance as yf

from ml import config

PRICES_PATH = config.DATA_DIR / "prices.parquet"
PRICE_COLUMNS = ["open", "high", "low", "close", "volume"]


def download_prices(tickers: list[str], start: str = config.START_DATE) -> pd.DataFrame:
    """Return long-format prices: one row per (date, ticker), split/dividend adjusted."""
    raw = yf.download(
        tickers, start=start, auto_adjust=True, progress=False, group_by="ticker", threads=True
    )
    frames = []
    for ticker in tickers:
        if ticker not in raw.columns.get_level_values(0):
            raise RuntimeError(f"No data returned for {ticker}")
        df = raw[ticker].rename(columns=str.lower)[PRICE_COLUMNS]
        # yfinance can return a trailing row with volume but no prices for an unfinished session.
        df = df.dropna(subset=["open", "high", "low", "close"])
        df = df.assign(ticker=ticker)
        frames.append(df)

    prices = pd.concat(frames).rename_axis("date").reset_index()
    prices["date"] = pd.to_datetime(prices["date"]).dt.tz_localize(None).dt.normalize()
    return prices.sort_values(["ticker", "date"]).reset_index(drop=True)


def load_prices(refresh: bool = False) -> pd.DataFrame:
    """Load cached prices for the stock universe plus the benchmark, downloading if needed."""
    if PRICES_PATH.exists() and not refresh:
        return pd.read_parquet(PRICES_PATH)

    prices = download_prices(config.TICKERS + [config.BENCHMARK])
    config.DATA_DIR.mkdir(exist_ok=True)
    prices.to_parquet(PRICES_PATH, index=False)
    return prices
