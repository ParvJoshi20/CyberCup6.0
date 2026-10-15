# AegisGate — AI Data Leakage Security Gateway

AegisGate is a security gateway designed to inspect interactions between users and AI models. It evaluates incoming prompts, applies security policies, and inspects model responses before they are returned to the user.

The goal is to help prevent sensitive information exposure, prompt-injection risks, credential-related attacks, and unsafe model outputs through a security layer between the application and its AI provider.

> **Project status:** The FastAPI backend implements the initial security pipeline and deterministic mock providers. Authentication, authorization, retrieval, persistent auditing, and the completed frontend remain planned work.

## Why AegisGate?

AI applications can unintentionally expose personal information, credentials, and other sensitive data. They can also be manipulated by malicious prompts or return sensitive information in their responses.

AegisGate provides a security layer that can:

- Inspect incoming messages for sensitive-data patterns and suspicious instructions.
- Apply security decisions to allow, sanitize, or block requests.
- Inspect provider responses before returning them.
- Record security-related metadata for the current process.
- Support repeatable demonstrations through mock providers.

## Current capabilities

| Component | Current status |
|---|---|
| FastAPI backend | Implemented |
| Health-check endpoint | Implemented |
| Chat security pipeline | Implemented |
| Sensitive-data detection and masking | Implemented |
| Prompt-injection and credential-request detection | Implemented |
| Fail-closed handling for inspection or policy failures | Implemented |
| Provider output inspection and redaction/blocking | Implemented |
| `echo` and `scripted_leaky` mock providers | Implemented |
| Structured API errors and request identifiers | Implemented |
| In-memory audit-event collection | Implemented |
| Authentication and authorization | Planned |
| Retrieval-augmented generation (RAG) | Planned |
| Persistent audit storage | Planned |
| Dedicated audit and evaluation API endpoints | Planned |
| Real external AI-provider integration | Not yet implemented |
| Completed frontend dashboard | In development |

The detection pipeline uses rules and detectors. Detection is not guaranteed to identify every possible attack or sensitive value.

## Architecture overview

The current request flow is:

1. Receive a chat request.
2. Inspect the incoming message for security findings.
3. Validate findings and determine a policy action.
4. Block the request or sanitize the message as required.
5. Invoke the selected mock provider when permitted.
6. Inspect the provider's output for sensitive information.
7. Return the permitted or sanitized response and security metadata.
8. Record audit metadata in memory.

If security inspection or policy evaluation fails, the backend is designed to fail closed rather than proceed with an unchecked request.

**Important:** Document retrieval, permission-filtered RAG, user authentication, and persistent audit storage are not part of the currently implemented flow.

## Technology stack

- **Backend:** Python, FastAPI, Pydantic
- **API server:** Uvicorn
- **Testing:** Pytest and HTTPX
- **Frontend:** Planned dashboard and chat interface

## Getting started

### Requirements

- Python 3.10 or newer
- Git
- PowerShell on Windows, or an equivalent terminal

### 1. Set up the backend

From the repository root, run:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks virtual-environment activation, you can allow it for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Alternatively, run the virtual environment's Python executable directly without activating it.

### 2. Start the API server

From the `backend` directory, run:

```powershell
python -m uvicorn app.main:app --reload
```

The backend should now be available at `http://127.0.0.1:8000`.

### 3. Check the running service

Open these URLs in your browser:

- **Health check:** http://127.0.0.1:8000/health
- **Interactive API documentation:** http://127.0.0.1:8000/docs
- **OpenAPI schema:** http://127.0.0.1:8000/openapi.json

The health check confirms that the API process responds. It does not verify external providers, databases, or other dependencies.

### 4. Send a test chat request

With the server running, open another PowerShell terminal and run:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType "application/json" `
  -Body '{"message":"Hello AegisGate","model_id":"echo"}'
```

The `echo` provider is useful for a basic smoke test. The `scripted_leaky` provider is a deterministic test provider intended to demonstrate output inspection; it is not a real AI model.

### 5. Run the backend tests

From the `backend` directory, with its virtual environment active:

```powershell
python -m pytest -q
```

Use the test results from your current branch as the source of truth for verification.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check backend process liveness |
| `POST` | `/chat` | Run a message through the security pipeline |

Dedicated audit and evaluation endpoints are not currently implemented. See the [API contract](docs/api-contract.md) for the distinction between implemented and planned routes.

## Documentation

- [Backend setup and implementation](backend/README.md)
- [Architecture and request flow](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Demo scenarios](docs/demo-scenarios.md)
- [Frontend implementation handoff](docs/FRONTEND_HANDOFF.md)

## Security and development notes

- Use synthetic test data for demonstrations and testing.
- Never commit API keys, passwords, tokens, or real personal information.
- Treat detection results as security signals, not as a guarantee of complete protection.
- Audit events are currently stored in memory and do not survive a backend process restart.
- Environment-variable examples may contain placeholders for future capabilities. Check the implementation before assuming a setting is active.
- Do not describe planned authentication, authorization, retrieval, persistence, or provider integrations as completed features.

## Project goal

AegisGate aims to make AI applications safer by placing an inspectable, policy-driven security layer between the user and the model—while providing clear security outcomes and a practical interface for demonstrating them.
