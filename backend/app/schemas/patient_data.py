from datetime import date, datetime, time
from typing import Optional, Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

Trimmed = Annotated[str, StringConstraints(strip_whitespace=True)]

APPOINTMENT_STATUSES = {"upcoming", "completed", "cancelled"}
MEDICATION_STATUSES = {"taken", "missed"}
RECORD_TYPES = {"Lab report", "Prescription", "Imaging", "Visit summary", "Other"}


# --- Health logs ---


class HealthLogIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    log_date: date
    metric_type: str = Field(pattern="^(steps|sleep|heart_rate|water|exercise|weight)$")
    value: float = Field(gt=0)
    # Per-type upper sanity bounds are enforced in the route (unit-dependent).


class HealthLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    metric_type: str
    value: float


# --- Appointments ---


class AppointmentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doctor_name: Trimmed = Field(min_length=1, max_length=120)
    specialty: Optional[Trimmed] = Field(default=None, max_length=60)
    appointment_date: date
    appointment_time: str = Field(pattern="^([01]\\d|2[0-3]):[0-5]\\d$")  # HH:MM 24h
    visit_type: str = Field(default="In person", pattern="^(In person|Video visit)$")
    location: Optional[Trimmed] = Field(default=None, max_length=200)
    notes: Optional[Trimmed] = Field(default=None, max_length=500)


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_name: str
    specialty: Optional[str]
    appointment_date: date
    appointment_time: time
    visit_type: str
    location: Optional[str]
    status: str
    notes: Optional[str]


# --- Medications ---


class MedicationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Trimmed = Field(min_length=1, max_length=120)
    dosage: Optional[Trimmed] = Field(default=None, max_length=80)
    instructions: Optional[Trimmed] = Field(default=None, max_length=300)
    schedule_time: Optional[str] = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class MedicationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[Trimmed] = Field(default=None, min_length=1, max_length=120)
    dosage: Optional[Trimmed] = Field(default=None, max_length=80)
    instructions: Optional[Trimmed] = Field(default=None, max_length=300)
    schedule_time: Optional[str] = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class MedicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    dosage: Optional[str]
    instructions: Optional[str]
    schedule_time: Optional[time]
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool


class MedicationLogIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    log_date: date
    status: str = Field(pattern="^(taken|missed)$")


class MedicationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medication_id: int
    log_date: date
    status: str


# --- Medical records (metadata only in v1) ---


class MedicalRecordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Trimmed = Field(min_length=1, max_length=150)
    record_type: str = Field(default="Other")
    record_date: Optional[date] = None
    notes: Optional[Trimmed] = Field(default=None, max_length=500)


class MedicalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    record_type: str
    record_date: Optional[date]
    notes: Optional[str]


# --- Health passport ---


class PassportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    health_id: str
    access_code: str
    is_active: bool
    created_at: datetime


# --- Doctor access grants (patient side) ---


class GrantIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doctor_email: EmailStr
    patient_note: Optional[Trimmed] = Field(default=None, max_length=200)


class GrantOut(BaseModel):
    id: int
    doctor_name: str
    doctor_email: EmailStr
    created_at: datetime


# --- Doctor workspace (restricted summaries) ---


class DoctorPatientSummary(BaseModel):
    patient_id: int
    patient_name: str
    granted_at: datetime
    score: Optional[float] = None
    data_completeness: Optional[float] = None
    active_medications: int = 0
    upcoming_appointments: int = 0
    last_logs: int = 0


class VerifyAccessOut(BaseModel):
    patient_name: str
    accepted: bool  # True = this doctor has an active grant for the patient
    summary: Optional[DoctorPatientSummary] = None
