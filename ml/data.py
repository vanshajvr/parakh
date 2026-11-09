"""Download and cache daily price history from Yahoo Finance."""

import pandas as pd
import yfinance as yf

from ml import config

PRICES_PATH = config.DATA_DIR / "prices.parquet"
PRICE_COLUMNS = ["open", "high", "low", "close", "volume"]


def drop_placeholders(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows Yahoo fills in for days with no trading: open, high, low and close all equal, and no volume.

    Found by the SQL analysis (analysis/, section 6): 15 Jan 2026 and 18 Mar 2025 are such rows for
    nearly every stock. Index rows have no volume on Yahoo, but never four equal prices, so they stay.
    """
    flat = (df["open"] == df["high"]) & (df["high"] == df["low"]) & (df["low"] == df["close"])
    return df[~(flat & (df["volume"].fillna(0) == 0))]


def _fetch(tickers: list[str], start: str, threads: bool) -> dict[str, pd.DataFrame]:
    """Download and clean each ticker's prices. A ticker that came back empty is left out."""
    raw = yf.download(
        tickers, start=start, auto_adjust=True, progress=False, group_by="ticker", threads=threads
    )
    frames = {}
    for ticker in tickers:
        if ticker not in raw.columns.get_level_values(0):
            continue
        df = raw[ticker].rename(columns=str.lower)[PRICE_COLUMNS]
        # yfinance can return a trailing row with volume but no prices for an unfinished session.
        df = df.dropna(subset=["open", "high", "low", "close"])
        df = drop_placeholders(df)
        if not df.empty:
            frames[ticker] = df.assign(ticker=ticker)
    return frames


def download_prices(tickers: list[str], start: str = config.START_DATE) -> pd.DataFrame:
    """Return long-format prices: one row per (date, ticker), split/dividend adjusted."""
    frames = _fetch(tickers, start, threads=True)
    # Parallel downloads can collide on yfinance's local cache ("database is locked") and come back
    # empty, as the NIFTY 50 did on 9 Nov 2026. Retry those once, one at a time.
    missing = [t for t in tickers if t not in frames]
    if missing:
        frames |= _fetch(missing, start, threads=False)
    missing = [t for t in tickers if t not in frames]
    if missing:
        raise RuntimeError(f"No data returned for {', '.join(missing)} (after a retry)")

    prices = pd.concat(frames[t] for t in tickers).rename_axis("date").reset_index()
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


EXTRA_PRICES_PATH = config.DATA_DIR / "extra_prices.parquet"


def load_extra_prices(refresh: bool = False) -> pd.DataFrame:
    """Prices for the NIFTY 50 members Parakh doesn't make calls on (movers and charts only).

    Kept apart from load_prices so they can never reach the model's features.
    """
    if EXTRA_PRICES_PATH.exists() and not refresh:
        return pd.read_parquet(EXTRA_PRICES_PATH)

    prices = download_prices(config.EXTRA_TICKERS)
    config.DATA_DIR.mkdir(exist_ok=True)
    prices.to_parquet(EXTRA_PRICES_PATH, index=False)
    return prices
