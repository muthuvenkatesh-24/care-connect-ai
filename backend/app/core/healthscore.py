"""Deterministic, rule-based wellness score (0-100).

IMPORTANT: This is a general wellness indicator computed from data the patient
recorded about themselves. It is NOT a medical assessment, NOT machine learning,
and NOT a diagnosis. Every rule is documented here in plain language so the
score is fully explainable. Missing data is marked incomplete; it is never
treated as a healthy value.

Input factors (7-day averages unless stated otherwise):
  sleep      hours per night, ideal 7-9            weight 0.20
  steps      steps per day, goal 8,000             weight 0.20
  heart_rate resting bpm, ideal near 70             weight 0.15
  exercise   active minutes/day, goal 30            weight 0.10
  water      glasses of water/day, goal 8           weight 0.10
  bmi        from profile height+weight (latest)    weight 0.15
  adherence  medication doses taken/missed (30d)    weight 0.10
"""

import statistics
from datetime import date, timedelta
from typing import Optional

WEIGHTS = {
    "sleep": 0.20,
    "steps": 0.20,
    "bmi": 0.15,
    "heart_rate": 0.15,
    "exercise": 0.10,
    "water": 0.10,
    "adherence": 0.10,
}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _sleep_score(hours: float) -> float:
    if 7 <= hours <= 9:
        return 100.0
    deviation = (7 - hours) if hours < 7 else (hours - 9)
    return clamp(100 - deviation * 12, 30, 100)


def _steps_score(steps: float) -> float:
    return clamp((steps / 8000) * 100, 0, 100)


def _heart_rate_score(bpm: float) -> float:
    return clamp(100 - abs(70 - bpm) * 1.5, 30, 100)


def _exercise_score(minutes: float) -> float:
    return clamp((minutes / 30) * 100, 0, 100)


def _water_score(glasses: float) -> float:
    return clamp((glasses / 8) * 100, 0, 100)


def _bmi_score(bmi: Optional[float]) -> Optional[float]:
    if bmi is None:
        return None
    if 18.5 <= bmi < 25:
        return 100.0
    if 25 <= bmi < 30:
        return 75.0
    if 30 <= bmi < 35:
        return 55.0
    if bmi < 18.5:
        return 70.0
    return 40.0


def _adherence_score(taken: int, missed: int) -> Optional[float]:
    total = taken + missed
    if total == 0:
        return None
    return (taken / total) * 100


def compute_bmi(height_cm: Optional[float], weight_kg: Optional[float]) -> Optional[float]:
    """BMI in kg/m^2; only when both values are valid and plausible."""
    if not height_cm or not weight_kg or height_cm < 50 or height_cm > 260 or weight_kg < 1 or weight_kg > 500:
        return None
    meters = height_cm / 100
    return round(weight_kg / (meters * meters), 1)


def bmi_category(bmi: Optional[float]) -> Optional[str]:
    if bmi is None:
        return None
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Healthy weight"
    if bmi < 30:
        return "Overweight"
    return "Obesity risk range"


def _factor(key: str, label: str, value: Optional[float], unit: str, detail: str,
            score: Optional[float]) -> dict:
    return {
        "key": key,
        "label": label,
        "value": value,
        "unit": unit,
        "score": round(score, 1) if score is not None else None,
        "status": ("good" if score >= 80 else "fair" if score >= 60 else "attention") if score is not None else "no data",
        "detail": detail,
        "weight": WEIGHTS[key],
        "suggestion": _suggestion(key, score),
    }


SUGGESTIONS = {
    "sleep": "Evening wind-down and a consistent bedtime support sleep quality.",
    "steps": "Short daily walks add up toward a more active routine.",
    "heart_rate": "Regular gentle activity can help resting heart rate over time.",
    "exercise": "Aim for a mix of movement you enjoy across the week.",
    "water": "Keeping water within reach makes steady intake easier.",
    "bmi": "Balanced meals and regular activity support overall wellness.",
    "adherence": "Pairing a medication with a daily routine can help consistency.",
}


def _suggestion(key: str, score: Optional[float]) -> Optional[str]:
    if score is None or score >= 85:
        return None
    return SUGGESTIONS.get(key)


def compute_score(
    *,
    today: date,
    logs: list[tuple[date, str, float]],  # (day, metric_type, value)
    height_cm: Optional[float],
    weight_kg: Optional[float],
    taken: int,
    missed: int,
) -> dict:
    """Compute factor scores and the weighted overall score from real recorded data only."""
    window = {today - timedelta(days=i) for i in range(7)}

    by_type: dict[str, list[float]] = {}
    for day, metric_type, value in logs:
        if day in window:
            by_type.setdefault(metric_type, []).append(value)

    def avg(metric_type: str) -> Optional[float]:
        values = by_type.get(metric_type)
        if not values:
            return None
        return statistics.fmean(values)

    sleep_score = _sleep_score(avg("sleep")) if avg("sleep") is not None else None
    steps_score = _steps_score(avg("steps")) if avg("steps") is not None else None
    heart_score = _heart_rate_score(avg("heart_rate")) if avg("heart_rate") is not None else None
    exercise_score = _exercise_score(avg("exercise")) if avg("exercise") is not None else None
    water_score = _water_score(avg("water")) if avg("water") is not None else None
    bmi = compute_bmi(height_cm, weight_kg)
    bmi_result = _bmi_score(bmi)
    adherence_score = _adherence_score(taken, missed)

    factors = [
        _factor("sleep", "Sleep", avg("sleep"), "h/night",
                "Average of your last 7 logged nights (goal 7-9h).", sleep_score),
        _factor("steps", "Steps", avg("steps"), "steps/day",
                "Average of your last 7 logged days (goal 8,000).", steps_score),
        _factor("heart_rate", "Resting heart rate", avg("heart_rate"), "bpm",
                "Your recent resting heart rate logs (near 70 shown as best).", heart_score),
        _factor("exercise", "Active minutes", avg("exercise"), "min/day",
                "Average of your last 7 logged days (goal 30).", exercise_score),
        _factor("water", "Water", avg("water"), "glasses/day",
                "Average of your last 7 logged days (goal about 8).", water_score),
        _factor("bmi", "BMI", bmi, "kg/m²",
                "Body-mass index from your saved height and weight.", bmi_result),
        _factor("adherence", "Medication adherence", _adherence_score(taken, missed), "%",
                "Logged doses taken vs missed in the last 30 days (no logs = no data).", adherence_score),
    ]

    scored = [(f["key"], f["score"]) for f in factors if f["score"] is not None]
    total_weight = sum(WEIGHTS[k] for k, _ in scored)
    if scored and total_weight > 0:
        overall = sum(score * WEIGHTS[k] for k, score in scored) / total_weight
        overall = round(overall, 1)
    else:
        overall = None

    present = len(scored)
    if present >= len(WEIGHTS) - 1:
        completeness = "complete"
    elif present >= 3:
        completeness = "partial"
    else:
        completeness = "insufficient"

    narrative = {
        "complete": "Your score combines all recorded wellness factors.",
        "partial": "Score based on the factors you have logged so far — missing factors are not counted as healthy.",
        "insufficient": "Too little data yet for a meaningful score. Log sleep, steps, or other metrics to build it.",
    }[completeness]

    return {
        "score": overall,
        "completeness": completeness,
        "narrative": narrative,
        "factors": factors,
        "disclaimer": "This score is a general wellness indicator based on the data you entered. "
                      "It is not machine learning, not a medical assessment, and not a diagnosis. "
                      "It does not replace advice from a qualified healthcare professional.",
        "rules_version": "1.0",
    }


def daily_scores(
    *,
    today: date,
    logs: list[tuple[date, str, float]],
    log_dates: set[date],
    height_cm: Optional[float],
    weight_kg: Optional[float],
    medication_logs: list[tuple[date, str]],  # (day, status)
) -> list[dict]:
    """Historical series over the days the patient actually logged data. Days without
    logs are skipped entirely — no invented history."""
    series: list[dict] = []
    for day in sorted(log_dates):
        result = compute_score(
            today=day,
            logs=logs,
            height_cm=height_cm,
            weight_kg=weight_kg,
            taken=sum(1 for d, s in medication_logs if d == day and s == "taken"),
            missed=sum(1 for d, s in medication_logs if d == day and s == "missed"),
        )
        if result["score"] is not None and result["completeness"] != "insufficient":
            series.append({"date": day.isoformat(), "score": result["score"]})
    return series
