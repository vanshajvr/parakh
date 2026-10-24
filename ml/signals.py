"""Turning a probability into what the user sees: a lean and a confidence band."""

LEAN_LABELS = {"bullish": "Bullish lean", "bearish": "Bearish lean", "no_call": "No call"}


def lean_from_prob(p_up: float, margin: float) -> str:
    """Bullish/bearish only when the probability is more than `margin` away from 50%."""
    if p_up >= 0.5 + margin:
        return "bullish"
    if p_up <= 0.5 - margin:
        return "bearish"
    return "no_call"


def confidence_band(p_up: float, margin: float) -> str:
    """'Slight edge' for every call. A more confident tier did no better in testing (decision D-032)."""
    return "Slight edge" if abs(p_up - 0.5) >= margin else "No edge"
