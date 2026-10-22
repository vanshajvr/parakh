"""Pure ledger rules, kept free of database code so they are easy to test.

- Only completed sessions are used for predictions (no half-finished intraday "close").
- A call may only be published before the next session opens.
- Outcomes are computed exactly like the training label (ml.labels): the stock's and the index's
  close `horizon` trading rows after `as_of`.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from ml import config

IST = ZoneInfo("Asia/Kolkata")
MARKET_OPEN = time(9, 15)
# NSE closes at 15:30 IST; leave time for the final close to reach Yahoo Finance.
CLOSE_SETTLED = time(16, 0)


def complete_sessions(prices: pd.DataFrame, now: datetime) -> pd.DataFrame:
    """Drop today's row if the session hasn't finished settling yet."""
    now_ist = now.astimezone(IST)
    if now_ist.time() >= CLOSE_SETTLED:
        return prices
    return prices[prices["date"].dt.date < now_ist.date()]


def publish_deadline(as_of: date) -> datetime:
    """Calls based on the close of `as_of` must be published before the next weekday's open."""
    next_day = as_of + timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)
    return datetime.combine(next_day, MARKET_OPEN, tzinfo=IST)


def can_publish(as_of: date, now: datetime) -> bool:
    return now < publish_deadline(as_of)


def score(pending: pd.DataFrame, prices: pd.DataFrame, horizon: int = config.HORIZON) -> pd.DataFrame:
    """Outcomes for pending predictions whose horizon has passed.

    `pending` has columns id, ticker, as_of (date), lean. Predictions that can't be scored yet
    are left out of the result.
    """
    closes = {t: g.set_index("date")["close"].sort_index() for t, g in prices.groupby("ticker")}
    index = closes[config.BENCHMARK]

    rows = []
    for p in pending.itertuples():
        as_of = pd.Timestamp(p.as_of)
        stock = closes.get(p.ticker)
        if stock is None or as_of not in stock.index or as_of not in index.index:
            continue
        s_pos, i_pos = stock.index.get_loc(as_of), index.index.get_loc(as_of)
        if s_pos + horizon >= len(stock) or i_pos + horizon >= len(index):
            continue

        stock_return = stock.iloc[s_pos + horizon] / stock.iloc[s_pos] - 1
        index_return = index.iloc[i_pos + horizon] / index.iloc[i_pos] - 1
        excess = stock_return - index_return
        beat = bool(excess > 0)
        rows.append({
            "prediction_id": int(p.id),
            "outcome_date": stock.index[s_pos + horizon].date(),
            "stock_return": float(stock_return),
            "index_return": float(index_return),
            "excess_return": float(excess),
            "beat_index": beat,
            "hit": None if p.lean == "no_call" else (p.lean == "bullish") == beat,
        })
    return pd.DataFrame(rows)


def progress(open_calls: pd.DataFrame, prices: pd.DataFrame, horizon: int = config.HORIZON) -> dict[int, list[dict]]:
    """How each unscored call has done so far: one entry per completed session, up to `horizon`.

    Uses the same session counting as `score`, so a call's last entry matches the outcome it gets.
    `open_calls` has columns id, ticker, as_of; `prices` has ticker, date, close. A call published
    after the latest close has an empty path.
    """
    closes = {t: g.set_index("date")["close"].sort_index() for t, g in prices.groupby("ticker")}
    index = closes.get(config.BENCHMARK)
    paths = {}
    for c in open_calls.itertuples():
        as_of = pd.Timestamp(c.as_of)
        stock = closes.get(c.ticker)
        path = []
        if stock is not None and index is not None and as_of in stock.index and as_of in index.index:
            s_pos, i_pos = stock.index.get_loc(as_of), index.index.get_loc(as_of)
            for k in range(1, horizon + 1):
                if s_pos + k >= len(stock) or i_pos + k >= len(index):
                    break
                stock_return = stock.iloc[s_pos + k] / stock.iloc[s_pos] - 1
                index_return = index.iloc[i_pos + k] / index.iloc[i_pos] - 1
                path.append({
                    "date": stock.index[s_pos + k].date(),
                    "stock_return": float(stock_return),
                    "index_return": float(index_return),
                    "excess_return": float(stock_return - index_return),
                })
        paths[int(c.id)] = path
    return paths
