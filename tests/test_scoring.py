from datetime import datetime

import numpy as np
import pandas as pd

from ledger.scoring import IST, can_publish, complete_sessions, progress, publish_deadline, score
from ml.features import build_features
from ml.labels import add_labels


def test_partial_session_is_dropped_until_close_settles(prices):
    last = prices["date"].max()
    during_market = datetime.combine(last.date(), datetime.min.time().replace(hour=14), tzinfo=IST)
    after_close = during_market.replace(hour=18)

    assert complete_sessions(prices, during_market)["date"].max() < last
    assert complete_sessions(prices, after_close)["date"].max() == last


def test_publish_window_closes_at_next_open():
    friday = pd.Timestamp("2026-10-16").date()
    assert publish_deadline(friday) == datetime(2026, 10, 19, 9, 15, tzinfo=IST)  # Monday open
    assert can_publish(friday, datetime(2026, 10, 18, 20, 0, tzinfo=IST))
    assert not can_publish(friday, datetime(2026, 10, 19, 9, 30, tzinfo=IST))


def test_live_scoring_matches_training_label(prices):
    """A live outcome must be computed exactly like the label the model was trained on."""
    labelled = add_labels(build_features(prices), prices, horizon=5).dropna(subset=["label"])
    sample = labelled.sample(20, random_state=0)
    pending = pd.DataFrame({
        "id": range(len(sample)),
        "ticker": sample["ticker"].to_numpy(),
        "as_of": sample["date"].dt.date.to_numpy(),
        "lean": ["bullish", "bearish"] * 10,
    })

    outcomes = score(pending, prices, horizon=5).set_index("prediction_id")
    assert len(outcomes) == len(sample)
    assert np.allclose(outcomes["excess_return"], sample["excess_return"])
    assert (outcomes["beat_index"].to_numpy() == (sample["label"] == 1).to_numpy()).all()

    expected_hit = np.where(pending["lean"] == "bullish", outcomes["beat_index"], ~outcomes["beat_index"])
    assert (outcomes["hit"].to_numpy() == expected_hit).all()


def test_recent_predictions_are_not_scored_yet(prices):
    last_date = prices["date"].max().date()
    pending = pd.DataFrame({"id": [1], "ticker": ["AAA.NS"], "as_of": [last_date], "lean": ["bullish"]})
    assert score(pending, prices).empty


def test_no_call_has_no_hit(prices):
    as_of = np.sort(prices["date"].unique())[100]
    pending = pd.DataFrame({"id": [1], "ticker": ["AAA.NS"], "as_of": [pd.Timestamp(as_of).date()],
                            "lean": ["no_call"]})
    assert score(pending, prices).iloc[0]["hit"] is None


def test_progress_ends_where_scoring_starts(prices):
    """A call's day-5 progress must equal the outcome it is scored with."""
    as_of = prices["date"].drop_duplicates().sort_values().iloc[-20]
    calls = pd.DataFrame({"id": [1, 2], "ticker": ["AAA.NS", "BBB.NS"], "as_of": [as_of.date()] * 2,
                          "lean": ["bullish", "bearish"]})
    paths = progress(calls, prices)
    outcomes = score(calls, prices).set_index("prediction_id")
    for call_id, path in paths.items():
        assert len(path) == 5
        assert path[-1]["excess_return"] == outcomes.loc[call_id, "excess_return"]
        assert path[-1]["date"] == outcomes.loc[call_id, "outcome_date"]


def test_progress_is_empty_before_the_first_session(prices):
    last = prices["date"].max()
    paths = progress(pd.DataFrame({"id": [1], "ticker": ["AAA.NS"], "as_of": [last.date()]}), prices)
    assert paths == {1: []}
