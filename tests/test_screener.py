import numpy as np
import pandas as pd
import pytest

from api.screener import stock_rows, what_happened_next
from jobs import daily
from ml import config


def frame(closes: dict[str, list[float]], volumes: dict[str, list[float]] | None = None) -> pd.DataFrame:
    days = pd.bdate_range("2026-01-01", periods=len(next(iter(closes.values()))))
    rows = []
    for t, cs in closes.items():
        vs = (volumes or {}).get(t, [1000.0] * len(cs))
        rows += [{"ticker": t, "date": d, "high": c * 1.01, "low": c * 0.99, "close": c, "volume": v}
                 for d, c, v in zip(days, cs, vs)]
    return pd.DataFrame(rows)


def test_stock_rows_measure_moves_value_and_unusual_volume():
    n = 30
    prices = frame(
        {"TCS.NS": [100.0] * (n - 1) + [110.0], "INFY.NS": [50.0] * n, "ADANIENT.NS": [10.0] * n, config.BENCHMARK: [1.0] * n},
        {"TCS.NS": [1000.0] * (n - 1) + [3000.0]},
    )
    rows = {r["ticker"]: r for r in stock_rows(prices, prices["date"].max())}
    tcs = rows["TCS.NS"]
    assert tcs["change_1d"] == pytest.approx(0.10)
    assert tcs["value_traded"] == pytest.approx(110.0 * 3000)
    assert tcs["volume_ratio"] == pytest.approx(3.0)  # three times its usual volume
    assert tcs["pos_52w"] == pytest.approx((110 - 99) / (111.1 - 99))
    # Peers are Parakh's 20 only: TCS +10% and INFY 0% average 5%. ADANIENT isn't covered.
    assert tcs["vs_peers_5d"] == pytest.approx(0.05)
    assert rows["ADANIENT.NS"]["vs_peers_5d"] is None


def test_stock_rows_skip_stocks_without_a_close_on_the_index_date():
    prices = frame({"TCS.NS": [100.0] * 30, config.BENCHMARK: [1.0] * 30})
    as_of = prices["date"].max() + pd.offsets.BDay(1)  # a day the stock hasn't closed yet
    assert stock_rows(prices, as_of) == []


def test_what_happened_next_counts_each_week_once():
    # Ten stocks whose weekly moves flip sign every week: last week's winners always lag next week,
    # and last week's losers always beat the (flat) index.
    n, tickers = 60, config.TICKERS[:10]
    days = np.arange(n)
    closes = {}
    for k, t in enumerate(tickers):
        weekly = (k - 4.5) * 0.01 * np.where(days // 5 % 2 == 0, 1, -1)
        closes[t] = list(100 * np.cumprod((1 + weekly) ** (1 / 5)))
    closes[config.BENCHMARK] = [100.0] * n
    result = what_happened_next(frame(closes))
    assert result["weeks"] == len(range(5, n - 5, 5))
    assert result["gainers_lagged"] == 1.0 and result["losers_beat"] == 1.0


def test_extra_prices_failure_never_blocks_the_daily_run(monkeypatch):
    class Conn:
        def transaction(self):
            class Savepoint:
                def __enter__(self): return self
                def __exit__(self, *exc): return False  # re-raise, as psycopg does after rolling back
            return Savepoint()

    def boom(refresh=False):
        raise RuntimeError("Yahoo is down")

    monkeypatch.setattr(daily, "load_extra_prices", boom)
    detail = daily.store_extra_prices(Conn(), pd.Timestamp("2026-10-22 18:00", tz="Asia/Kolkata"))
    assert "extra prices failed" in detail and "Yahoo is down" in detail
