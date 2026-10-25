import pandas as pd

from ml.data import drop_placeholders


def test_placeholder_rows_are_dropped_and_real_days_kept():
    df = pd.DataFrame({
        "open": [100.0, 101.0, 102.0], "high": [101.0, 101.0, 103.0], "low": [99.0, 101.0, 101.0],
        "close": [100.5, 101.0, 102.5], "volume": [5000.0, 0.0, 0.0],
    })
    # Row 1 is a holiday placeholder (flat prices, no volume). Row 2 has no volume, like the index
    # on Yahoo, but real prices, so it stays.
    assert drop_placeholders(df).index.tolist() == [0, 2]
