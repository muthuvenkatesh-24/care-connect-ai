from datetime import date
from typing import Optional, Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

Trimmed = Annotated[str, StringConstraints(strip_whitespace=True)]


class ProfileUpdate(BaseModel):
    """Fields a patient may update on their own profile. All optional (partial updates allowed)."""
    model_config = ConfigDict(extra="forbid")

    phone: Optional[Trimmed] = Field(default=None, max_length=40)
    date_of_birth: Optional[date] = None
    gender: Optional[Trimmed] = Field(default=None, max_length=60)
    address: Optional[Trimmed] = Field(default=None, max_length=300)
    emergency_contact: Optional[Trimmed] = Field(default=None, max_length=120)
    emergency_phone: Optional[Trimmed] = Field(default=None, max_length=40)
    blood_type: Optional[Trimmed] = Field(default=None, max_length=10)
    height_cm: Optional[float] = Field(default=None, ge=50, le=250)
    weight_kg: Optional[float] = Field(default=None, ge=1, le=400)
    allergies: Optional[Trimmed] = Field(default=None, max_length=500)
    conditions: Optional[Trimmed] = Field(default=None, max_length=500)
    medications: Optional[Trimmed] = Field(default=None, max_length=500)


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
