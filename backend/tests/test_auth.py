import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.user import User


def test_patient_registration_hashes_password_and_sets_cookie(client: TestClient, db_session_factory) -> None:
    response = client.post(
        "/api/auth/register",
        json={"name": "Synthetic Patient", "email": "patient@example.com", "password": "safe-password-123"},
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "name": "Synthetic Patient",
        "email": "patient@example.com",
        "role": "patient",
    }
    assert "password" not in response.json()
    assert "password_hash" not in response.json()
    assert "httponly" in response.headers["set-cookie"].lower()

    with db_session_factory() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.password_hash != "safe-password-123"
        assert user.password_hash.startswith("$argon2")


def test_login_and_persistent_authenticated_session(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"name": "Synthetic Patient", "email": "patient@example.com", "password": "safe-password-123"},
    )
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login",
        json={"email": "PATIENT@example.com", "password": "safe-password-123"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "patient"
    assert client.get("/api/auth/me").json()["email"] == "patient@example.com"


@pytest.mark.parametrize(
    "email,password",
    [
        ("missing@example.com", "safe-password-123"),
        ("patient@example.com", "wrong-password-123"),
    ],
)
def test_invalid_login_credentials_are_rejected(client: TestClient, email: str, password: str) -> None:
    client.post(
        "/api/auth/register",
        json={"name": "Synthetic Patient", "email": "patient@example.com", "password": "safe-password-123"},
    )

    response = client.post("/api/auth/login", json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


def test_registration_validates_input_and_prevents_duplicate_email(client: TestClient) -> None:
    invalid = client.post(
        "/api/auth/register",
        json={"name": "Patient", "email": "not-an-email", "password": "short"},
    )
    assert invalid.status_code == 422

    payload = {"name": "Synthetic Patient", "email": "patient@example.com", "password": "safe-password-123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    duplicate = client.post("/api/auth/register", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "An account with this email already exists."


def test_protected_routes_reject_anonymous_users(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/patient-access").status_code == 401


def test_patient_role_guard_rejects_doctor_role(client: TestClient, db_session_factory) -> None:
    with db_session_factory() as db:
        db.add(
            User(
                name="Synthetic Doctor",
                email="doctor@example.com",
                password_hash=hash_password("synthetic-doctor-password"),
                role="doctor",
            )
        )
        db.commit()

    response = client.post(
        "/api/auth/login",
        json={"email": "doctor@example.com", "password": "synthetic-doctor-password"},
    )
    assert response.status_code == 200
    assert client.get("/api/auth/patient-access").status_code == 403


def test_placeholder_jwt_secret_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret_key", "REPLACE_WITH_GENERATED_SECRET")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY must be set"):
        create_access_token(1, "patient")
