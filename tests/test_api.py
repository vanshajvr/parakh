from datetime import date, datetime, timedelta, timezone

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.main import app, no_call_details

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

    def open_calls(self):
        return [{k: c[k] for k in ("id", "ticker", "as_of", "lean", "confidence", "p_outperform")}
                for c in self.calls if c["beat_index"] is None and c["lean"] != "no_call"]

    def market_prices(self, since, tickers=None):
        days = pd.bdate_range(end=pd.Timestamp(TODAY), periods=25)
        rows = []
        for t, base in {"TCS.NS": 100.0, "ADANIENT.NS": 50.0, "^NSEI": 1000.0}.items():
            if tickers is not None and t not in tickers:
                continue
            rows += [{"ticker": t, "date": d, "high": base * 1.01, "low": base * 0.99,
                      "close": base * (1.1 if i == 24 and t == "TCS.NS" else 1.0), "volume": 1000.0}
                     for i, d in enumerate(days)]
        return pd.DataFrame(rows)

    def backtest_recent(self, days=14):
        return [{"date": DAY2, "ticker": "TCS.NS", "lean": "bearish", "confidence": "Slight edge",
                 "excess_return": -0.012, "hit": True}]

    def closes_since(self, since):
        # Two sessions after DAY2: TCS +3% then +1%, INFY -1% then -2%, the index +1% then +1%.
        days = pd.to_datetime([DAY2, DAY2 + timedelta(days=1), DAY2 + timedelta(days=2)])
        closes = {"TCS.NS": [100, 103, 104], "INFY.NS": [100, 99, 98], "^NSEI": [100, 101, 102]}
        return pd.DataFrame([{"ticker": t, "date": d, "close": c}
                             for t, cs in closes.items() for d, c in zip(days, cs)])

    def news(self, lang, ticker, limit):
        rows = [
            {"ticker": "TCS.NS", "lang": "en", "title": "TCS declares dividend", "source": "Mint",
             "url": "https://news.example/tcs", "published_at": PUBLISHED},
            {"ticker": "INFY.NS", "lang": "hi", "title": "इंफोसिस का मुनाफा बढ़ा", "source": "Hindustan",
             "url": "https://news.example/infy", "published_at": PUBLISHED},
        ]
        return [r for r in rows if r["lang"] == lang and ticker in (None, r["ticker"])][:limit]

    def sim_prices(self):
        days = pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-05"])
        rows = []
        for t in ["TCS.NS", "INFY.NS", "^NSEI", "NIFTYBEES.NS"]:
            for i, d in enumerate(days):
                # 1 Jan is a holiday placeholder: flat prices and no volume for everyone.
                rows.append({"ticker": t, "date": d, "open": 100.0 + i, "close": 101.0 + i, "volume": 0 if i == 0 else 1000})
        return pd.DataFrame(rows)

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
                "created_at": PUBLISHED, "metrics": {"models": {"lightgbm": SIM_SUMMARY},
                                                     "holdout": {"lightgbm": {"hit_rate": 0.488, "n_calls": 40, "period": ["2025-01-01", "2026-10-12"]}}}}

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
                {"ticker": "TCS.NS", "n_calls": 340, "n_weeks": 150, "hit_rate": 0.471}]

    def recent_runs(self, limit=10):
        return [{"job": "daily", "started_at": PUBLISHED, "status": "ok", "detail": "published"}][:limit]


@pytest.fixture
def client():
    app.state.repo = FakeRepository(CALLS)
    with TestClient(app) as c:
        yield c
    del app.state.repo


def test_today_lists_open_calls_with_progress_against_the_index(client):
    body = client.get("/api/today").json()
    calls = {c["symbol"]: c for c in body["open_calls"]}
    assert set(calls) == {"TCS", "INFY"}  # scored calls and "No call" aren't open
    tcs, infy = calls["TCS"], calls["INFY"]
    assert tcs["sessions_done"] == 2 and tcs["horizon"] == 5
    assert tcs["stock_return"] == pytest.approx(0.04) and tcs["index_return"] == pytest.approx(0.02)
    assert tcs["on_track"] is True  # bullish and beating the index
    assert infy["excess_return"] == pytest.approx(-0.04) and infy["on_track"] is True  # bearish and lagging
    assert [p["date"] for p in tcs["path"]] == [str(DAY2 + timedelta(days=1)), str(DAY2 + timedelta(days=2))]


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

    # Every call carries the record of all testing calls, not of its confidence label (D-032).
    assert tcs["band_hit_rate"] == 0.51 and tcs["band_n_calls"] == 100
    # The receipt says which years "in testing" covers, and how the unseen holdout went on its own.
    assert (tcs["tested_from"], tcs["tested_to"]) == (2019, 2026)
    assert tcs["holdout_hit_rate"] == 0.488 and (tcs["holdout_from"], tcs["holdout_to"]) == (2025, 2026)
    assert tcs["stock_hit_rate"] == 0.471 and tcs["stock_below_coin_flip"] is True
    # 150 independent weeks can't rule out 50%, so the stock isn't flagged as clearly worse.
    assert tcs["stock_hit_low"] < 0.471 < 0.5 < tcs["stock_hit_high"]
    assert tcs["stock_clearly_below"] is False
    assert infy["stock_below_coin_flip"] is False
    # A no-call, or a stock with no simulated history, gets an empty receipt, not an error.
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
    assert (body["live_published"], body["live_scored"], body["live_days"]) == (6, 3, 2)
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


def test_market_snapshot_reports_the_index_at_its_latest_close(client):
    app.state.repo.closes_since = lambda since: pd.DataFrame([
        {"ticker": "^NSEI", "date": pd.Timestamp(TODAY) - pd.Timedelta(days=6 - i), "close": c}
        for i, c in enumerate([100] * 6 + [101])
    ])
    market = client.get("/api/today").json()["market"]
    assert market["as_of"] == str(TODAY)
    assert market["index_close"] == 101
    assert market["index_change_1d"] == pytest.approx(0.01) and market["index_change_5d"] == pytest.approx(0.01)


def test_history_serves_every_stored_candle_for_stocks_and_the_index(client):
    expected = [{"date": str(DAY2), "open": 100.12, "high": 101.0, "low": 99.0, "close": 100.46, "volume": 1e6}]
    assert client.get("/api/history/NIFTY50").json() == expected
    assert client.get("/api/history/tcs").json() == expected
    assert client.get("/api/history/NOPE").status_code == 404


def test_screener_lists_every_member_with_coverage_marked(client):
    body = client.get("/api/screener").json()
    rows = {r["symbol"]: r for r in body["stocks"]}
    assert body["as_of"] == str(pd.bdate_range(end=pd.Timestamp(TODAY), periods=1)[0].date())
    assert rows["TCS"]["covered"] is True and rows["TCS"]["change_1d"] == pytest.approx(0.10)
    assert rows["TCS"]["sim_hit_rate"] == 0.471  # the testing record rides along for covered stocks
    assert rows["ADANIENT"]["covered"] is False and rows["ADANIENT"]["sector"] == "Metals & Mining"
    assert rows["ADANIENT"]["vs_peers_5d"] is None


def test_uncovered_member_has_a_stock_page_without_calls(client):
    body = client.get("/api/stocks/ADANIENT").json()
    assert body["stock"]["covered"] is False and body["latest"] is None


def test_today_includes_recent_testing_calls(client):
    recent = client.get("/api/today").json()["recent_simulated"]
    assert recent == [{"date": str(DAY2), "ticker": "TCS.NS", "symbol": "TCS", "lean": "bearish",
                       "confidence": "Slight edge", "excess_return": -0.012, "hit": True}]


def test_stocks_list_has_prices_and_testing_record(client):
    stocks = {s["symbol"]: s for s in client.get("/api/stocks").json()}
    tcs = stocks["TCS"]
    assert tcs["close"] == 104 and tcs["spark"] == [100, 103, 104]
    assert tcs["sim_hit_rate"] == 0.471 and tcs["sim_hit_low"] < 0.471 < tcs["sim_hit_high"]
    assert stocks["HDFCBANK"]["close"] is None  # no prices: shown as unknown


def test_empty_ledger_is_a_valid_state(client):
    app.state.repo.calls = []
    body = client.get("/api/today").json()
    assert body["signals"] == []
    assert body["scoreboard"]["live"] is None
    assert body["scoreboard"]["simulated"]["hit_rate"] == 0.51
    assert body["status"]["stale"] is True


def test_responses_are_cacheable(client):
    assert client.get("/api/model").headers["cache-control"] == "public, max-age=300"


def rule_row(ticker, lean, move):
    return {"ticker": ticker, "lean": lean, "factors": [{"feature": "ret_5d_vs_peers", "value": move}]}


def test_no_call_shows_where_calls_began_on_the_same_side():
    rows = [rule_row("TCS.NS", "bearish", 0.091), rule_row("INFY.NS", "bearish", 0.054),
            rule_row("NTPC.NS", "bullish", -0.038), rule_row("BHARTIARTL.NS", "no_call", 0.035),
            rule_row("TATASTEEL.NS", "no_call", -0.035)]
    details = no_call_details(rows)
    assert set(details) == {"BHARTIARTL.NS", "TATASTEEL.NS"}
    assert details["BHARTIARTL.NS"].calls_from == 0.054
    assert details["TATASTEEL.NS"].calls_from == -0.038


def test_no_call_detail_is_empty_without_a_single_rule_input():
    # A side with no calls has no line to show; a multi-factor model has no single line at all.
    assert no_call_details([rule_row("ITC.NS", "no_call", 0.01)])["ITC.NS"].calls_from is None
    assert no_call_details(CALLS) == {}


def test_news_is_filtered_by_language_and_stock(client):
    en = client.get("/api/news").json()
    assert [(n["symbol"], n["name"], n["source"]) for n in en] == [("TCS", "Tata Consultancy Services", "Mint")]
    assert client.get("/api/news?lang=hi").json()[0]["title"] == "इंफोसिस का मुनाफा बढ़ा"
    assert client.get("/api/news?symbol=INFY").json() == []
    assert client.get("/api/news?symbol=NOPE").status_code == 404
    assert client.get("/api/news?lang=fr").status_code == 422


def test_sim_prices_use_a_clean_calendar(monkeypatch):
    from api import main
    monkeypatch.setattr(main.config, "MARKET_TICKERS", ["TCS.NS", "INFY.NS"])
    main._sim_cache.clear()
    app.state.repo = FakeRepository(CALLS)
    with TestClient(app) as c:
        body = c.get("/api/sim/prices").json()
    del app.state.repo
    assert body["dates"] == ["2026-01-02", "2026-01-05"]
    tcs = next(s for s in body["stocks"] if s["symbol"] == "TCS")
    assert tcs["open"] == [101.0, 102.0] and tcs["close"] == [102.0, 103.0] and tcs["covered"] is True
    fund = next(s for s in body["stocks"] if s["symbol"] == body["index_fund"])
    assert fund["sector"] == "Index fund"
    # A member with no stored prices is listed with no prices rather than left out.
    assert next(s for s in body["stocks"] if s["symbol"] == "ITC")["close"] == [None, None]


def test_sim_prices_are_built_once_until_the_prices_change(monkeypatch):
    from api import main
    monkeypatch.setattr(main.config, "MARKET_TICKERS", ["TCS.NS", "INFY.NS"])
    main._sim_cache.clear()
    built = []
    real = main.sim_market
    monkeypatch.setattr(main, "sim_market", lambda prices: built.append(1) or real(prices))
    app.state.repo = FakeRepository(CALLS)
    with TestClient(app) as c:
        assert c.get("/api/sim/prices").status_code == c.get("/api/sim/prices").status_code == 200
    del app.state.repo
    assert len(built) == 1
