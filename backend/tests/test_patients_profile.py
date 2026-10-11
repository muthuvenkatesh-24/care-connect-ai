import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models.user import User


def _register(client: TestClient, name: str, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201, response.text


def test_profile_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/patients/me/profile").status_code == 401
    assert client.put(
        "/api/patients/me/profile",
        json={"phone": "555-0100"},
    ).status_code == 401


def test_profile_exists_and_is_empty_for_new_patient(client: TestClient) -> None:
    _register(client, "Empty Profile", "empty@example.com", "safe-password-123")
    response = client.get("/api/patients/me/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Empty Profile"
    assert body["email"] == "empty@example.com"
    for key in ("phone", "date_of_birth", "gender", "address", "blood_type",
                "height_cm", "weight_kg", "allergies", "conditions", "medications",
                "emergency_contact", "emergency_phone"):
        assert body[key] is None, f"expected {key} to be null for a new profile"


def test_patient_can_update_own_profile(client: TestClient) -> None:
    _register(client, "Update Me", "update@example.com", "safe-password-123")

    payload = {
        "phone": "(555) 010-2222",
        "gender": "Man",
        "address": "12 Test Lane",
        "blood_type": "O+",
        "height_cm": 180.5,
        "weight_kg": 74.2,
        "allergies": "Peanuts",
        "conditions": "None",
        "medications": "None",
        "emergency_contact": "Sam Who",
        "emergency_phone": "(555) 010-9999",
    }
    update = client.put("/api/patients/me/profile", json=payload)
    assert update.status_code == 200, update.text
    saved = update.json()
    assert saved["phone"] == "(555) 010-2222"
    assert saved["height_cm"] == 180.5
    assert saved["blood_type"] == "O+"

    again = client.get("/api/patients/me/profile")
    assert again.status_code == 200
    assert again.json()["phone"] == "(555) 010-2222"

    partial = client.put("/api/patients/me/profile", json={"city": "Nowhere"})
    assert partial.status_code == 422


def test_profile_rejects_invalid_values(client: TestClient) -> None:
    _register(client, "Bounds", "bounds@example.com", "safe-password-123")
    assert client.put(
        "/api/patients/me/profile",
        json={"height_cm": 999},
    ).status_code == 422
    assert client.put(
        "/api/patients/me/profile",
        json={"blood_type": "toolong"},
    ).status_code == 422


def test_doctor_role_cannot_access_patient_profile(client: TestClient, db_session_factory) -> None:
    with db_session_factory() as db:
        db.add(
            User(
                name="Profile Doctor",
                email="profile-doctor@example.com",
                password_hash=hash_password("synthetic-doctor-password"),
                role="doctor",
            )
        )
        db.commit()

    login = client.post(
        "/api/auth/login",
        json={"email": "profile-doctor@example.com", "password": "synthetic-doctor-password"},
    )
    assert login.status_code == 200
    assert client.get("/api/patients/me/profile").status_code == 403
    assert client.put(
        "/api/patients/me/profile",
        json={"phone": "555"},
    ).status_code == 403


def test_user_cannot_access_another_users_profile_id(client: TestClient, db_session_factory) -> None:
    """Ownership is derived from the JWT (sub), never from client data — there is no route that
    accepts a browser-supplied user id, so cross-user reads are structurally impossible."""
    _register(client, "Owner One", "owner1@example.com", "safe-password-123")
    _register(client, "Owner Two", "owner2@example.com", "safe-password-123")

    # Registering owner two replaced the cookie; the current session is owner two.
    response = client.get("/api/patients/me/profile")
    assert response.status_code == 200
    assert response.json()["email"] == "owner2@example.com"
    assert response.json()["name"] == "Owner Two"

    owner1 = client.post(
        "/api/auth/login",
        json={"email": "owner1@example.com", "password": "safe-password-123"},
    )
    assert owner1.status_code == 200
    response = client.get("/api/patients/me/profile")
    assert response.status_code == 200
    assert response.json()["email"] == "owner1@example.com"
    assert response.json()["name"] == "Owner One"

    update = client.put("/api/patients/me/profile", json={"phone": "111-222-3333"})
    assert update.status_code == 200
    assert update.json()["phone"] == "111-222-3333"

    owner2 = client.post(
        "/api/auth/login",
        json={"email": "owner2@example.com", "password": "safe-password-123"},
    )
    assert owner2.status_code == 200
    other = client.get("/api/patients/me/profile")
    assert other.status_code == 200
    assert other.json()["phone"] is None  # owner1's write never leaked into owner2's row
