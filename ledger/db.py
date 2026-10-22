"""Database access for the ledger (Neon Postgres via psycopg 3)."""

from __future__ import annotations

import io
import json
import os
from contextlib import contextmanager
from pathlib import Path
from typing import TYPE_CHECKING

import joblib
import pandas as pd
import psycopg
from dotenv import load_dotenv
from psycopg.types.json import Jsonb

if TYPE_CHECKING:  # the API imports this module and shouldn't load LightGBM
    from ml.model import SignalModel

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def database_url() -> str:
    """DATABASE_URL, checked without ever echoing it (job logs are public)."""
    load_dotenv()
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set (add it to .env or the environment)")
    if not url.startswith(("postgresql://", "postgres://")):
        raise RuntimeError("DATABASE_URL must start with postgresql:// (value not shown)")
    try:
        psycopg.conninfo.conninfo_to_dict(url)
    except psycopg.ProgrammingError:
        raise RuntimeError("DATABASE_URL is not a valid connection string (value not shown)") from None
    return url


@contextmanager
def connect():
    """A connection that commits on success and rolls back on error."""
    with psycopg.connect(database_url()) as conn:
        yield conn


def ensure_schema(conn) -> None:
    conn.execute(SCHEMA_PATH.read_text())


def log_run(conn, job: str, status: str, detail: str = "") -> None:
    conn.execute("INSERT INTO job_runs (job, status, detail) VALUES (%s, %s, %s)", (job, status, detail))


# --- Prices ---------------------------------------------------------------------------------

def upsert_prices(conn, prices: pd.DataFrame) -> None:
    """Bulk-load prices through a temp table, updating rows Yahoo has revised."""
    cols = ["ticker", "date", "open", "high", "low", "close", "volume"]
    # Safe to call more than once per transaction (the daily job loads two price sets).
    conn.execute("DROP TABLE IF EXISTS prices_in")
    conn.execute("CREATE TEMP TABLE prices_in (LIKE prices) ON COMMIT DROP")
    with conn.cursor().copy(f"COPY prices_in ({', '.join(cols)}) FROM STDIN") as copy:
        for row in prices[cols].itertuples(index=False):
            copy.write_row((row.ticker, row.date.date(), *map(float, row[2:])))
    conn.execute(f"""
        INSERT INTO prices ({', '.join(cols)}) SELECT {', '.join(cols)} FROM prices_in
        ON CONFLICT (ticker, date) DO UPDATE SET
            open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
            close = EXCLUDED.close, volume = EXCLUDED.volume
    """)


# --- Models ---------------------------------------------------------------------------------

def save_model_version(conn, model: SignalModel, version: str, metrics: dict) -> bool:
    """Store a model and make it the active one. Returns False if the version already existed.

    An existing version is never overwritten: published calls reference it, so its artifact must
    stay exactly what produced them.
    """
    buffer = io.BytesIO()
    joblib.dump(model, buffer)
    conn.execute("UPDATE model_versions SET is_active = FALSE WHERE is_active")
    cur = conn.execute(
        """
        INSERT INTO model_versions (version, kind, trained_through, metrics, artifact)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (version) DO NOTHING
        """,
        (version, model.kind, model.trained_through.date(),
         Jsonb(json.loads(json.dumps(metrics, default=float))), buffer.getvalue()),
    )
    conn.execute("UPDATE model_versions SET is_active = TRUE WHERE version = %s", (version,))
    return cur.rowcount == 1


def load_active_model(conn) -> tuple[str, SignalModel]:
    row = conn.execute("SELECT version, artifact FROM model_versions WHERE is_active").fetchone()
    if row is None:
        raise RuntimeError("No active model. Run `python -m jobs.retrain --publish` first.")
    return row[0], joblib.load(io.BytesIO(row[1]))


def replace_backtest(conn, oos: pd.DataFrame, version: str) -> None:
    conn.execute("DELETE FROM backtest_predictions")
    with conn.cursor().copy(
        "COPY backtest_predictions (ticker, date, model_version, p_outperform, lean, confidence,"
        " beat_index, excess_return) FROM STDIN"
    ) as copy:
        for r in oos.itertuples(index=False):
            copy.write_row((r.ticker, r.date.date(), version, float(r.p_up), r.lean, r.confidence,
                            bool(r.label == 1), float(r.excess_return)))


# --- Ledger ---------------------------------------------------------------------------------

def latest_as_of(conn):
    return conn.execute("SELECT max(as_of) FROM predictions").fetchone()[0]


def insert_predictions(conn, signals: list[dict]) -> int:
    """Publish calls. Existing (ticker, as_of) calls are never overwritten."""
    inserted = 0
    for s in signals:
        cur = conn.execute(
            """
            INSERT INTO predictions
                (ticker, as_of, model_version, p_outperform, lean, confidence, reason, factors)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (ticker, as_of) DO NOTHING
            """,
            (s["ticker"], s["date"], s["model_version"], s["p_outperform"], s["lean"],
             s["confidence"], s["reason"], Jsonb(s["factors"])),
        )
        inserted += cur.rowcount
    return inserted


def pending_predictions(conn) -> pd.DataFrame:
    rows = conn.execute("""
        SELECT p.id, p.ticker, p.as_of, p.lean FROM predictions p
        LEFT JOIN outcomes o ON o.prediction_id = p.id
        WHERE o.prediction_id IS NULL
    """).fetchall()
    return pd.DataFrame(rows, columns=["id", "ticker", "as_of", "lean"])


def insert_outcomes(conn, outcomes: pd.DataFrame) -> int:
    for o in outcomes.to_dict(orient="records"):
        conn.execute(
            """
            INSERT INTO outcomes (prediction_id, outcome_date, stock_return, index_return,
                                  excess_return, beat_index, hit)
            VALUES (%(prediction_id)s, %(outcome_date)s, %(stock_return)s, %(index_return)s,
                    %(excess_return)s, %(beat_index)s, %(hit)s)
            ON CONFLICT (prediction_id) DO NOTHING
            """,
            o,
        )
    return len(outcomes)
