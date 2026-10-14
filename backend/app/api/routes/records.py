import secrets
import uuid
from datetime import date

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import Role, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.patient_data import HealthPassport, MedicalRecord
from app.schemas.patient_data import MedicalRecordIn, MedicalRecordOut, PassportOut

router = APIRouter(prefix="/patients/me", tags=["records & passport"])

RECORD_TYPES = {"Lab report", "Prescription", "Imaging", "Visit summary", "Other"}


# --- Medical record metadata (v1: metadata only; file upload remains future work) ---


@router.get("/records", response_model=list[MedicalRecordOut])
def list_my_records(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(MedicalRecord)
        .where(MedicalRecord.user_id == user.id)
        .order_by(MedicalRecord.created_at.desc())
    ).all()
    return rows


@router.post("/records", response_model=MedicalRecordOut, status_code=status.HTTP_201_CREATED)
def create_my_record(
    data: MedicalRecordIn,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    if data.record_type not in RECORD_TYPES:
        raise HTTPException(status_code=422, detail="record_type must be one of: " + ", ".join(sorted(RECORD_TYPES)))
    record = MedicalRecord(
        user_id=user.id,
        title=data.title,
        record_type=data.record_type,
        record_date=data.record_date,
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_record(
    record_id: int,
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    record = db.scalar(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.user_id == user.id)
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found.")
    db.delete(record)
    db.commit()
    return None


# --- Health passport (opaque, revocable access code; QR is a demo-verification link) ---


def _get_or_create_passport(db: Session, user) -> HealthPassport:
    passport = db.scalar(select(HealthPassport).where(HealthPassport.user_id == user.id))
    if passport is None:
        passport = HealthPassport(
            user_id=user.id,
            health_id=str(uuid.uuid4()),
            access_code=secrets.token_urlsafe(32),
            is_active=True,
        )
        db.add(passport)
        try:
            db.commit()
        except IntegrityError:
            # Parallel requests can race the unique constraint; the loser re-reads the winner.
            db.rollback()
            passport = db.scalar(select(HealthPassport).where(HealthPassport.user_id == user.id))
            if passport is None:
                raise
        db.refresh(passport)
    return passport


def _qr_link(passport: HealthPassport) -> str:
    # Opaque code in the link only — never contains medical data.
    base = settings.public_app_origin.rstrip("/")
    return f"{base}/access/{passport.access_code}"


@router.get("/passport", response_model=PassportOut)
def my_passport(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    passport = _get_or_create_passport(db, user)
    return passport


@router.post("/passport/rotate", response_model=PassportOut)
def rotate_my_passport(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    """Revoke the current access code by generating a new one (old QR codes stop working)."""
    passport = _get_or_create_passport(db, user)
    passport.access_code = secrets.token_urlsafe(32)
    passport.is_active = True
    db.commit()
    db.refresh(passport)
    return passport


@router.post("/passport/deactivate", response_model=PassportOut)
def deactivate_my_passport(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    passport = _get_or_create_passport(db, user)
    passport.is_active = False
    db.commit()
    db.refresh(passport)
    return passport


@router.get("/passport/qr.svg",
            response_class=Response,
            responses={200: {"content": {"image/svg+xml": {}}}})
def my_passport_qr(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    passport = _get_or_create_passport(db, user)
    if not passport.is_active:
        raise HTTPException(status_code=409, detail="This passport is deactivated; re-activate by rotating the access code.")
    img = qrcode.make(_qr_link(passport), image_factory=qrcode.image.svg.SvgPathImage)
    svg = img.to_string()
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/passport/link")
def my_passport_link(
    user=Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
):
    passport = _get_or_create_passport(db, user)
    return {"link": _qr_link(passport), "is_active": passport.is_active}
