"""The movers lists and screener: every NIFTY 50 member's recent moves, from stored daily prices.

Pure functions over a long price frame (ticker, date, high, low, close, volume), so they're easy to
test and the API stays a thin layer (decision D-030).
"""

import numpy as np
import pandas as pd

from ml import config

YEAR_SESSIONS = 250
AVG_VOLUME_SESSIONS = 20
TOP_N = 5


def _change(closes: pd.Series, sessions: int) -> float | None:
    return float(closes.iloc[-1] / closes.iloc[-1 - sessions] - 1) if len(closes) > sessions else None


def stock_rows(prices: pd.DataFrame, as_of: pd.Timestamp) -> list[dict]:
    """One row per member with data on `as_of`: moves, traded value, volume vs usual, 52-week range."""
    rows = []
    for ticker in config.MARKET_TICKERS:
        g = prices[(prices["ticker"] == ticker) & (prices["date"] <= as_of)].sort_values("date")
        if g.empty or g["date"].iloc[-1] != as_of:
            continue
        close, volume = g["close"], g["volume"].fillna(0)
        last_volume = float(volume.iloc[-1])
        usual = volume.iloc[-1 - AVG_VOLUME_SESSIONS:-1]
        year = g.iloc[-YEAR_SESSIONS:]
        high, low = float(year["high"].max()), float(year["low"].min())
        rows.append({
            "ticker": ticker,
            "close": float(close.iloc[-1]),
            "change_1d": _change(close, 1),
            "change_5d": _change(close, config.HORIZON),
            "change_20d": _change(close, 20),
            # Shares x price: a fair way to compare activity across stocks with very different prices.
            "value_traded": float(close.iloc[-1]) * last_volume,
            "volume_ratio": last_volume / float(usual.mean()) if len(usual) == AVG_VOLUME_SESSIONS and usual.mean() > 0 else None,
            "high_52w": high,
            "low_52w": low,
            "pos_52w": (float(close.iloc[-1]) - low) / (high - low) if high > low else None,
        })
    # The reversal rule's input: last week's return against the average of Parakh's 20 (D-024).
    covered = [r for r in rows if r["ticker"] in config.STOCKS and r["change_5d"] is not None]
    mean = float(np.mean([r["change_5d"] for r in covered])) if covered else 0.0
    for r in rows:
        r["vs_peers_5d"] = r["change_5d"] - mean if r in covered else None
    return rows


def what_happened_next(prices: pd.DataFrame, horizon: int = config.HORIZON, top: int = TOP_N) -> dict | None:
    """How last week's biggest gainers and losers among Parakh's 20 did against the index next week.

    Uses non-overlapping weeks (every `horizon`-th session), so each week counts once.
    """
    closes = prices[prices["ticker"].isin(config.TICKERS + [config.BENCHMARK])].pivot(index="date", columns="ticker", values="close").sort_index()
    if config.BENCHMARK not in closes or len(closes) <= 2 * horizon:
        return None
    past = closes / closes.shift(horizon) - 1
    future = closes.shift(-horizon) / closes - 1
    excess = future.drop(columns=config.BENCHMARK).sub(future[config.BENCHMARK], axis=0)
    past = past.drop(columns=config.BENCHMARK)
    lagged = beat = n_weeks = 0
    for day in closes.index[horizon:-horizon:horizon]:
        ranked = past.loc[day].dropna().sort_values()
        nxt = excess.loc[day]
        if len(ranked) < 2 * top or nxt[ranked.index].isna().any():
            continue
        lagged += int((nxt[ranked.index[-top:]] < 0).sum())
        beat += int((nxt[ranked.index[:top]] > 0).sum())
        n_weeks += 1
    if n_weeks == 0:
        return None
    return {
        "weeks": n_weeks,
        "since": str(closes.index[horizon].date()),
        "gainers_lagged": lagged / (n_weeks * top),
        "losers_beat": beat / (n_weeks * top),
    }
