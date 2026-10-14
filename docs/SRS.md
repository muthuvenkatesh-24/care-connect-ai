# CareConnect AI — SRS Implementation Matrix (Updated)

This is a Markdown summary reflecting **what is actually implemented and tested** in the
repository today, not the original SRS Word/PDF. The real stack is:

- **Frontend:** React + TypeScript + Vite (ESM, no proxy dependency at runtime)
- **Backend:** FastAPI (Python), SQLAlchemy 2.x ORM, Pydantic v2 schemas
- **Database:** MySQL (local dev), SQLite in-memory for the automated test suite
- **Migrations:** Alembic (additive migrations only — no rewrites)
- **Auth:** JWT access token in an **HttpOnly cookie**, server-side role checks
- **Other:** `qrcode` (SVG QR generation), plain-CSS design system

Legend: ✅ = implemented and tested · 🟡 = implemented but only partially verified ·
⚠️ = partial · 🎨 = demo-mode only (browser-local) · ❌ = not implemented (future work)

## 1. Functional requirements

| # | Requirement | Status | Where (frontend / API / model) | Evidence / test | Remaining work |
|---|---|---|---|---|---|
| 1 | User registration, login, logout, current-user | ✅ | `AuthPage.tsx`, `authService.ts` / `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` / `users` | `tests/test_auth.py` (9 tests): success paths, duplicate email 409, bad password 422, wrong login 401, `HttpOnly` cookie | Rate limiting, password reset |
| 2 | Role model (patient / doctor) with server-side checks | ✅ | `App.tsx` role gates / `require_roles()` in `app/api/dependencies.py` / `users.role` | `test_patient_data.py` wrong-role cases (403) | Doctor self-registration is open; production would require doctor verification |
| 3 | Patient profile persistence | ✅ | `ProfilePage.tsx`, `profileService.ts` / `GET·PUT /api/patients/me/profile` / `PatientProfile` | API round-trip test (persistence across requests) | Field-level edit history |
| 4 | Bmi from valid height/weight with category + disclaimer | ✅ | `HealthScorePage.tsx`, `DashboardPage.tsx` / `GET /api/patients/me/health-score` (`bmi`, `bmi_category`, `bmi_note`) / `core/healthscore.py` | Unit tests for BMI math categories; API includes `bmi_note` disclaimer text | — |
| 5 | Daily health logs (DB-persisted, validated) | ✅ | `HealthScorePage.tsx` (`Add metric` dialog) / `GET·POST /api/patients/me/logs`, `DELETE /api/patients/me/logs/{id}` / `HealthLog` | `test_log_validation_and_persistence`: 422 out-of-range, 422 future date, idempotent re-log, cross-user isolation | Timeline UI for raw log browsing |
| 6 | Deterministic wellness score 0–100, documented rules | ✅ | Score page factor list / `GET /api/patients/me/health-score` / `core/healthscore.py` (`compute_score`, weights, per-factor rules) | Score endpoint tests: factor keys, completeness levels, history shape | Doctor-facing explanation view |
| 7 | Incomplete-data handling (never score missing as healthy) | ✅ | Score/dashboard “Incomplete data” states / `completeness: complete·partial·insufficient`, `None` scores | `test_health_score_*` insufficient-data case | — |
| 8 | Score explainability + conservative suggestions | ✅ | Factor cards with value/unit/detail/weight/suggestion / `factors[]` in API response | API response shape covered by tests | — |
| 9 | Score history trend (no invented measurements) | ✅ | `TrendChart.tsx` on score page + dashboard / `history[]` from logged days only | Endpoint test asserts history only covers logged dates | — |
| 10 | Dashboard integration (cards, upcoming visits, activity) | ✅ | `DashboardPage.tsx` live + demo branches | Manual smoke per `/` route; build check | Browser walkthrough on staging DB |
| 11 | Appointment records: create/list/upcoming/past/cancel | ✅ | `AppointmentsPage.tsx` / `GET·POST /api/patients/me/appointments`, `POST .../{id}/cancel` / `Appointment` | `test_appointment_validation...` past-date 422, duplicate 409, cancel 409-on-completed, isolation | Provider-facing booking integration |
| 12 | Honest “patient-managed record” framing | ✅ | Booking dialog + list notes distinguish demo vs live saving; no claim of clinic confirmation | UI copy review | Provider notification (future) |
| 13 | Medication records: add/deactivate/edit, schedule, dose | ✅ | `MedicationsPage.tsx` / `GET·POST·PATCH /api/patients/me/medications` / `Medication` | API tests: create, patch, end<start 422, isolation | Mobile reminder UX |
| 14 | Medication adherence (taken/missed, idempotent) | ✅ | `MedicationsPage.tsx` “Taken today / Missed today” / `POST .../log`, `GET .../adherence` | Adherence percent math test; conflict 409 | Overdue “next dose due” derivation in UI |
| 15 | No reminders/notifications claim | ✅ | Copy explicitly says no reminders are sent | UI copy review | Email/SMS/push service (future) |
| 16 | Disease education: diabetes, hypertension, heart disease | ✅ | `SymptomEducationPage.tsx` (curated static content) | Content review; no API dependency | — |
| 17 | Symptom selection → related educational info | ✅ | Same page, 2-symptom rule bucket, printed rule | UI copy states rule explicitly | — |
| 18 | Rule-based risk demo clearly labelled illustrative | ✅ | Same page: “illustrative only”, no probabilities | Label audit: no ML/accuracy claims anywhere | — |
| 19 | Urgent-care warning before any scoring | ✅ | Banner shown when urgent symptoms selected (chest pain, breathing, stroke signs) | UI review | — |
| 20 | Health Passport: unique Health ID + opaque revocable code | ✅ | `PassportPage.tsx` / `GET·POST /api/patients/me/passport(/rotate·/deactivate·/link·/qr.svg)` / `HealthPassport` `access_code` | Passport tests: rotate revokes old code, deactivation blocks QR (409) | — |
| 21 | QR contains no health data; consent-gated flow | ✅ | QR encodes opaque code only; doctor must be signed in **and** hold an active grant | `test_qr_verify_*`: stranger doctor gets name-only (`accepted=false`, no summary); doctor without grant cannot read by ID (403) | — |
| 22 | Medical records (metadata v1: title/type/date/notes) | ✅ | `PassportPage.tsx` records section / `GET·POST /api/patients/me/records`, `DELETE .../records/{id}` / `MedicalRecord` | Records CRUD + isolation tests | Secure file upload (planned; UI says so) |
| 23 | Family-caregiver workflow | ❌ | — | — | Design: caregiver linking with consent, separate `guardian_access` reviews |
| 24 | Doctor workspace (consent-gated summaries only) | ✅ | `DoctorWorkspacePage.tsx`, `/doctor` role-gated route / `GET /api/doctor/patients`, `GET /api/doctor/patients/{id}` / `AccessGrant` | Access tests: no grant ⇒ 403, grants only owned patients | Doctor UI in full demo walkthrough |
| 25 | Patient-side grant management (grant/revoke) | ✅ | Passport page grants section / `GET·POST /api/patients/me/access`, `DELETE /api/patients/me/access/{id}` | Grant lifecycle test incl. self-grant 422, unknown email 404 | Audit log of grant events |
| 26 | Admin functionality | ❌ | — | — | Out of scope for this version; document separately |
| 27 | Demo mode preserved (browser-local sample data) | ✅ | `patientDemoService.ts`, provider `mode: demo·live` | Demo flow works without backend | — |

## 2. Non-functional requirements

| # | Requirement | Status | Evidence / notes | Remaining work |
|---|---|---|---|---|
| N1 | Ownership always from session, never client-supplied IDs | ✅ | Every patient route keys off `require_roles(...)` user + `user_id` filters; tests cover cross-user isolation | — |
| N2 | Validation (dates, ranges, lengths, statuses) | ✅ | Pydantic schemas (`Field` bounds, patterns), route-level unit bounds | — |
| N3 | Duplicate-submission safety | ✅ | Appointments 409 on identical upcoming; logs idempotent upsert; adherence conflict 409 | Frontend double-click disabled buttons already added |
| N4 | Consistent error handling | ✅ | FastAPI `HTTPException` with detail strings; `apiRequest` maps `detail` to UI messages | Centralized error envelope (future) |
| N5 | Secrets in env vars only | ✅ | `JWT_SECRET_KEY`, DB URL via env; `.env.example` provided | CI secret scanning |
| N6 | Cookie security not weakened for demo | ✅ | `HttpOnly`/`SameSite=lax` kept; tests assert `HttpOnly` flag | Production `Secure`+HSTS config |
| N7 | Medical disclaimers | ✅ | Score page, dashboard, medications, education page, passport | — |
| N8 | Testing (backend) | ✅ | 36 tests total: 9 auth + 27 patient-data (validation, persistence, isolation, roles, QR, grants) | E2E browser tests (future) |
| N9 | Testing (frontend build) | ✅ | `npm run build` (tsc + vite) passes | Component/integration tests (future) |
| N10 | Migrations additive, verified | ✅ | `0001_create_users`, `0002_create_patient_profile`, `0003_create_patient_data` applied via `alembic upgrade head` | Backup/restore runbook |
| N11 | Backup / deployment | ❌ | Not implemented or verified in this repo | Document ops runbook; do not claim production readiness |

## 3. Explicitly not ML

The wellness score (`core/healthscore.py`) and the symptom bucket on the education page
are **rule-based, documented heuristics**. There is no trained model, no accuracy claim,
and no generated probability anywhere in the codebase or UI. Automated ML-based risk
estimation is called out in the UI as future work.

## 4. Important honesty notes

- Bookings are **patient-managed records**; no clinic/provider notification exists.
- Reminders (email/SMS/push) are **not** delivered; the UI says so explicitly.
- Record uploads are **metadata-only** in this version; file upload is planned and
  labelled as unavailable in the UI.
- Doctor workspace exposes only restricted aggregates for patients who granted access.
- Family care workflow is not implemented (documented as remaining work).
