# Windows setup

## Requirements

- Python 3.12 or newer
- Node.js 20.19+ or 22.12+
- MySQL 8.0+

## Configure

From the repository root, create `.env` from the example only if you do not already have a local `.env`, then update the MySQL values. `JWT_SECRET_KEY` must be a random secret of at least 32 characters. Generate one with:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste the generated value into `.env`. Keep that file private; it is ignored by Git.

## Start the backend

In PowerShell, from the repository root:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Set-Location backend
alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The API is available at `http://127.0.0.1:8001`. Registration and login are available under `/api/auth`; health check: `http://127.0.0.1:8001/api/health`.

## Start the frontend

Open a second PowerShell window at the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The development server proxies `/api` requests to the backend on port 8001.

## Run backend tests

In a PowerShell window with the backend virtual environment active:

```powershell
Set-Location backend
python -m pytest
```
