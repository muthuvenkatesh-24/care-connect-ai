# Windows setup

## Requirements

- Python 3.12 or newer
- Node.js 20.19+ or 22.12+
- MySQL 8.0+ (the connection settings are prepared; database access is not used by this scaffold yet)

## Configure

From the repository root, copy `.env.example` to `.env` and update the MySQL values for your local installation. Keep `.env` private; it is ignored by Git.

```powershell
Copy-Item .env.example .env
```

## Start the backend

In PowerShell, from the repository root:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Set-Location backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; health check: `http://127.0.0.1:8000/api/health`.

## Start the frontend

Open a second PowerShell window at the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The development server proxies `/api` requests to the backend on port 8000.

## Run backend tests

In a PowerShell window with the backend virtual environment active:

```powershell
Set-Location backend
python -m pytest
```
