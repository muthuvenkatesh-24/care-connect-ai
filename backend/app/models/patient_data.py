from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HealthLog(Base):
    """A single daily health metric entry for one patient (one calendar day)."""
    __tablename__ = "health_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_date", "metric_type", name="uq_health_log_day_metric"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    metric_type: Mapped[str] = mapped_column(String(30), nullable=False)  # steps|sleep|heart_rate|water|exercise|weight
    value: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Appointment(Base):
    """A patient-managed appointment record. Not a provider-confirmed booking."""
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(60))
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[time] = mapped_column(Time, nullable=False)
    visit_type: Mapped[str] = mapped_column(String(20), nullable=False, default="In person")  # In person|Video visit
    location: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="upcoming")  # upcoming|completed|cancelled
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(80))
    instructions: Mapped[str | None] = mapped_column(String(300))
    schedule_time: Mapped[time | None] = mapped_column(Time)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MedicationLog(Base):
    """Daily adherence record for one medication (taken or missed)."""
    __tablename__ = "medication_logs"
    __table_args__ = (
        UniqueConstraint("medication_id", "log_date", name="uq_med_log_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)  # taken|missed
    recorded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MedicalRecord(Base):
    """Metadata for a patient's medical record. File upload is not stored in this version."""
    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    record_type: Mapped[str] = mapped_column(String(40), nullable=False, default="Other")  # Lab report|Prescription|Imaging|Visit summary|Other
    record_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class HealthPassport(Base):
    """One per patient. access_code is an opaque, revocable token used for QR demo verification."""
    __tablename__ = "health_passports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    health_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    access_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AccessGrant(Base):
    """Explicit patient consent for a doctor to view a restricted health summary."""
    __tablename__ = "access_grants"
    __table_args__ = (
        UniqueConstraint("patient_user_id", "doctor_user_id", name="uq_access_grant_pair"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_note: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
