from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import Role, require_roles
from app.core import healthscore
from app.db.session import get_db
from app.models.patient_data import HealthLog, Medication, MedicationLog
from app.models.patient_profile import PatientProfile
from app.schemas.patient_data import HealthLogIn, HealthLogOut

router = APIRouter(prefix="/patients/me", tags=["health logs"])

# Per-metric unit-aware bounds (upper limits + ranges lower than the generic >0 check).
BOUNDS = {
    "steps": (1, 200_000),
    "sleep": (0.1, 24),
    "heart_rate": (20, 250),
    "water": (0.1, 64),
    "exercise": (1, 1_200),
    "weight": (20, 700),
}


def _validate_metric(metric_type: str, value: float) -> None:
    low, high = BOUNDS[metric_type]
    if not (low <= value <= high):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Value for '{metric_type}' must be between {low} and {high}.",
        )


@router.get("/logs", response_model=list[HealthLogOut])
def list_my_logs(
    days: int = 30,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    if days < 1 or days > 365:
        raise HTTPException(status_code=422, detail="days must be between 1 and 365.")
    since = date.today() - timedelta(days=days)
    rows = db.scalars(
        select(HealthLog)
        .where(HealthLog.user_id == user.id, HealthLog.log_date >= since)
        .order_by(HealthLog.log_date.desc(), HealthLog.metric_type)
    ).all()
    return rows


@router.post("/logs", response_model=HealthLogOut, status_code=status.HTTP_201_CREATED)
def upsert_my_log(
    data: HealthLogIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    _validate_metric(data.metric_type, data.value)
    if data.log_date > date.today():
        raise HTTPException(status_code=422, detail="Log date cannot be in the future.")

    existing = db.scalar(
        select(HealthLog).where(
            HealthLog.user_id == user.id,
            HealthLog.log_date == data.log_date,
            HealthLog.metric_type == data.metric_type,
        )
    )
    if existing:
        # Re-logging the same metric for the same day updates the value (idempotent retry behavior).
        existing.value = data.value
        db.commit()
        db.refresh(existing)
        return existing

    log = HealthLog(user_id=user.id, **data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_log(
    log_id: int,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    log = db.scalar(select(HealthLog).where(HealthLog.id == log_id, HealthLog.user_id == user.id))
    if log is None:
        raise HTTPException(status_code=404, detail="Log entry not found.")
    db.delete(log)
    db.commit()
    return None


@router.get("/health-score")
def my_health_score(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    today = date.today()
    since = today - timedelta(days=30)

    logs = [
        (row.log_date, row.metric_type, row.value)
        for row in db.scalars(
            select(HealthLog).where(HealthLog.user_id == user.id, HealthLog.log_date >= since)
        ).all()
    ]
    log_dates = {day for day, metric_type, _ in logs}

    medication_logs = [
        (row.log_date, row.status)
        for row in db.scalars(
            select(MedicationLog.log_date, MedicationLog.status).where(
                MedicationLog.user_id == user.id, MedicationLog.log_date >= since
            )
        ).all()
    ]

    profile = db.get(PatientProfile, user.id)
    height_cm = profile.height_cm if profile else None
    weight_kg = profile.weight_kg if profile else None

    result = healthscore.compute_score(
        today=today,
        logs=logs,
        height_cm=height_cm,
        weight_kg=weight_kg,
        taken=sum(1 for _, s in medication_logs if s == "taken"),
        missed=sum(1 for _, s in medication_logs if s == "missed"),
    )
    bmi = healthscore.compute_bmi(height_cm, weight_kg)
    result["bmi"] = bmi
    result["bmi_category"] = healthscore.bmi_category(bmi)
    result["bmi_note"] = "BMI is a rough screening value from self-reported height and weight; it is not a body-fat measure."
    result["history"] = healthscore.daily_scores(
        today=today,
        logs=logs,
        log_dates=log_dates,
        height_cm=height_cm,
        weight_kg=weight_kg,
        medication_logs=medication_logs,
    )[-8:]
    return result
