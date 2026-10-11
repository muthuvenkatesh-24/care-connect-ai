# CareConnect Handoff — Patient Profile Persistence

**Branch:** `main` | Uncommitted work at time of writing (7 modified + 6 new files, all listed below)

## Completed this session
- Patient profile vertical slice (backend + frontend + migration), verified:
  - `GET/PUT /api/patients/me/profile` — HttpOnly-cookie auth, `require_roles(Role.PATIENT)`,
    ownership from JWT `sub` only (no client-supplied IDs). Partial updates, strict validation
    (`extra="forbid"`, lengths + height 50–250, weight 1–400, blood-type max 5 chars). Email and
    name intentionally not editable through this endpoint.
- New `patient_profiles` table via additive migration `0002_create_patient_profiles`
  (applied successfully to local MySQL, exit 0; `users` untouched; downgrade = `alembic downgrade -1`).
- Frontend: real API wired into `PatientDataProvider` for non-demo sessions (demo/localStorage flow
  fully preserved); `profileService.ts` maps snake_case↔camelCase to the exact backend response;
  ProfilePage has saving/empty/validation/error states; visual design unchanged.
- Appointments + health metrics still browser-local by design (next slice, see below).

## Verification actually obtained this session (do not re-claim without re-running)
- `python -m pytest` → **15 passed** (9 pre-existing + 6 new incl. 401/403 guards, cross-user isolation)
- `npm run build` (tsc + vite) → **exit 0**
- `alembic upgrade head` → **exit 0** on local MySQL
- Live curl E2E: 201→GET(nulls)→PUT→GET(persisted)→401 unauth→422 invalid

## Changed files (7 modified)
- backend/app/main.py — registered patients router
- backend/app/models/__init__.py — exported PatientProfile
- backend/migrations/env.py — imported PatientProfile for Alembic metadata
- frontend/package-lock.json — npm peer-flag churn only (no dependency changes)
- frontend/src/pages/ProfilePage.tsx — async save, saving/saveError/error+retry states
- frontend/src/patient/PatientDataProvider.tsx — remote profile load/save w/ loading+error+retry
- frontend/src/types/patient.ts — added ApiProfile type (snake_case, backend-accurate)

## New files (6)
- backend/app/api/routes/patients.py
- backend/app/models/patient_profile.py
- backend/app/schemas/profile.py
- backend/migrations/versions/0002_create_patient_profiles.py
- backend/tests/test_patients_profile.py
- frontend/src/services/profileService.ts
- (this file: HANDOFF_PROFILE.md — do not commit unless you want it in the repo)

## Changed files (7 modified)
- backend/app/main.py — registered patients router under /api
- backend/app/models/__init__.py — exported PatientProfile
- backend/migrations/env.py — imported PatientProfile so Alembic sees metadata
- frontend/package-lock.json — npm peer-flag churn only (no dependency changes)
- frontend/src/pages/ProfilePage.tsx — async save w/ saving/saveError states, top error banner + retry
- frontend/src/patient/PatientDataProvider.tsx — remote profile load/save for real sessions, loading/error/retry, demo flow preserved
- frontend/src/types/patient.ts — added ApiProfile (snake_case, matches backend exactly)

## Secret/file hygiene (checked this session)
- `.env` not tracked by git; no secrets/keys/passwords in any changed file (grep-scanned).
- Test emails/passwords in `test_patients_profile.py` are synthetic test data, not secrets.

## Next task (first thing next session)
**Database-backed appointments**, mirroring this slice:
1. `Appointment` model (user_id FK, doctor fields, date/time/type/status) + migration `0003`.
2. `GET/POST /api/patients/me/appointments` (+ cancel route), same ownership pattern.
3. Swap `bookAppointment`/`cancelAppointment` in `PatientDataProvider` to the real API; keep demo mode.
4. Seed/replace hardcoded `getDoctors()` catalog with a doctors table if desired (optional, can stay static).
5. After that: metrics/score, then doctor workspace, then AI layer (per the audit's Phase order).

## Known limitations from this slice
- Dashboard "coming up" list / score ring / trend are empty for real users until the appointments+metrics slice lands.
- No frontend automated tests yet; no CORS middleware (Vite proxy covers dev).
