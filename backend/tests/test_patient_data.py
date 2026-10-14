import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models.user import User


def _register(client: TestClient, name: str, email: str, password: str = "safe-password-123") -> dict:
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _register_doctor(db_session_factory, email: str, name: str = "Dr. Test") -> None:
    with db_session_factory() as db:
        db.add(User(name=name, email=email, password_hash=hash_password("doctor-pass-123456"), role="doctor"))
        db.commit()


def _login(client: TestClient, email: str, password: str = "safe-password-123") -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text


TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)
TOMORROW = TODAY + timedelta(days=3)


# ---------------- Health logs ----------------


def test_logs_require_auth(client: TestClient) -> None:
    assert client.get("/api/patients/me/logs").status_code == 401
    assert client.post("/api/patients/me/logs", json={
        "log_date": YESTERDAY.isoformat(), "metric_type": "steps", "value": 5000,
    }).status_code == 401


def test_log_validation_and_persistence(client: TestClient) -> None:
    _register(client, "Logger", "logger@example.com")
    payload = {"log_date": YESTERDAY.isoformat(), "metric_type": "steps", "value": 9500}
    created = client.post("/api/patients/me/logs", json=payload)
    assert created.status_code == 201, created.text

    # Persistence across separate requests.
    listed = client.get("/api/patients/me/logs")
    assert listed.status_code == 200
    assert any(row["metric_type"] == "steps" and row["value"] == 9500 for row in listed.json())

    # Re-logging same day+metric updates (idempotent duplicate handling).
    again = client.post("/api/patients/me/logs", json={**payload, "value": 9700})
    assert again.status_code == 201 and again.json()["value"] == 9700
    listed = client.get("/api/patients/me/logs")
    steps = [row for row in listed.json() if row["metric_type"] == "steps"]
    assert len(steps) == 1 and steps[0]["value"] == 9700

    # Validation failures.
    assert client.post("/api/patients/me/logs", json={
        "log_date": YESTERDAY.isoformat(), "metric_type": "steps", "value": 0,
    }).status_code == 422
    assert client.post("/api/patients/me/logs", json={
        "log_date": YESTERDAY.isoformat(), "metric_type": "sleep", "value": 90,
    }).status_code == 422
    assert client.post("/api/patients/me/logs", json={
        "log_date": TOMORROW.isoformat(), "metric_type": "steps", "value": 1000,
    }).status_code == 422
    assert client.post("/api/patients/me/logs", json={
        "log_date": YESTERDAY.isoformat(), "metric_type": "bogus", "value": 10,
    }).status_code == 422

    deleted = client.delete(f"/api/patients/me/logs/{again.json()['id']}")
    assert deleted.status_code == 204


# ---------------- Health score ----------------


def test_health_score_insufficient_data_state(client: TestClient) -> None:
    _register(client, "Empty Score", "empty-score@example.com")
    response = client.get("/api/patients/me/health-score")
    assert response.status_code == 200
    body = response.json()
    assert body["score"] is None
    assert body["completeness"] == "insufficient"
    assert body["bmi"] is None  # no height/weight yet


def test_health_score_uses_logged_data_and_profile(client: TestClient) -> None:
    _register(client, "Full Score", "full-score@example.com")
    client.put("/api/patients/me/profile", json={"height_cm": 175.0, "weight_kg": 70.0})
    for metric, value in [("steps", 9000), ("sleep", 8), ("heart_rate", 68), ("water", 8), ("exercise", 30)]:
        posted = client.post("/api/patients/me/logs", json={
            "log_date": YESTERDAY.isoformat(), "metric_type": metric, "value": value,
        })
        assert posted.status_code == 201, posted.text

    body = client.get("/api/patients/me/health-score").json()
    assert 80 <= body["score"] <= 100  # strong metrics + healthy BMI
    assert body["completeness"] in ("partial", "complete")
    assert body["bmi"] == 22.9
    assert body["bmi_category"] == "Healthy weight"
    keys = {factor["key"] for factor in body["factors"]}
    assert keys == {"sleep", "steps", "heart_rate", "exercise", "water", "bmi", "adherence"}
    no_data = [factor for factor in body["factors"] if factor["score"] is None]
    assert no_data and all(f["status"] == "no data" for f in no_data)
    assert "machine learning" in body["disclaimer"]
    assert any(h["score"] is not None for h in body["history"])  # real logged day, invented none


# ---------------- Appointments ----------------


def test_appointments_require_auth(client: TestClient) -> None:
    assert client.get("/api/patients/me/appointments").status_code == 401


def test_appointment_validation_and_persistence(client: TestClient) -> None:
    _register(client, "Booker", "booker@example.com")
    payload = {
        "doctor_name": "Dr. Maya Chen",
        "specialty": "Primary care",
        "appointment_date": TOMORROW.isoformat(),
        "appointment_time": "10:30",
        "visit_type": "Video visit",
        "location": "Secure video visit",
    }
    created = client.post("/api/patients/me/appointments", json=payload)
    assert created.status_code == 201, created.text
    assert created.json()["status"] == "upcoming"

    # Duplicate submission rejected with 409.
    assert client.post("/api/patients/me/appointments", json=payload).status_code == 409

    # Past booking rejected.
    past = client.post("/api/patients/me/appointments", json={
        **payload, "appointment_date": YESTERDAY.isoformat(), "appointment_time": "09:00",
    })
    assert past.status_code == 422

    # Bad time format rejected.
    assert client.post("/api/patients/me/appointments", json={
        **payload, "appointment_time": "25:99",
    }).status_code == 422

    # Persistence across separate requests + listing.
    listed = client.get("/api/patients/me/appointments")
    assert len(listed.json()) == 1 and listed.json()[0]["doctor_name"] == "Dr. Maya Chen"

    # Cancel then re-cancel fails.
    app_id = created.json()["id"]
    assert client.post(f"/api/patients/me/appointments/{app_id}/cancel").json()["status"] == "cancelled"
    assert client.post(f"/api/patients/me/appointments/{app_id}/cancel").status_code == 409


# ---------------- Medications ----------------


def test_medication_crud_adherence_and_isolation(client: TestClient, db_session_factory) -> None:
    _register(client, "Taker A", "taker-a@example.com")
    _register(client, "Taker B", "taker-b@example.com")
    _login(client, "taker-a@example.com")  # registering B switched the cookie; act as A again

    created = client.post("/api/patients/me/medications", json={
        "name": "Loratadine", "dosage": "10 mg", "instructions": "Once daily",
        "schedule_time": "08:00", "start_date": TODAY.isoformat(),
    })
    assert created.status_code == 201, created.text
    med_id = created.json()["id"]

    # End before start rejected.
    assert client.post("/api/patients/me/medications", json={
        "name": "Bad", "start_date": TODAY.isoformat(), "end_date": YESTERDAY.isoformat(),
    }).status_code == 422

    # Adherence log: taken then conflicting second log blocked; duplicate identical accepted idempotently.
    logged = client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TODAY.isoformat(), "status": "taken",
    })
    assert logged.status_code == 201
    assert client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TODAY.isoformat(), "status": "taken",
    }).status_code == 201  # idempotent duplicate submission
    assert client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TODAY.isoformat(), "status": "missed",
    }).status_code == 409  # conflicting duplicate
    assert client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TOMORROW.isoformat(), "status": "taken",
    }).status_code == 422  # future date

    adherence = client.get("/api/patients/me/medications/adherence").json()
    assert adherence["taken"] == 1 and adherence["missed"] == 0
    assert adherence["adherence_percent"] == 100.0

    # Deactivate via PATCH, then adherence logging on it fails.
    patched = client.patch(f"/api/patients/me/medications/{med_id}", json={"is_active": False})
    assert patched.status_code == 200 and patched.json()["is_active"] is False
    assert client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TODAY.isoformat(), "status": "taken",
    }).status_code == 409
    # Re-activate and edit dosage.
    assert client.patch(f"/api/patients/me/medications/{med_id}",
                        json={"is_active": True, "dosage": "10 mg, evening"}).status_code == 200

    # Cross-user isolation: user B cannot see, log, patch, or delete A's medication.
    _login(client, "taker-b@example.com")
    assert med_id not in [m["id"] for m in (client.get("/api/patients/me/medications").json())]
    assert client.post(f"/api/patients/me/medications/{med_id}/log", json={
        "log_date": TODAY.isoformat(), "status": "taken",
    }).status_code == 404
    assert client.patch(f"/api/patients/me/medications/{med_id}", json={"is_active": False}).status_code == 404
    # B's adherence is independent of A's.
    assert client.get("/api/patients/me/medications/adherence").json()["taken"] == 0


def test_medications_require_auth(client: TestClient) -> None:
    assert client.get("/api/patients/me/medications").status_code == 401


# ---------------- Records + passport ----------------


def test_records_persistence_and_validation(client: TestClient) -> None:
    _register(client, "Recorder", "recorder@example.com")
    created = client.post("/api/patients/me/records", json={
        "title": "Blood panel March", "record_type": "Lab report",
        "record_date": YESTERDAY.isoformat(), "notes": "Metabolic panel",
    })
    assert created.status_code == 201, created.text
    listed = client.get("/api/patients/me/records")
    assert len(listed.json()) == 1
    assert client.post("/api/patients/me/records", json={
        "title": "Bad", "record_type": "X-ray",
    }).status_code == 422
    assert client.delete(f"/api/patients/me/records/{created.json()['id']}").status_code == 204
    assert client.get("/api/patients/me/records").json() == []


def test_passport_qr_rotate_and_revocation(client: TestClient) -> None:
    _register(client, "Passport Owner", "passport@example.com")
    passport = client.get("/api/patients/me/passport")
    assert passport.status_code == 200
    health_id = passport.json()["health_id"]
    assert uuid.UUID(health_id)  # valid uuid

    qr = client.get("/api/patients/me/passport/qr.svg")
    assert qr.status_code == 200
    assert "svg" in qr.headers["content-type"]
    assert "<svg" in qr.text[:200]

    rotate = client.post("/api/patients/me/passport/rotate")
    assert rotate.status_code == 200
    assert rotate.json()["access_code"] != passport.json()["access_code"]  # old code revoked

    deactivated = client.post("/api/patients/me/passport/deactivate")
    assert deactivated.json()["is_active"] is False
    assert client.get("/api/patients/me/passport/qr.svg").status_code == 409


# ---------------- Grants & doctor workspace ----------------


def test_grants_and_doctor_isolation(client: TestClient, db_session_factory) -> None:
    doctor_email = "granted-doctor@example.com"
    other_doctor_email = "stranger-doctor@example.com"
    _register_doctor(db_session_factory, doctor_email)
    _register_doctor(db_session_factory, other_doctor_email)
    _register(client, "Granted Patient", "granted-patient@example.com")
    client.put("/api/patients/me/profile", json={"height_cm": 175.0, "weight_kg": 70.0})
    client.post("/api/patients/me/logs", json={
        "log_date": YESTERDAY.isoformat(), "metric_type": "steps", "value": 9000,
    })

    # Grant to unknown doctor email fails.
    assert client.post("/api/patients/me/access", json={"doctor_email": "nobody@example.com"}).status_code == 404
    grant = client.post("/api/patients/me/access", json={"doctor_email": doctor_email})
    assert grant.status_code == 201, grant.text
    assert client.post("/api/patients/me/access", json={"doctor_email": doctor_email}).status_code == 409

    # Doctor sees only their granted patient.
    _login(client, doctor_email, "doctor-pass-123456")
    patients = client.get("/api/doctor/patients").json()
    assert len(patients) == 1 and patients[0]["patient_name"] == "Granted Patient"

    detail = client.get(f"/api/doctor/patients/{patients[0]['patient_id']}")
    assert detail.status_code == 200 and detail.json()["patient_name"] == "Granted Patient"

    # Arbitrary patient id → 403, never data.
    assert client.get("/api/doctor/patients/999999").status_code == 403

    # QR verify with grant → accepted + summary.
    code = client.get("/api/patients/me/passport/link").json()
    # The code lives inside the link; fetch the passport to get it deterministically:
    _login(client, "granted-patient@example.com")
    link = client.get("/api/patients/me/passport/link").json()["link"]
    access_code = link.rsplit("/", 1)[1]
    _login(client, doctor_email, "doctor-pass-123456")
    verify = client.get(f"/api/access/verify/{access_code}")
    assert verify.status_code == 200
    body = verify.json()
    assert body["accepted"] is True and body["patient_name"] == "Granted Patient"
    assert body["summary"]["score"] is not None

    # Patient revokes → doctor loses access immediately.
    _login(client, "granted-patient@example.com")
    assert client.delete(f"/api/patients/me/access/{grant.json()['id']}").status_code == 204
    _login(client, doctor_email, "doctor-pass-123456")
    assert client.get("/api/doctor/patients").json() == []
    assert client.get(f"/api/doctor/patients/{body['summary']['patient_id']}").status_code == 403

    # Stranger doctor resolving the same QR: gets name + accepted=false but NO summary.
    _login(client, other_doctor_email, "doctor-pass-123456")
    stranger_verify = client.get(f"/api/access/verify/{access_code}").json()
    assert stranger_verify["accepted"] is False and stranger_verify["summary"] is None


def test_doctor_role_endpoints_reject_patients(client: TestClient, db_session_factory) -> None:
    _register(client, "Just Patient", "just-patient@example.com")
    assert client.get("/api/doctor/patients").status_code == 403
    assert client.get("/api/access/verify/some-code").status_code == 403
