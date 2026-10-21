from datetime import date, datetime, timedelta, timezone

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.main import app

TODAY = datetime.now(timezone.utc).date()
DAY1, DAY2 = TODAY - timedelta(days=8), TODAY - timedelta(days=1)
PUBLISHED = datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc)


def call(id_, ticker, as_of, lean, p, outcome=None):
    row = {
        "id": id_, "ticker": ticker, "as_of": as_of, "model_version": "lightgbm-test",
        "p_outperform": p, "lean": lean, "confidence": "Slight edge" if lean != "no_call" else "No edge",
        "reason": f"{lean} reason", "published_at": PUBLISHED,
        "factors": [{"feature": "ret_5d", "value": 0.02, "contribution": 0.1,
                     "pushes": "towards outperforming", "text": "it's up 2.0% over the past week"}],
        "outcome_date": None, "stock_return": None, "index_return": None, "excess_return": None,
        "beat_index": None, "hit": None,
    }
    if outcome is not None:
        beat = outcome > 0
        row.update(outcome_date=as_of + timedelta(days=7), stock_return=outcome, index_return=0.0,
                   excess_return=outcome, beat_index=beat,
                   hit=None if lean == "no_call" else (lean == "bullish") == beat)
    return row


CALLS = [
    # Day 1: scored. Bullish INFY beat the index (hit), bullish TCS lagged (miss), no call on ITC.
    call(1, "INFY.NS", DAY1, "bullish", 0.53, outcome=0.02),
    call(2, "TCS.NS", DAY1, "bullish", 0.54, outcome=-0.01),
    call(3, "ITC.NS", DAY1, "no_call", 0.50, outcome=0.01),
    # Day 2: not scored yet.
    call(4, "INFY.NS", DAY2, "bearish", 0.46),
    call(5, "TCS.NS", DAY2, "bullish", 0.58),
    call(6, "ITC.NS", DAY2, "no_call", 0.505),
]

SIM_SUMMARY = {
    "n_calls": 100, "coverage": 0.2, "hit_rate": 0.51, "n_bullish": 50, "bullish_hit_rate": 0.5,
    "n_bearish": 50, "bearish_hit_rate": 0.52, "avg_excess_after_bullish": 0.002,
    "avg_excess_after_bearish": 0.0005, "period": ["2019-01-02", "2026-10-12"],
    "by_confidence": {"Slight edge": {"n_calls": 60, "hit_rate": 0.505}},
}


class FakeRepository:
    def __init__(self, calls):
        self.calls = calls

    def close(self):
        pass

    def latest_calls(self):
        if not self.calls:
            return []
        latest = max(c["as_of"] for c in self.calls)
        return [{k: c[k] for k in ("ticker", "as_of", "model_version", "p_outperform", "lean",
                                   "confidence", "reason", "factors", "published_at")}
                for c in self.calls if c["as_of"] == latest]

    def ledger(self, ticker=None, limit=None, offset=0):
        rows = [{k: v for k, v in c.items() if k != "factors"} for c in self.calls
                if ticker is None or c["ticker"] == ticker]
        rows.sort(key=lambda r: (r["as_of"], r["ticker"]), reverse=True)
        end = None if limit is None else offset + limit
        return pd.DataFrame(rows[offset:end])

    def ledger_count(self, ticker=None):
        return len(self.ledger(ticker))

    def prices(self, ticker, since):
        return [{"date": DAY2, "open": 100.123, "high": 101.0, "low": 99.0, "close": 100.456, "volume": 1e6}]

    def active_model(self):
        return {"version": "lightgbm-test", "kind": "lightgbm", "trained_through": date(2026, 10, 12),
                "created_at": PUBLISHED, "metrics": {"models": {"lightgbm": SIM_SUMMARY}}}

    def backtest(self, ticker):
        return pd.DataFrame([
            {"date": DAY1, "p_outperform": 0.55, "lean": "bullish", "confidence": "Stronger edge",
             "beat_index": True, "excess_return": 0.01},
            {"date": DAY2, "p_outperform": 0.50, "lean": "no_call", "confidence": "No edge",
             "beat_index": False, "excess_return": -0.01},
        ])

    def closes_on(self, day):
        return {"TCS.NS": (3100.5, -0.012)} if day == DAY2 else {}

    def backtest_by_ticker(self):
        return [{"ticker": "INFY.NS", "n_calls": 300, "hit_rate": 0.53},
                {"ticker": "TCS.NS", "n_calls": 340, "hit_rate": 0.471}]

    def recent_runs(self, limit=10):
        return [{"job": "daily", "started_at": PUBLISHED, "status": "ok", "detail": "published"}][:limit]


@pytest.fixture
def client():
    app.state.repo = FakeRepository(CALLS)
    with TestClient(app) as c:
        yield c
    del app.state.repo


def test_today_shows_latest_calls_most_confident_first(client):
    body = client.get("/api/today").json()
    assert body["as_of"] == str(DAY2)
    assert [s["symbol"] for s in body["signals"]] == ["TCS", "INFY", "ITC"]
    assert body["signals"][0]["name"] == "Tata Consultancy Services"
    assert body["signals"][0]["lean_label"] == "Bullish lean"
    assert body["signals"][0]["close"] == 3100.5 and body["signals"][0]["change_1d"] == -0.012
    assert body["signals"][1]["close"] is None  # missing price data is shown as unknown
    assert body["status"]["stale"] is False
    assert body["scoreboard"]["live_published"] == 6
    assert body["scoreboard"]["live_scored"] == 3
    assert body["scoreboard"]["live_days"] == 2


def test_every_call_carries_its_receipt(client):
    signals = {s["symbol"]: s for s in client.get("/api/today").json()["signals"]}
    tcs, infy, itc = signals["TCS"]["receipt"], signals["INFY"]["receipt"], signals["ITC"]["receipt"]

    assert tcs["band_hit_rate"] == 0.505 and tcs["band_n_calls"] == 60
    assert tcs["stock_hit_rate"] == 0.471 and tcs["stock_below_coin_flip"] is True
    assert infy["stock_below_coin_flip"] is False
    # A band or stock with no simulated history gets an empty receipt, not an error.
    assert itc["band_hit_rate"] is None and itc["stock_hit_rate"] is None
    assert itc["stock_below_coin_flip"] is False


def test_scoreboard_uses_only_scored_calls(client):
    live = client.get("/api/today").json()["scoreboard"]["live"]
    assert live["n_calls"] == 2  # the two scored bullish calls; no-calls and pending calls excluded
    assert live["hit_rate"] == 0.5
    assert live["bearish_hit_rate"] is None  # no scored bearish calls: null, not NaN


def test_track_record_keeps_live_and_simulated_apart(client):
    body = client.get("/api/track-record").json()
    assert body["n_pending"] == 3
    assert body["live_since"] == str(DAY1)
    assert body["live"]["n_calls"] == 2
    assert body["live_calibration"] is None  # too few outcomes to show calibration
    assert body["simulated"]["models"]["lightgbm"]["hit_rate"] == 0.51


def test_stock_page_accepts_plain_symbols(client):
    body = client.get("/api/stocks/infy").json()
    assert body["stock"]["ticker"] == "INFY.NS"
    assert body["latest"]["lean"] == "bearish"
    assert body["prices"][0]["close"] == 100.46
    assert [c["id"] for c in body["live_calls"]] == [4, 1]
    assert len(body["simulated_calls"]) == 1  # "No call" days aren't chart markers
    assert body["simulated_stats"]["n_calls"] == 1
    assert body["simulated_past_year_stats"]["hit_rate"] == 1.0
    assert client.get("/api/stocks/NOPE").status_code == 404


def test_ledger_pagination_and_csv(client):
    page = client.get("/api/ledger", params={"limit": 2, "offset": 1}).json()
    assert page["total"] == 6
    assert len(page["rows"]) == 2

    csv = client.get("/api/ledger.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    assert csv.text.splitlines()[0].startswith("id,ticker,as_of")
    assert len(csv.text.splitlines()) == 7


def test_empty_ledger_is_a_valid_state(client):
    app.state.repo.calls = []
    body = client.get("/api/today").json()
    assert body["signals"] == []
    assert body["scoreboard"]["live"] is None
    assert body["scoreboard"]["simulated"]["hit_rate"] == 0.51
    assert body["status"]["stale"] is True


def test_responses_are_cacheable(client):
    assert client.get("/api/model").headers["cache-control"] == "public, max-age=300"
