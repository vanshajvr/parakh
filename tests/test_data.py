import pandas as pd
import pytest

from ml import data
from ml.data import drop_placeholders


def test_placeholder_rows_are_dropped_and_real_days_kept():
    df = pd.DataFrame({
        "open": [100.0, 101.0, 102.0], "high": [101.0, 101.0, 103.0], "low": [99.0, 101.0, 101.0],
        "close": [100.5, 101.0, 102.5], "volume": [5000.0, 0.0, 0.0],
    })
    # Row 1 is a holiday placeholder (flat prices, no volume). Row 2 has no volume, like the index
    # on Yahoo, but real prices, so it stays.
    assert drop_placeholders(df).index.tolist() == [0, 2]


def _raw(tickers, empty=()):
    """A yf.download result for these tickers; the ones in `empty` have only NaN prices."""
    dates = pd.to_datetime(["2026-11-05", "2026-11-06"])
    columns = pd.MultiIndex.from_product([tickers, ["Open", "High", "Low", "Close", "Volume"]])
    raw = pd.DataFrame(index=dates, columns=columns, dtype=float)
    for t in tickers:
        if t not in empty:
            raw[t] = [[100.0, 102.0, 99.0, 101.0, 5000.0], [101.0, 103.0, 100.0, 102.0, 6000.0]]
    return raw


def test_an_empty_ticker_is_retried_on_its_own(monkeypatch):
    calls = []

    def fake_download(tickers, threads, **_):
        calls.append((list(tickers), threads))
        # First, parallel call: the index comes back empty, as on 9 Nov 2026.
        return _raw(tickers, empty={"^NSEI"} if threads else ())

    monkeypatch.setattr(data.yf, "download", fake_download)
    prices = data.download_prices(["TCS.NS", "^NSEI"])

    assert calls == [(["TCS.NS", "^NSEI"], True), (["^NSEI"], False)]
    assert sorted(prices["ticker"].unique()) == ["TCS.NS", "^NSEI"]


def test_a_ticker_still_empty_after_the_retry_fails_clearly(monkeypatch):
    monkeypatch.setattr(data.yf, "download", lambda tickers, **_: _raw(tickers, empty={"^NSEI"}))

    with pytest.raises(RuntimeError, match=r"No data returned for \^NSEI \(after a retry\)"):
        data.download_prices(["TCS.NS", "^NSEI"])
