from datetime import date

from sqlalchemy import Float, ForeignKey, String, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    phone: Mapped[str | None] = mapped_column(String(40))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(60))
    address: Mapped[str | None] = mapped_column(String(300))
    emergency_contact: Mapped[str | None] = mapped_column(String(120))
    emergency_phone: Mapped[str | None] = mapped_column(String(40))
    blood_type: Mapped[str | None] = mapped_column(String(5))
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    allergies: Mapped[str | None] = mapped_column(String(500))
    conditions: Mapped[str | None] = mapped_column(String(500))
    medications: Mapped[str | None] = mapped_column(String(500))
