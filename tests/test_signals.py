import pandas as pd

from ml.explain import phrase, reason
from ml.features import FEATURE_COLUMNS, FEATURE_INFO, MODEL_FEATURES
from ml.signals import confidence_band, lean_from_prob


def test_lean_respects_no_call_band():
    assert lean_from_prob(0.53, margin=0.02) == "bullish"
    assert lean_from_prob(0.51, margin=0.02) == "no_call"
    assert lean_from_prob(0.48, margin=0.02) == "bearish"


def test_confidence_band():
    assert confidence_band(0.56, margin=0.02) == "Slight edge"
    assert confidence_band(0.47, margin=0.02) == "Slight edge"
    assert confidence_band(0.50, margin=0.02) == "No edge"


def test_every_feature_has_a_description_and_phrase():
    explained = set(FEATURE_COLUMNS) | {f for fs in MODEL_FEATURES.values() for f in fs}
    assert set(FEATURE_INFO) == explained
    for f in explained:
        for value in (-0.5, 0.5, 50.0):
            assert phrase(f, value)


def test_reason_names_factors_pushing_in_the_call_direction():
    contrib = pd.Series(0.0, index=FEATURE_COLUMNS)
    contrib["ret_5d"], contrib["volume_z"], contrib["rsi_14"] = 0.3, 0.1, -0.4
    values = pd.Series(0.0, index=FEATURE_COLUMNS)
    values["ret_5d"], values["volume_z"], values["rsi_14"] = -0.04, 2.0, 25.0

    text = reason("bullish", contrib, values)
    assert "outperforming" in text
    assert "down 4.0% over the past week" in text
    assert "volume is unusually heavy" in text
    assert "RSI" not in text  # pushes the other way

    assert "No clear edge" in reason("no_call", contrib, values)
