"""Feature engineering.

Every feature at date t uses only data up to and including t's close, so a prediction
published after the close never sees the future. tests/test_features.py checks this.
"""

import numpy as np
import pandas as pd
import ta

from ml import config

FEATURE_COLUMNS = [
    "ret_1d",
    "ret_5d",
    "ret_20d",
    "rsi_14",
    "macd_hist",
    "dist_dma20",
    "dist_dma50",
    "dma20_vs_dma50",
    "vol_20d",
    "atr_pct",
    "bb_pctb",
    "volume_z",
    "mkt_ret_5d",
    "mkt_ret_20d",
    "rel_strength_20d",
]

# Plain-English meaning of each feature, shown in the model card and on "How it works".
FEATURE_INFO = {
    "ret_1d": "Return over the last session",
    "ret_5d": "Return over the past week (5 sessions)",
    "ret_20d": "Return over the past month (20 sessions)",
    "rsi_14": "RSI (14): momentum gauge; below 30 looks oversold, above 70 overbought",
    "macd_hist": "MACD histogram (scaled by price): whether short-term momentum is turning up or down",
    "dist_dma20": "Distance of the price from its 20-day average",
    "dist_dma50": "Distance of the price from its 50-day average",
    "dma20_vs_dma50": "Short-term (20-day) average vs longer-term (50-day) average",
    "vol_20d": "Volatility over the past month, annualised",
    "atr_pct": "Average true range (14) as a share of price: typical daily movement",
    "bb_pctb": "Bollinger %B: where the price sits within its recent range",
    "volume_z": "Today's trading volume vs the last 20 days",
    "mkt_ret_5d": "NIFTY 50 return over the past week",
    "mkt_ret_20d": "NIFTY 50 return over the past month",
    "rel_strength_20d": "Stock's past-month return minus the NIFTY 50's",
}


def _stock_features(df: pd.DataFrame) -> pd.DataFrame:
    """Per-ticker features from one ticker's OHLCV history (sorted by date)."""
    close, high, low, volume = df["close"], df["high"], df["low"], df["volume"]
    out = pd.DataFrame({"date": df["date"], "ticker": df["ticker"], "close": close})

    out["ret_1d"] = close.pct_change(1)
    out["ret_5d"] = close.pct_change(5)
    out["ret_20d"] = close.pct_change(20)

    out["rsi_14"] = ta.momentum.RSIIndicator(close, window=14).rsi()
    # Scale MACD by price so it is comparable across stocks.
    out["macd_hist"] = ta.trend.MACD(close).macd_diff() / close

    dma20 = close.rolling(20).mean()
    dma50 = close.rolling(50).mean()
    out["dist_dma20"] = close / dma20 - 1
    out["dist_dma50"] = close / dma50 - 1
    out["dma20_vs_dma50"] = dma20 / dma50 - 1

    out["vol_20d"] = out["ret_1d"].rolling(20).std() * np.sqrt(252)
    out["atr_pct"] = ta.volatility.AverageTrueRange(high, low, close, window=14).average_true_range() / close
    out["bb_pctb"] = ta.volatility.BollingerBands(close, window=20).bollinger_pband()

    log_vol = np.log1p(volume)
    out["volume_z"] = (log_vol - log_vol.rolling(20).mean()) / log_vol.rolling(20).std()
    return out


def build_features(prices: pd.DataFrame) -> pd.DataFrame:
    """One row per (date, ticker) for the stock universe, with FEATURE_COLUMNS."""
    stocks = prices[prices["ticker"] != config.BENCHMARK]
    feats = pd.concat(
        [_stock_features(g) for _, g in stocks.groupby("ticker", sort=False)], ignore_index=True
    )

    mkt = prices[prices["ticker"] == config.BENCHMARK].set_index("date")["close"].sort_index()
    market = pd.DataFrame({"mkt_ret_5d": mkt.pct_change(5), "mkt_ret_20d": mkt.pct_change(20)})
    feats = feats.merge(market, left_on="date", right_index=True, how="left")
    feats["rel_strength_20d"] = feats["ret_20d"] - feats["mkt_ret_20d"]

    feats = feats.replace([np.inf, -np.inf], np.nan)
    return feats.sort_values(["date", "ticker"]).reset_index(drop=True)
