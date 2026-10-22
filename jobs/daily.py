"""Daily ledger job: refresh prices, score calls whose horizon has passed, publish the next calls.

Runs after the NSE close (GitHub Actions, ~18:00 IST on weekdays). Safe to re-run: calls and
outcomes are never written twice.

Usage: python -m jobs.daily
"""

from datetime import datetime

from ledger import db
from ledger.scoring import IST, can_publish, complete_sessions, publish_deadline, score
from ml.data import load_extra_prices, load_prices
from ml.features import build_features
from ml.predict import latest_signals


def store_extra_prices(conn, now: datetime) -> str:
    """Prices for the other NIFTY 50 members (movers and charts). Never blocks publishing calls."""
    try:
        # A savepoint, so a failure here rolls back cleanly instead of aborting the whole run.
        with conn.transaction():
            db.upsert_prices(conn, complete_sessions(load_extra_prices(refresh=True), now))
        return ""
    except Exception as exc:  # a failed download here must not cost a day of calls
        return f"; extra prices failed: {exc!r}"[:300]


def run(conn, now: datetime) -> str:
    prices = complete_sessions(load_prices(refresh=True), now)
    db.upsert_prices(conn, prices)
    extras = store_extra_prices(conn, now)

    scored = db.insert_outcomes(conn, score(db.pending_predictions(conn), prices))

    version, model = db.load_active_model(conn)
    signals = latest_signals(model, build_features(prices))
    as_of = datetime.strptime(signals[0]["date"], "%Y-%m-%d").date()
    last_published = db.latest_as_of(conn)

    if last_published is not None and as_of <= last_published:
        return f"scored {scored}; no new session since {last_published}{extras}"
    if not can_publish(as_of, now):
        # Publishing now would let the call see part of the next session. Leave a visible gap.
        return f"scored {scored}; missed publish window for {as_of} (deadline {publish_deadline(as_of)}){extras}"

    published = db.insert_predictions(conn, signals)
    calls = sum(s["lean"] != "no_call" for s in signals)
    return f"scored {scored}; published {published} rows for {as_of} ({calls} calls) with {version}{extras}"


def main() -> None:
    now = datetime.now(IST)
    with db.connect() as conn:
        db.ensure_schema(conn)
        conn.commit()
        try:
            detail = run(conn, now)
        except Exception as exc:
            conn.rollback()
            db.log_run(conn, "daily", "error", repr(exc))
            conn.commit()
            raise
        db.log_run(conn, "daily", "ok", detail)
    print(detail)


if __name__ == "__main__":
    main()
