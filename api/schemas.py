"""Response models. They double as the API contract the frontend is typed against (/docs)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

Lean = Literal["bullish", "bearish", "no_call"]


class Factor(BaseModel):
    feature: str
    value: float
    contribution: float
    pushes: str
    text: str


class Signal(BaseModel):
    ticker: str
    symbol: str
    name: str
    sector: str
    as_of: date
    lean: Lean
    lean_label: str
    confidence: str
    p_outperform: float
    reason: str
    factors: list[Factor]
    model_version: str
    published_at: datetime


class CallStats(BaseModel):
    n_calls: int
    coverage: float | None
    hit_rate: float | None
    n_bullish: int
    bullish_hit_rate: float | None
    n_bearish: int
    bearish_hit_rate: float | None
    avg_excess_after_bullish: float | None
    avg_excess_after_bearish: float | None


class Scoreboard(BaseModel):
    live: CallStats | None
    live_since: date | None
    simulated: CallStats | None
    simulated_period: list[date] | None
    coin_flip_hit_rate: float = 0.5


class DataStatus(BaseModel):
    latest_as_of: date | None
    stale: bool
    last_run_at: datetime | None
    last_run_status: str | None


class TodayResponse(BaseModel):
    as_of: date | None
    signals: list[Signal]
    scoreboard: Scoreboard
    status: DataStatus


class StockSummary(BaseModel):
    ticker: str
    symbol: str
    name: str
    sector: str
    lean: Lean | None
    confidence: str | None


class PricePoint(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float | None


class LedgerRow(BaseModel):
    id: int
    ticker: str
    symbol: str
    as_of: date
    lean: Lean
    confidence: str
    p_outperform: float
    reason: str
    model_version: str
    published_at: datetime
    outcome_date: date | None
    stock_return: float | None
    index_return: float | None
    excess_return: float | None
    beat_index: bool | None
    hit: bool | None


class SimulatedCall(BaseModel):
    date: date
    lean: Lean
    confidence: str
    p_outperform: float
    beat_index: bool
    excess_return: float


class StockDetail(BaseModel):
    stock: StockSummary
    latest: Signal | None
    prices: list[PricePoint]
    live_calls: list[LedgerRow]
    live_stats: CallStats | None
    simulated_calls: list[SimulatedCall]
    simulated_stats: CallStats | None


class LedgerPage(BaseModel):
    total: int
    limit: int
    offset: int
    rows: list[LedgerRow]


class TrackRecord(BaseModel):
    live: CallStats | None
    live_by_confidence: dict[str, CallStats]
    live_calibration: list[dict] | None
    live_since: date | None
    n_pending: int
    simulated: dict | None
    coin_flip_hit_rate: float = 0.5


class ModelInfo(BaseModel):
    version: str
    kind: str
    trained_through: date
    created_at: datetime
    horizon_days: int
    benchmark: str
    universe: list[StockSummary]
    features: dict[str, str]
    metrics: dict


class StatusResponse(BaseModel):
    status: DataStatus
    recent_runs: list[dict]
