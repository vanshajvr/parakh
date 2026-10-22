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

    def backtest_by_ticker(self) -> list[dict]:
        """Simulated hit rate per stock, over bullish/bearish calls only."""
        return self._all("""
            SELECT ticker,
                   count(*) AS n_calls,
                   avg(CASE WHEN (lean = 'bullish') = beat_index THEN 1.0 ELSE 0.0 END) AS hit_rate
            FROM backtest_predictions WHERE lean <> 'no_call'
            GROUP BY ticker
        """)

    def recent_runs(self, limit: int = 10) -> list[dict]:
        return self._all(
            "SELECT job, started_at, status, detail FROM job_runs ORDER BY id DESC LIMIT %s", (limit,)
        )
