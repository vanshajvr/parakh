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


class Receipt(BaseModel):
    """The track record shown next to a call: how this confidence level and this stock have done."""

    band_hit_rate: float | None
    band_n_calls: int
    stock_hit_rate: float | None
    stock_n_calls: int
    # 95% range for the stock's true hit rate, given how few independent results there are.
    stock_hit_low: float | None = None
    stock_hit_high: float | None = None
    stock_below_coin_flip: bool
    # True only when even the top of that range is below 50%.
    stock_clearly_below: bool = False


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
    receipt: Receipt
    close: float | None
    change_1d: float | None


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
    live_published: int
    live_scored: int
    live_days: int
    simulated: CallStats | None
    simulated_period: list[date] | None
    coin_flip_hit_rate: float = 0.5


class DataStatus(BaseModel):
    latest_as_of: date | None
    stale: bool
    last_run_at: datetime | None
    last_run_status: str | None


class ProgressPoint(BaseModel):
    date: date
    stock_return: float
    index_return: float
    excess_return: float


class OpenCall(BaseModel):
    """A published call still inside its 5 sessions. Provisional: only the final close scores it."""

    id: int
    ticker: str
    symbol: str
    name: str
    as_of: date
    lean: Lean
    lean_label: str
    confidence: str
    p_outperform: float
    sessions_done: int
    horizon: int
    # Since the close the call was based on, as of the latest close (None before the first session).
    stock_return: float | None
    index_return: float | None
    excess_return: float | None
    on_track: bool | None
    path: list[ProgressPoint]


class MarketStock(BaseModel):
    ticker: str
    symbol: str
    name: str
    close: float
    ret_5d: float
    # Last week's return minus the average of the 20 stocks: the reversal rule's only input.
    vs_peers_5d: float


class MarketSnapshot(BaseModel):
    """The latest close, whether or not calls have been published for it."""

    as_of: date
    index_close: float
    index_change_1d: float | None
    index_change_5d: float | None
    index_change_20d: float | None = None
    stocks: list[MarketStock]


class RecentSimulatedCall(BaseModel):
    date: date
    ticker: str
    symbol: str
    lean: Lean
    confidence: str
    excess_return: float
    hit: bool


class TodayResponse(BaseModel):
    as_of: date | None
    signals: list[Signal]
    open_calls: list[OpenCall] = []
    market: MarketSnapshot | None = None
    recent_simulated: list[RecentSimulatedCall] = []
    scoreboard: Scoreboard
    status: DataStatus


class StockSummary(BaseModel):
    ticker: str
    symbol: str
    name: str
    sector: str
    lean: Lean | None
    confidence: str | None
    # Filled in on the Stocks list only.
    close: float | None = None
    change_5d: float | None = None
    spark: list[float] = []
    sim_hit_rate: float | None = None
    sim_hit_low: float | None = None
    sim_hit_high: float | None = None
    sim_n_calls: int = 0


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
    simulated_past_year_stats: CallStats | None


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
    live_published: int
    live_scored: int
    live_days: int
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
