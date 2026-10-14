from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import Role, require_roles
from app.db.session import get_db
from app.models.patient_data import Medication, MedicationLog
from app.schemas.patient_data import (
    MedicationIn,
    MedicationLogIn,
    MedicationLogOut,
    MedicationOut,
    MedicationUpdate,
)

router = APIRouter(prefix="/patients/me", tags=["medications"])


def _parse_time(value: str | None) -> time | None:
    if value is None:
        return None
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def _get_own_medication(db: Session, user, medication_id: int) -> Medication:
    medication = db.scalar(
        select(Medication).where(
            Medication.id == medication_id,
            Medication.user_id == user.id,
        )
    )
    if medication is None:
        raise HTTPException(status_code=404, detail="Medication not found.")
    return medication


@router.get("/medications", response_model=list[MedicationOut])
def list_my_medications(
    include_inactive: bool = False,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    query = select(Medication).where(Medication.user_id == user.id)
    if not include_inactive:
        query = query.where(Medication.is_active.is_(True))
    rows = db.scalars(query.order_by(Medication.created_at)).all()
    return rows


@router.post("/medications", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def create_my_medication(
    data: MedicationIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    start, end = data.start_date, data.end_date
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="End date cannot be before the start date.")
    medication = Medication(
        user_id=user.id,
        name=data.name,
        dosage=data.dosage,
        instructions=data.instructions,
        schedule_time=_parse_time(data.schedule_time),
        start_date=start,
        end_date=end,
        is_active=True,
    )
    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


@router.patch("/medications/{medication_id}", response_model=MedicationOut)
def update_my_medication(
    medication_id: int,
    data: MedicationUpdate,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    medication = _get_own_medication(db, user, medication_id)
    payload = data.model_dump(exclude_unset=True)

    if "schedule_time" in payload:
        payload["schedule_time"] = _parse_time(payload["schedule_time"])
    for date_field in ("start_date", "end_date"):
        if payload.get(date_field) is None and date_field in payload:
            payload[date_field] = None

    start = payload.get("start_date", medication.start_date)
    end = payload.get("end_date", medication.end_date)
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="End date cannot be before the start date.")

    for key, value in payload.items():
        setattr(medication, key, value)
    db.commit()
    db.refresh(medication)
    return medication


@router.post(
    "/medications/{medication_id}/log",
    response_model=MedicationLogOut,
    status_code=status.HTTP_201_CREATED,
)
def log_my_medication(
    medication_id: int,
    data: MedicationLogIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    medication = _get_own_medication(db, user, medication_id)
    if not medication.is_active:
        raise HTTPException(status_code=409, detail="Adherence can only be logged for active medications.")
    if data.log_date > date.today():
        raise HTTPException(status_code=422, detail="Adherence date cannot be in the future.")

    existing = db.scalar(
        select(MedicationLog).where(
            MedicationLog.medication_id == medication.id,
            MedicationLog.log_date == data.log_date,
        )
    )
    if existing:
        if existing.status == data.status:
            return existing  # idempotent duplicate submission
        raise HTTPException(
            status_code=409,
            detail=f"A {existing.status} record already exists for this medication on {data.log_date}.",
        )

    entry = MedicationLog(
        medication_id=medication.id,
        user_id=user.id,
        log_date=data.log_date,
        status=data.status,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


class AdherenceOut(BaseModel):
    taken: int
    missed: int
    adherence_percent: float | None = None


@router.get("/medications/adherence", response_model=AdherenceOut)
def my_medication_adherence(
    days: int = 30,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    if days < 1 or days > 365:
        raise HTTPException(status_code=422, detail="days must be between 1 and 365.")
    from datetime import timedelta

    rows = db.scalars(
        select(MedicationLog.status)
        .where(
            MedicationLog.user_id == user.id,
            MedicationLog.log_date >= date.today() - timedelta(days=days),
        )
    ).all()
    taken = rows.count("taken")
    missed = rows.count("missed")
    total = taken + missed
    return AdherenceOut(
        taken=taken,
        missed=missed,
        adherence_percent=round((taken / total) * 100, 1) if total else None,
    )
