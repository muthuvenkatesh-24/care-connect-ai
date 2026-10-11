from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import Role, get_current_user, require_roles
from app.db.session import get_db
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/patients/me", tags=["patients"])


def _get_or_create_profile(db: Session, user: User) -> PatientProfile:
    profile = db.get(PatientProfile, user.id)
    if profile is None:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
        try:
            db.commit()
        except Exception:
            db.rollback()
            profile = db.get(PatientProfile, user.id)
            if profile is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Unable to create the patient profile.",
                )
        db.refresh(profile)
    return profile


def _profile_response(user: User, profile: PatientProfile) -> ProfileOut:
    return ProfileOut(
        email=user.email,
        name=user.name,
        **{k: getattr(profile, k) for k in (
            "phone", "date_of_birth", "gender", "address", "emergency_contact", "emergency_phone",
            "blood_type", "height_cm", "weight_kg", "allergies", "conditions", "medications",
        )},
    )


@router.get("/profile", response_model=ProfileOut)
def get_my_profile(
    user: User = Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
) -> ProfileOut:
    profile = _get_or_create_profile(db, user)
    return _profile_response(user, profile)


@router.put("/profile", response_model=ProfileOut)
def update_my_profile(
    data: ProfileUpdate,
    user: User = Depends(require_roles(Role.PATIENT)),
    db: Session = Depends(get_db),
) -> ProfileOut:
    profile = _get_or_create_profile(db, user)
    payload = data.model_dump(exclude_unset=True)

    for key, value in payload.items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _profile_response(user, profile)
