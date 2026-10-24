"""SQL queries behind the API. Every connection is read-only.

The ledger changes once a day, so query results are cached in memory for CACHE_SECONDS.
"""

import json
import time
from datetime import date

import pandas as pd
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

CACHE_SECONDS = 300
# Neon suspends idle compute after ~5 minutes and drops its connections. Extra pooled connections
# are closed before then; the pool's one permanent connection can still go stale, so every
# connection is checked on checkout (one cheap round trip) and dead ones are replaced.
MAX_IDLE_SECONDS = 240

LEDGER_COLUMNS = """
    p.id, p.ticker, p.as_of, p.model_version, p.p_outperform, p.lean, p.confidence, p.reason,
    p.published_at, o.outcome_date, o.stock_return, o.index_return, o.excess_return,
    o.beat_index, o.hit
"""


def _read_only(conn) -> None:
    conn.execute("SET default_transaction_read_only = on")


class Repository:
    def __init__(self, url: str):
        self.pool = ConnectionPool(
            url, min_size=1, max_size=5, open=False, configure=_read_only,
            kwargs={"autocommit": True, "row_factory": dict_row}, max_idle=MAX_IDLE_SECONDS,
            check=ConnectionPool.check_connection,
        )
        self._cache: dict[str, tuple[float, list[dict]]] = {}

    def open(self) -> None:
        self.pool.open()

    def close(self) -> None:
        self.pool.close()

    def _all(self, sql: str, params: tuple | dict = ()) -> list[dict]:
        key = sql + json.dumps(params, default=str)
        hit = self._cache.get(key)
        if hit and time.monotonic() - hit[0] < CACHE_SECONDS:
            return hit[1]
        try:
            rows = self._query(sql, params)
        except psycopg.OperationalError:
            # Neon closes connections when its compute sleeps, and the pool keeps one connection
            # open, so the first query after a quiet spell can hit a dead connection. The pool
            # discards broken connections, so one retry gets a fresh one.
            rows = self._query(sql, params)
        self._cache[key] = (time.monotonic(), rows)
        return rows

    def _query(self, sql: str, params: tuple | dict) -> list[dict]:
        with self.pool.connection() as conn:
            return conn.execute(sql, params).fetchall()

    def latest_calls(self) -> list[dict]:
        return self._all("""
            SELECT ticker, as_of, model_version, p_outperform, lean, confidence, reason, factors,
                   published_at
            FROM predictions WHERE as_of = (SELECT max(as_of) FROM predictions)
        """)

    def ledger(self, ticker: str | None = None, limit: int | None = None, offset: int = 0) -> pd.DataFrame:
        rows = self._all(
            f"""
            SELECT {LEDGER_COLUMNS} FROM predictions p
            LEFT JOIN outcomes o ON o.prediction_id = p.id
            WHERE %(ticker)s::text IS NULL OR p.ticker = %(ticker)s
            ORDER BY p.as_of DESC, p.ticker
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            {"ticker": ticker, "limit": limit, "offset": offset},
        )
        return pd.DataFrame(rows, columns=[c.strip().split(".")[1] for c in LEDGER_COLUMNS.split(",")])

    def open_calls(self) -> list[dict]:
        """Bullish and bearish calls whose 5 sessions haven't been scored yet, newest first."""
        return self._all("""
            SELECT p.id, p.ticker, p.as_of, p.lean, p.confidence, p.p_outperform
            FROM predictions p LEFT JOIN outcomes o ON o.prediction_id = p.id
            WHERE o.prediction_id IS NULL AND p.lean <> 'no_call'
            ORDER BY p.as_of DESC, p.ticker
        """)

    def market_prices(self, since: date, tickers: list[str] | None = None) -> pd.DataFrame:
        """Daily high, low, close and volume from `since`, for all tickers or just `tickers`."""
        rows = self._all(
            "SELECT ticker, date, high, low, close, volume FROM prices"
            " WHERE date >= %(since)s AND (%(tickers)s::text[] IS NULL OR ticker = ANY(%(tickers)s))"
            " ORDER BY ticker, date",
            {"since": since, "tickers": tickers},
        )
        prices = pd.DataFrame(rows, columns=["ticker", "date", "high", "low", "close", "volume"])
        prices["date"] = pd.to_datetime(prices["date"])
        return prices

    def sim_prices(self) -> pd.DataFrame:
        """Every stored day's open, close and volume, for the practice simulator."""
        rows = self._all("SELECT ticker, date, open, close, volume FROM prices ORDER BY date")
        return pd.DataFrame(rows, columns=["ticker", "date", "open", "close", "volume"])

    def closes_since(self, since: date) -> pd.DataFrame:
        """Closing prices for every stock and the benchmark from `since` onwards."""
        rows = self._all("SELECT ticker, date, close FROM prices WHERE date >= %s ORDER BY ticker, date", (since,))
        prices = pd.DataFrame(rows, columns=["ticker", "date", "close"])
        prices["date"] = pd.to_datetime(prices["date"])
        return prices

    def ledger_count(self, ticker: str | None = None) -> int:
        row = self._all(
            "SELECT count(*) AS n FROM predictions WHERE %(ticker)s::text IS NULL OR ticker = %(ticker)s",
            {"ticker": ticker},
        )
        return row[0]["n"]

    def prices(self, ticker: str, since: date) -> list[dict]:
        return self._all(
            "SELECT date, open, high, low, close, volume FROM prices"
            " WHERE ticker = %s AND date >= %s ORDER BY date",
            (ticker, since),
        )

    def active_model(self) -> dict | None:
        rows = self._all(
            "SELECT version, kind, trained_through, created_at, metrics FROM model_versions WHERE is_active"
        )
        return rows[0] if rows else None

    def backtest(self, ticker: str) -> pd.DataFrame:
        rows = self._all(
            "SELECT date, p_outperform, lean, confidence, beat_index, excess_return"
            " FROM backtest_predictions WHERE ticker = %s ORDER BY date",
            (ticker,),
        )
        return pd.DataFrame(
            rows, columns=["date", "p_outperform", "lean", "confidence", "beat_index", "excess_return"]
        )

    def closes_on(self, day: date) -> dict[str, tuple[float, float | None]]:
        """Each stock's close on `day` and its change from the previous session."""
        rows = self._all(
            """
            SELECT ticker, close, close / prev - 1 AS change FROM (
                SELECT ticker, date, close, lag(close) OVER (PARTITION BY ticker ORDER BY date) AS prev
                FROM prices WHERE date BETWEEN %(day)s::date - 14 AND %(day)s
            ) p WHERE date = %(day)s
            """,
            {"day": day},
        )
        return {r["ticker"]: (r["close"], r["change"]) for r in rows}

    def backtest_recent(self, days: int = 14) -> list[dict]:
        """Bullish and bearish testing calls from the last `days` calendar days of the backtest."""
        return self._all("""
            SELECT date, ticker, lean, confidence, excess_return,
                   (lean = 'bullish') = beat_index AS hit
            FROM backtest_predictions
            WHERE lean <> 'no_call' AND date > (SELECT max(date) FROM backtest_predictions) - %s
            ORDER BY date DESC, abs(p_outperform - 0.5) DESC
        """, (days,))

    def news(self, lang: str, ticker: str | None, limit: int) -> list[dict]:
        """Headlines from the past 3 days, newest first, for one stock or all of them."""
        return self._all("""
            SELECT ticker, title, source, url, published_at FROM news
            WHERE lang = %(lang)s AND published_at > now() - interval '3 days'
              AND (%(ticker)s::text IS NULL OR ticker = %(ticker)s)
            ORDER BY published_at DESC LIMIT %(limit)s
        """, {"lang": lang, "ticker": ticker, "limit": limit})

    def backtest_by_ticker(self) -> list[dict]:
        """Simulated hit rate per stock, over bullish/bearish calls only.

        Calls on the same stock in the same week share most of their 5-day price move, so
        `n_weeks` (weeks with at least one call) is the number of roughly independent results.
        """
        return self._all("""
            SELECT ticker,
                   count(*) AS n_calls,
                   count(DISTINCT (date - DATE '2000-01-03') / 7) AS n_weeks,
                   avg(CASE WHEN (lean = 'bullish') = beat_index THEN 1.0 ELSE 0.0 END) AS hit_rate
            FROM backtest_predictions WHERE lean <> 'no_call'
            GROUP BY ticker
        """)

    def recent_runs(self, limit: int = 10) -> list[dict]:
        return self._all(
            "SELECT job, started_at, status, detail FROM job_runs ORDER BY id DESC LIMIT %s", (limit,)
        )
