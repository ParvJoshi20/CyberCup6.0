# AegisGate API Contract

This document describes the currently implemented HTTP API and distinguishes it from planned endpoints.

**Contract rule:** The running FastAPI application and its OpenAPI schema at `/openapi.json` are the source of truth for exact request and response schemas.

## 1. Base URL

For local development:

```text
http://127.0.0.1:8000
```

Interactive API documentation is available at `/docs` when the backend is running.

## 2. Implemented endpoints

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/health` | Implemented | Check API process liveness |
| `POST` | `/chat` | Implemented | Run a message through the chat security pipeline |

The routes `/api/v1/chat`, `/api/v1/audit`, and `/api/v1/evaluate` are **not** the current implemented routes.

## 3. Health check

### `GET /health`

Returns basic service health information.

Example response:

```json
{
  "status": "ok",
  "service": "aegisgate-backend",
  "version": "0.1.0"
}
```

This endpoint confirms that the application responds. It does not verify the health of databases, external providers, or other dependencies.

## 4. Chat endpoint

### `POST /chat`

Processes a chat message through the input inspection, policy, provider, and output inspection pipeline.

### Request fields

The request schema currently supports the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | String | Yes | Message to inspect and process; must not be empty after trimming and has a maximum length of 8,000 characters |
| `model_id` | String | No | Provider selection; defaults to `echo`, with a maximum length of 128 characters |
| `use_rag` | Boolean | No | Accepted by the schema; retrieval is not implemented in the current chat handler |
| `conversation_id` | String or null | No | Optional conversation identifier, with a maximum length of 128 characters |

Confirm the live OpenAPI schema for exact validation behavior and any additional constraints.

### Example request

```json
{
  "message": "Hello AegisGate",
  "model_id": "echo"
}
```

### PowerShell example

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/chat `
  -ContentType "application/json" `
  -Body '{"message":"Hello AegisGate","model_id":"echo"}'
```

## 5. Provider selections

The current provider registry supports:

| `model_id` | Purpose |
|---|---|
| `echo` | Deterministic provider for basic testing |
| `scripted_leaky` | Simulated sensitive-looking output for output-security demonstrations |

These are mock providers, not real external AI models.

An unknown provider selection produces an `INVALID_PROVIDER` client error with HTTP status `400`.

## 6. Chat response

The response schema includes the following fields:

| Field | Purpose |
|---|---|
| `request_id` | Identifier associated with the request |
| `provider` | Provider metadata, when available |
| `model_id` | Model/provider selection metadata |
| `response` | Response text permitted by the output security layer |
| `security` | Security summary, including policy and output actions |
| `safe_findings` | Findings intended for safe client-side display |
| `audit_event` | Audit-event representation associated with processing |

Consult `/docs` or `/openapi.json` for the exact field types, nullability, nested objects, and enum values. Frontend implementations should follow those schemas instead of assuming undocumented shapes.

## 7. Security behavior

The chat endpoint follows this general lifecycle:

1. Inspect the incoming message.
2. Validate inspection findings.
3. Decide whether to allow, sanitize, or block the request.
4. Sanitize or redact the message when required.
5. Invoke the selected provider only when permitted.
6. Inspect provider output before returning it.
7. Return a permitted or redacted response, or a generic blocked-response message.
8. Record audit metadata in memory.

The current policy actions include `ALLOW`, `SANITIZE`, and `BLOCK`. Output inspection has separate outcomes, including `ALLOW`, `REDACT`, and `BLOCK`.

The API is designed to fail closed when critical input inspection, finding validation, policy evaluation, or output inspection fails.

These controls use implemented detectors and rules; they do not guarantee that every attack or sensitive value will be detected.

## 8. Error response format

The backend registers standardized error handlers. The error response schema uses an `error` envelope with fields including `code`, `message`, and `request_id`.

Example structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe, user-facing error message.",
    "request_id": "request-identifier"
  }
}
```

This is an illustrative structure, not a promise that every error uses the same HTTP status or exact message. Refer to the live OpenAPI schema and route implementation for exact behavior.

Do not expose stack traces, provider secrets, or raw sensitive values in frontend error displays.

## 9. Planned endpoints and capabilities

The following are future capabilities and must not be called by the frontend as though they already exist.

| Proposed capability | Status |
|---|---|
| `GET /api/v1/audit` | Not implemented |
| `POST /api/v1/evaluate` | Not implemented |
| Dedicated versioned chat route at `/api/v1/chat` | Not implemented |
| Authentication and authorization endpoints | Not implemented |
| Permission-filtered document retrieval | Not implemented |
| Persistent audit queries | Not implemented |

Dashboard panels for these features may use clearly labeled mock or demonstration data until the backend implements corresponding contracts.

## 10. Frontend integration requirements

- Use `GET /health` to display basic backend connectivity.
- Use `POST /chat` for live chat demonstrations.
- Read exact response types from the live OpenAPI schema.
- Handle non-success HTTP responses and structured errors.
- Display security findings without exposing raw sensitive data.
- Distinguish live API results from demo-only dashboard data.
- Do not assume that a submitted `use_rag` value triggers retrieval.
- Do not assume audit events are persisted or can be queried through a dedicated endpoint.
- Do not imply that users are authenticated or authorized by the current API.

## 11. Contract maintenance

When a backend route or schema changes:

1. Update the relevant Pydantic schemas and route implementation.
2. Update this document to match the implemented behavior.
3. Verify the live OpenAPI schema.
4. Update frontend types and API calls.
5. Run relevant backend tests and validate the frontend integration.

The implementation and live schema take precedence over planned endpoint proposals.
