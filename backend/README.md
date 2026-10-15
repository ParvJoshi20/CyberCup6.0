# AegisGate — Backend

AI Data Leakage Security Gateway · FastAPI backend foundation (Milestone 1).

---

## Requirements

| Requirement | Version |
|---|---|
| Python | 3.11 or newer |
| pip | ships with Python |

> **Why 3.11+?** The code uses `dict[str, str]` and other built-in generic
> type hints that require Python 3.10+, and `from __future__ import annotations`
> covers older 3.10.  Python 3.11 is the project standard.

---

## Setup

### 1. Open a terminal inside the `backend/` directory

```powershell
# Windows PowerShell — navigate to the backend folder
cd D:\Project\CyberCup6.0\backend
```

```bash
# Linux / macOS equivalent
cd /path/to/CyberCup6.0/backend
```

---

### 2. Create and activate a virtual environment

**Windows PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> If you see a security error about script execution, run:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
> and then try again.

**Linux / macOS**

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

You should see `(.venv)` prepended to your prompt when the environment is active.

---

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

This installs FastAPI, Uvicorn, Pydantic v2, pytest, and httpx.

---

### 4. (Optional) Configure environment variables

```powershell
# Windows
copy .env.example .env
```

```bash
# Linux / macOS
cp .env.example .env
```

In Milestone 1 the `.env` file has no effect on runtime behaviour, but it's
good practice to set it up early.

---

## Running the development server

Make sure your virtual environment is active, then run **from inside the
`backend/` directory**:

```powershell
python -m uvicorn app.main:app --reload
```

The server starts on `http://127.0.0.1:8000` by default.

| What | URL |
|---|---|
| Health check | <http://127.0.0.1:8000/health> |
| Interactive API docs | <http://127.0.0.1:8000/docs> |
| OpenAPI schema (JSON) | <http://127.0.0.1:8000/openapi.json> |

Press **Ctrl+C** to stop the server.

---

## Running the tests

Make sure your virtual environment is active and you are in the `backend/`
directory, then run:

```powershell
python -m pytest tests/ -v
```

All tests must pass with no failures.  The `-v` flag prints each test name so
you can see exactly what was checked.

To also see log output during tests (useful for checking the 500-error log):

```powershell
python -m pytest tests/ -v --log-cli-level=DEBUG
```

---

## Project structure

```
backend/
├── app/
│   ├── __init__.py        # Package marker
│   ├── main.py            # FastAPI application entry point
│   ├── schemas.py         # Pydantic v2 request / response models
│   ├── errors.py          # Centralised error handlers
│   ├── api/               # Future route modules (Milestone 2+)
│   ├── audit/             # Future audit logging (Milestone 3+)
│   ├── models/            # Future data models (Milestone 2+)
│   ├── providers/         # Future AI provider adapters (Milestone 2+)
│   ├── retrieval/         # Future RAG retrieval (Milestone 4+)
│   └── security/          # Future security detectors (Milestone 3+)
├── tests/
│   ├── __init__.py
│   ├── conftest.py        # Shared pytest fixtures
│   ├── test_health.py     # /health endpoint tests
│   ├── test_schemas.py    # Pydantic schema unit tests
│   └── test_errors.py     # Error handler integration tests
├── .env.example           # Environment variable template
├── requirements.txt       # Pinned Python dependencies
└── README.md              # This file
```

---

## Milestone 1 scope

This milestone establishes the foundation only:

- ✅ FastAPI application with metadata and versioning.
- ✅ `GET /health` endpoint (liveness check).
- ✅ `HealthResponse`, `ErrorResponse`, `ChatRequest` Pydantic v2 schemas.
- ✅ Standardised error envelope (422 / 404 / 500) with `request_id`.
- ✅ No secrets, stack traces, or raw input in client error responses.
- ✅ Automated tests for all of the above.

**Not in Milestone 1** (deliberately deferred):

- POST /chat security pipeline.
- AI provider integration.
- RAG retrieval.
- Database / audit log persistence.
- Authentication and authorisation.
- CORS configuration (depends on the frontend origin — ask the team).
- Sensitive-data detectors and prompt-injection detection.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | Virtual env not active | Run `Activate.ps1` (Windows) or `source .venv/bin/activate` |
| `ModuleNotFoundError: No module named 'app'` | Running pytest from wrong directory | `cd` to `backend/` first |
| `pydantic.errors.PydanticUserError` | Pydantic v1 installed instead of v2 | `pip install "pydantic>=2.7"` |
| Script cannot be loaded (PowerShell) | Execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
