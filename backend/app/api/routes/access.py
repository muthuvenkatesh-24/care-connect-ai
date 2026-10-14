from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import Role, require_roles
from app.core import healthscore
from app.db.session import get_db
from app.models.patient_data import AccessGrant, Appointment, HealthLog, HealthPassport, Medication, MedicationLog
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.patient_data import DoctorPatientSummary, GrantIn, GrantOut, VerifyAccessOut

doctor_router = APIRouter(prefix="/doctor", tags=["doctor workspace"])
patient_router = APIRouter(prefix="/patients/me", tags=["access grants"])
public_router = APIRouter(prefix="/access", tags=["access grants"])


# --- Patient side: manage consents ---


@patient_router.get("/access", response_model=list[GrantOut])
def my_grants(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(AccessGrant, User)
        .join(User, User.id == AccessGrant.doctor_user_id)
        .where(AccessGrant.patient_user_id == user.id)
        .order_by(AccessGrant.created_at.desc())
    ).all()
    return [
        GrantOut(
            id=grant.id,
            doctor_name=doctor.name,
            doctor_email=doctor.email,
            created_at=grant.created_at,
        )
        for grant, doctor in rows
    ]


@patient_router.post("/access", response_model=GrantOut, status_code=status.HTTP_201_CREATED)
def grant_doctor_access(
    data: GrantIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    doctor = db.scalar(select(User).where(User.email == str(data.doctor_email).strip().lower()))
    if doctor is None or doctor.role != Role.DOCTOR.value:
        raise HTTPException(status_code=404, detail="No doctor account was found with that email.")
    if doctor.id == user.id:
        raise HTTPException(status_code=422, detail="You cannot grant access to yourself.")

    existing = db.scalar(
        select(AccessGrant).where(
            AccessGrant.patient_user_id == user.id,
            AccessGrant.doctor_user_id == doctor.id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="This doctor already has access to your summary.")

    grant = AccessGrant(patient_user_id=user.id, doctor_user_id=doctor.id, patient_note=data.patient_note)
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return GrantOut(id=grant.id, doctor_name=doctor.name, doctor_email=doctor.email, created_at=grant.created_at)


@patient_router.delete("/access/{grant_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_my_grant(
    grant_id: int,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    grant = db.scalar(
        select(AccessGrant).where(
            AccessGrant.id == grant_id,
            AccessGrant.patient_user_id == user.id,
        )
    )
    if grant is None:
        raise HTTPException(status_code=404, detail="Access grant not found.")
    db.delete(grant)
    db.commit()
    return None


# --- Doctor side: only consented, restricted summaries ---



def _build_summary(db: Session, grant: AccessGrant, patient: User) -> DoctorPatientSummary:
    """Restricted summary: the doctor sees aggregate status only — never raw sensitive notes."""
    today = date.today()
    since30 = today - timedelta(days=30)
    logs = db.execute(
        select(HealthLog.log_date, HealthLog.metric_type, HealthLog.value).where(
            HealthLog.user_id == patient.id, HealthLog.log_date >= since30
        )
    ).all()
    med_logs = db.execute(
        select(MedicationLog.log_date, MedicationLog.status).where(
            MedicationLog.user_id == patient.id, MedicationLog.log_date >= since30
        )
    ).all()
    profile = db.get(PatientProfile, patient.id)
    score = healthscore.compute_score(
        today=today,
        logs=[(row.log_date, row.metric_type, row.value) for row in logs],
        height_cm=profile.height_cm if profile else None,
        weight_kg=profile.weight_kg if profile else None,
        taken=sum(1 for _, s in med_logs if s == "taken"),
        missed=sum(1 for _, s in med_logs if s == "missed"),
    )
    upcoming = db.scalars(
        select(Appointment.id).where(Appointment.user_id == patient.id, Appointment.status == "upcoming")
    ).all()
    active_meds = len(db.scalars(
        select(Medication.id).where(Medication.user_id == patient.id, Medication.is_active.is_(True))
    ).all())
    recent_logs = (
        db.scalar(
            select(HealthLog.log_date)
            .where(HealthLog.user_id == patient.id)
            .order_by(HealthLog.log_date.desc())
            .limit(1)
        )
    )
    return DoctorPatientSummary(
        patient_id=patient.id,
        patient_name=patient.name,
        granted_at=grant.created_at,
        score=score["score"],
        data_completeness={"complete": 100.0, "partial": 60.0, "insufficient": 20.0}.get(
            score["completeness"]
        ),
        active_medications=active_meds,
        upcoming_appointments=len(upcoming),
        last_logs=0 if recent_logs is None else max(0, (today - recent_logs).days),
    )


@doctor_router.get("/patients", response_model=list[DoctorPatientSummary])
def my_patients(
    user=Depends(require_roles(Role.DOCTOR)),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(AccessGrant, User)
        .join(User, User.id == AccessGrant.patient_user_id)
        .where(AccessGrant.doctor_user_id == user.id)
        .order_by(User.name)
    ).all()
    return [_build_summary(db, grant, patient) for grant, patient in rows]


@doctor_router.get("/patients/{patient_id}", response_model=DoctorPatientSummary)
def patient_detail(
    patient_id: int,
    user=Depends(require_roles(Role.DOCTOR)),
    db: Session = Depends(get_db),
):
    grant = db.scalar(
        select(AccessGrant).where(
            AccessGrant.doctor_user_id == user.id,
            AccessGrant.patient_user_id == patient_id,
        )
    )
    if grant is None:
        raise HTTPException(status_code=403, detail="This patient has not granted you access.")
    patient = db.get(User, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return _build_summary(db, grant, patient)


@public_router.get("/verify/{access_code}", response_model=VerifyAccessOut)
def verify_access_code(
    access_code: str,
    user=Depends(require_roles(Role.DOCTOR)),
    db: Session = Depends(get_db),
):
    """QR demo flow: resolving an opaque code only reveals the patient's name, and the
    restricted summary is returned solely when the patient granted this doctor access."""
    passport = db.scalar(
        select(HealthPassport).where(
            HealthPassport.access_code == access_code,
            HealthPassport.is_active.is_(True),
        )
    )
    if passport is None:
        raise HTTPException(status_code=404, detail="This QR code is no longer valid.")
    patient = db.get(User, passport.user_id)
    if patient is None or patient.role != Role.PATIENT.value:
        raise HTTPException(status_code=404, detail="This QR code is no longer valid.")
    grant = db.scalar(
        select(AccessGrant).where(
            AccessGrant.doctor_user_id == user.id,
            AccessGrant.patient_user_id == patient.id,
        )
    )
    if grant is None:
        return VerifyAccessOut(patient_name=patient.name, accepted=False, summary=None)
    return VerifyAccessOut(patient_name=patient.name, accepted=True, summary=_build_summary(db, grant, patient))
