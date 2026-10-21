"""Parakh read-only API.

Run locally: uvicorn api.main:app --reload
"""

import io
import math
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta

import pandas as pd
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from api.repository import Repository
from ledger.db import database_url
from api.schemas import (
    CallStats, DataStatus, LedgerPage, LedgerRow, ModelInfo, PricePoint, Receipt, Scoreboard, Signal,
    SimulatedCall, StatusResponse, StockDetail, StockSummary, TodayResponse, TrackRecord,
)
from ledger.scoring import IST
from ml import config
from ml.features import FEATURE_INFO
from ml.metrics import calibration_table, call_stats
from ml.signals import LEAN_LABELS

# Weekend plus a holiday: older calls than this mean the daily job has stopped publishing.
STALE_AFTER_DAYS = 4
# Live calibration is meaningless on a handful of outcomes.
MIN_FOR_CALIBRATION = 200
PRICE_HISTORY_DAYS = 365


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv()
    if not hasattr(app.state, "repo"):
        app.state.repo = Repository(database_url())
        app.state.repo.open()
    yield
    app.state.repo.close()


app = FastAPI(
    title="Parakh API",
    description="Read-only access to the live ledger, the simulated record and the active model.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET"],
)


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    # Data changes once a day, so let browsers and CDNs reuse responses for a few minutes.
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200:
        response.headers.setdefault("Cache-Control", "public, max-age=300")
    return response


def get_repo(request: Request) -> Repository:
    return request.app.state.repo


# --- Helpers --------------------------------------------------------------------------------

def _clean(obj):
    """Replace NaN with None so responses are valid JSON."""
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return obj


def resolve_ticker(ticker: str) -> str:
    full = ticker.upper() if ticker.upper().endswith(".NS") else f"{ticker.upper()}.NS"
    if full not in config.STOCKS:
        raise HTTPException(404, f"Unknown ticker: {ticker}")
    return full


def stock_summary(ticker: str, call: dict | None = None) -> StockSummary:
    name, sector = config.STOCKS[ticker]
    return StockSummary(
        ticker=ticker, symbol=ticker.removesuffix(".NS"), name=name, sector=sector,
        lean=call["lean"] if call else None, confidence=call["confidence"] if call else None,
    )


def receipt_lookup(repo: Repository):
    """Build each call's receipt from the active model's metrics and per-stock simulated record."""
    model = repo.active_model()
    bands = model["metrics"]["models"][model["kind"]].get("by_confidence", {}) if model else {}
    stocks = {r["ticker"]: r for r in repo.backtest_by_ticker()}

    def receipt(ticker: str, confidence: str) -> Receipt:
        band, stock = bands.get(confidence, {}), stocks.get(ticker, {})
        stock_hit = float(stock["hit_rate"]) if stock.get("hit_rate") is not None else None
        return Receipt(
            band_hit_rate=_clean(band.get("hit_rate")),
            band_n_calls=band.get("n_calls", 0),
            stock_hit_rate=stock_hit,
            stock_n_calls=stock.get("n_calls", 0),
            stock_below_coin_flip=stock_hit is not None and stock_hit < 0.5,
        )

    return receipt


def to_signals(repo: Repository, rows: list[dict]) -> list[Signal]:
    """Published calls with display names, receipts and the closing price they were based on."""
    if not rows:
        return []
    receipt = receipt_lookup(repo)
    closes = repo.closes_on(rows[0]["as_of"])
    signals = []
    for row in rows:
        name, sector = config.STOCKS[row["ticker"]]
        close, change = closes.get(row["ticker"], (None, None))
        signals.append(Signal(
            **row, symbol=row["ticker"].removesuffix(".NS"), name=name, sector=sector,
            lean_label=LEAN_LABELS[row["lean"]], receipt=receipt(row["ticker"], row["confidence"]),
            close=close, change_1d=change,
        ))
    return signals


def to_ledger_rows(df: pd.DataFrame) -> list[LedgerRow]:
    records = df.astype(object).where(df.notna(), None).to_dict(orient="records")
    return [LedgerRow(**r, symbol=r["ticker"].removesuffix(".NS")) for r in records]


def scored_stats(rows: pd.DataFrame) -> CallStats | None:
    """Live stats over calls whose outcome is known, using the model card's definitions."""
    scored = rows[rows["beat_index"].notna()]
    if scored.empty:
        return None
    return CallStats(**_clean(call_stats(_as_metric_rows(scored))))


def _as_metric_rows(rows: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame({
        "lean": rows["lean"],
        "label": rows["beat_index"].astype(int),
        "excess_return": rows["excess_return"].astype(float),
        "p_up": rows["p_outperform"].astype(float),
        "confidence": rows["confidence"],
    })


def data_status(repo: Repository, latest_as_of: date | None) -> DataStatus:
    runs = repo.recent_runs(limit=1)
    today = datetime.now(IST).date()
    return DataStatus(
        latest_as_of=latest_as_of,
        stale=latest_as_of is None or (today - latest_as_of) > timedelta(days=STALE_AFTER_DAYS),
        last_run_at=runs[0]["started_at"] if runs else None,
        last_run_status=runs[0]["status"] if runs else None,
    )


def simulated_summary(model: dict | None) -> tuple[CallStats | None, list[date] | None]:
    if model is None:
        return None, None
    summary = model["metrics"]["models"][model["kind"]]
    return CallStats(**_clean(summary)), summary["period"]


# --- Routes ---------------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/today", response_model=TodayResponse)
def today(repo: Repository = Depends(get_repo)):
    """The latest published calls, most confident first, with the scoreboard."""
    calls = sorted(repo.latest_calls(), key=lambda c: -abs(c["p_outperform"] - 0.5))
    as_of = calls[0]["as_of"] if calls else None
    ledger = repo.ledger()
    simulated, period = simulated_summary(repo.active_model())
    return TodayResponse(
        as_of=as_of,
        signals=to_signals(repo, calls),
        scoreboard=Scoreboard(
            live=scored_stats(ledger) if not ledger.empty else None,
            live_since=ledger["as_of"].min() if not ledger.empty else None,
            live_published=len(ledger),
            live_scored=int(ledger["beat_index"].notna().sum()) if not ledger.empty else 0,
            live_days=ledger["as_of"].nunique() if not ledger.empty else 0,
            simulated=simulated,
            simulated_period=period,
        ),
        status=data_status(repo, as_of),
    )


@app.get("/api/stocks", response_model=list[StockSummary])
def stocks(repo: Repository = Depends(get_repo)):
    latest = {c["ticker"]: c for c in repo.latest_calls()}
    return [stock_summary(t, latest.get(t)) for t in config.TICKERS]


@app.get("/api/stocks/{ticker}", response_model=StockDetail)
def stock(ticker: str, repo: Repository = Depends(get_repo)):
    """Everything the stock page needs: chart, latest call, and both records for this stock."""
    ticker = resolve_ticker(ticker)
    latest = next((c for c in repo.latest_calls() if c["ticker"] == ticker), None)
    since = datetime.now(IST).date() - timedelta(days=PRICE_HISTORY_DAYS)
    live = repo.ledger(ticker=ticker)
    backtest = repo.backtest(ticker)
    recent_backtest = backtest[backtest["date"] >= since]

    def stats(rows: pd.DataFrame) -> CallStats | None:
        return CallStats(**_clean(call_stats(_as_metric_rows(rows)))) if not rows.empty else None

    return StockDetail(
        stock=stock_summary(ticker, latest),
        latest=to_signals(repo, [latest])[0] if latest else None,
        prices=[
            PricePoint(**{k: round(v, 2) if k in ("open", "high", "low", "close") else v for k, v in p.items()})
            for p in repo.prices(ticker, since)
        ],
        live_calls=to_ledger_rows(live),
        live_stats=scored_stats(live) if not live.empty else None,
        simulated_calls=[
            SimulatedCall(**r) for r in recent_backtest[recent_backtest["lean"] != "no_call"].to_dict("records")
        ],
        simulated_stats=stats(backtest),
        simulated_past_year_stats=stats(recent_backtest),
    )


@app.get("/api/track-record", response_model=TrackRecord)
def track_record(repo: Repository = Depends(get_repo)):
    """The live record (real, timestamped calls) next to the simulated one, never mixed."""
    ledger = repo.ledger()
    scored = ledger[ledger["beat_index"].notna()] if not ledger.empty else ledger
    model = repo.active_model()

    by_confidence, calibration = {}, None
    if not scored.empty:
        rows = _as_metric_rows(scored)
        calls = rows[rows["lean"] != "no_call"]
        by_confidence = {band: CallStats(**_clean(call_stats(g))) for band, g in calls.groupby("confidence")}
        if len(rows) >= MIN_FOR_CALIBRATION:
            calibration = _clean(calibration_table(rows).to_dict(orient="records"))

    return TrackRecord(
        live=scored_stats(ledger) if not ledger.empty else None,
        live_by_confidence=by_confidence,
        live_calibration=calibration,
        live_since=ledger["as_of"].min() if not ledger.empty else None,
        live_published=len(ledger),
        live_scored=len(scored),
        live_days=ledger["as_of"].nunique() if not ledger.empty else 0,
        n_pending=int(len(ledger) - len(scored)),
        simulated=_clean(model["metrics"]) if model else None,
    )


@app.get("/api/ledger", response_model=LedgerPage)
def ledger(
    ticker: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    repo: Repository = Depends(get_repo),
):
    """The full public ledger, newest first."""
    ticker = resolve_ticker(ticker) if ticker else None
    rows = repo.ledger(ticker=ticker, limit=limit, offset=offset)
    return LedgerPage(total=repo.ledger_count(ticker), limit=limit, offset=offset, rows=to_ledger_rows(rows))


@app.get("/api/ledger.csv")
def ledger_csv(repo: Repository = Depends(get_repo)):
    """Download every published call and its outcome, so anyone can check the numbers."""
    buffer = io.StringIO()
    repo.ledger().to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        buffer, media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=parakh-ledger.csv"},
    )


@app.get("/api/model", response_model=ModelInfo)
def model(repo: Repository = Depends(get_repo)):
    """The active model and its evaluation: the data behind the model card."""
    m = repo.active_model()
    if m is None:
        raise HTTPException(503, "No active model yet")
    return ModelInfo(
        version=m["version"], kind=m["kind"], trained_through=m["trained_through"],
        created_at=m["created_at"], horizon_days=config.HORIZON, benchmark=config.BENCHMARK,
        universe=[stock_summary(t) for t in config.TICKERS], features=FEATURE_INFO,
        metrics=_clean(m["metrics"]),
    )


@app.get("/api/status", response_model=StatusResponse)
def status(repo: Repository = Depends(get_repo)):
    """Data freshness, for the "data delayed" state, plus recent job runs."""
    latest = repo.latest_calls()
    return StatusResponse(
        status=data_status(repo, latest[0]["as_of"] if latest else None),
        recent_runs=repo.recent_runs(),
    )
