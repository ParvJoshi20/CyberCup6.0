# AegisGate Backend

The AegisGate backend is a FastAPI service that places a security inspection layer around chat requests. It inspects incoming messages, applies policy decisions, invokes an allowed provider, inspects the provider's output, and returns a structured response.

The current implementation uses deterministic mock providers to support local development and repeatable security demonstrations.

## Implementation status

| Feature | Status |
|---|---|
| FastAPI application and health check | Implemented |
| `POST /chat` security pipeline | Implemented |
| Sensitive-data and credential-pattern detection | Implemented |
| Prompt-injection and credential-request detection | Implemented |
| Policy-based allow, sanitize, and block decisions | Implemented |
| Provider output inspection | Implemented |
| `echo` and `scripted_leaky` providers | Implemented |
| Structured errors and request IDs | Implemented |
| In-memory audit-event collection | Implemented |
| Authentication and authorization | Planned |
| RAG and permission-filtered document retrieval | Planned |
| Persistent audit database | Not yet implemented |
| Dedicated audit and evaluation endpoints | Not yet implemented |
| Real external model-provider integration | Not yet implemented |

## Technology stack

- Python 3.10+
- FastAPI
- Pydantic
- Uvicorn
- Pytest
- HTTPX

## Local setup

Run these commands from the repository's `backend` directory in PowerShell.

### 1. Create and activate a virtual environment

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, allow it for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Start the server

```powershell
python -m uvicorn app.main:app --reload
```

The API runs locally at `http://127.0.0.1:8000`.

### 4. Verify the service

- Health check: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs
- OpenAPI schema: http://127.0.0.1:8000/openapi.json

The health check verifies that the application process responds. It does not establish the health of external providers, databases, or other dependencies.

## API endpoints

### `GET /health`

Returns the service's basic health information.

Example response:

```json
{
  "status": "ok",
  "service": "aegisgate-backend",
  "version": "0.1.0"
}
```

### `POST /chat`

Runs a message through the security pipeline.

Example request:

```json
{
  "message": "Hello AegisGate",
  "model_id": "echo"
}
```

The request schema also accepts `use_rag` and `conversation_id`. Although `use_rag` is accepted, document retrieval is not implemented in the current chat handler.

Example PowerShell request:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType "application/json" `
  -Body '{"message":"Hello AegisGate","model_id":"echo"}'
```

The response contains structured information such as a request ID, provider/model metadata, the response text, security information, safe findings, and an audit-event representation. Consult `/docs` for the exact schema on the current branch.

## Chat security pipeline

The current request flow is:

1. **Request validation:** Validate the incoming chat request.
2. **Input inspection:** Detect sensitive-data patterns, suspicious instructions, and credential-related signals.
3. **Finding validation:** Validate detector findings before relying on them.
4. **Policy decision:** Determine whether the request should be allowed, sanitized, or blocked.
5. **Input handling:** Block disallowed requests or sanitize and redact the message before provider invocation.
6. **Provider invocation:** Invoke the selected mock provider when permitted.
7. **Output inspection:** Inspect the provider's response for sensitive data and potentially unsafe output.
8. **Response handling:** Return the permitted or sanitized response, or a generic blocked-response message.
9. **Audit recording:** Record security-related metadata in the current process.

Inspection and policy failures are handled fail-closed: the system avoids proceeding with an unchecked request or releasing unchecked provider output.

## Policy behavior

The chat pipeline uses the following policy actions:

- **`ALLOW`** — The request may proceed, with applicable sensitive-data redaction.
- **`SANITIZE`** — The request is sanitized or redacted before provider invocation.
- **`BLOCK`** — The request is rejected without invoking the provider.

Provider-output inspection separately determines whether the output can be returned, needs redaction, or must be blocked.

These mechanisms rely on implemented detectors and policy rules; they should not be represented as a guarantee that every attack or sensitive value will be detected.

## Mock providers

The provider registry currently supports:

| Provider | Purpose |
|---|---|
| `echo` | Returns a deterministic response suitable for basic smoke tests |
| `scripted_leaky` | Simulates output containing sensitive-looking content to exercise output inspection |

Use `echo` for initial connectivity checks and `scripted_leaky` for controlled security demonstrations. Neither provider represents a production external AI model.

An unknown provider selection produces a structured client error.

## Audit behavior

The current audit implementation stores events in memory. Events can include security-related metadata such as findings, policy outcomes, provider invocation status, and final outcomes.

Current limitations:

- Events are not persisted to a database by the in-memory audit logger.
- Events are lost when the process restarts.
- A dedicated audit-query API is not currently implemented.

Do not assume that a configured database path implies persistent audit storage is active.

## Error handling

The application registers standardized error handlers. Structured errors use an envelope containing an `error` object with fields such as:

- `code`
- `message`
- `request_id`

Validation failures and application-specific errors should be inspected through the live OpenAPI documentation and the current schemas.

## Running tests

From the `backend` directory, with the virtual environment active:

```powershell
python -m pytest -q
```

Run tests after modifying detectors, policy logic, provider handling, response schemas, or audit behavior. Confirm the test results on your current branch rather than relying on results from another branch.

## Configuration and secrets

Review `.env.example` for configuration notes. Some entries may describe planned capabilities rather than active settings.

- Never commit real API keys, passwords, tokens, or personal data.
- Keep local secrets out of version control.
- Use synthetic values for demonstrations.
- Verify that a configuration variable is actually read by the application before relying on it.

## Development boundaries

When extending the backend:

- Preserve the fail-closed behavior of input and output inspection.
- Do not invoke a provider after a request has been blocked.
- Do not return unchecked provider output when inspection fails.
- Keep API schemas and error responses consistent.
- Add or update tests for security-sensitive changes.
- Clearly distinguish implemented functionality from planned work in documentation and demos.
