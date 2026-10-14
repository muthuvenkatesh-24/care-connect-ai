from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import Role, require_roles
from app.db.session import get_db
from app.models.patient_data import Appointment
from app.schemas.patient_data import AppointmentIn, AppointmentOut

router = APIRouter(prefix="/patients/me", tags=["appointments"])


def _parse_time(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


@router.get("/appointments", response_model=list[AppointmentOut])
def list_my_appointments(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Appointment)
        .where(Appointment.user_id == user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
    ).all()
    return rows


@router.post("/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_my_appointment(
    data: AppointmentIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    appointment_time = _parse_time(data.appointment_time)
    start = datetime.combine(data.appointment_date, appointment_time)
    if start < datetime.now().replace(second=0, microsecond=0):
        raise HTTPException(status_code=422, detail="Appointments cannot be booked in the past.")

    # Duplicate-submission guard: same patient, same doctor, same date+time while still upcoming.
    duplicate = db.scalar(
        select(Appointment).where(
            Appointment.user_id == user.id,
            Appointment.doctor_name == data.doctor_name,
            Appointment.appointment_date == data.appointment_date,
            Appointment.appointment_time == appointment_time,
            Appointment.status.in_(["upcoming"]),
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="An identical upcoming appointment already exists.")

    appointment = Appointment(
        user_id=user.id,
        doctor_name=data.doctor_name,
        specialty=data.specialty,
        appointment_date=data.appointment_date,
        appointment_time=appointment_time,
        visit_type=data.visit_type,
        location=data.location,
        notes=data.notes,
        status="upcoming",
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_my_appointment(
    appointment_id: int,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    appointment = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == user.id,
        )
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appointment.status != "upcoming":
        raise HTTPException(status_code=409, detail="Only upcoming appointments can be cancelled.")
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    return appointment
