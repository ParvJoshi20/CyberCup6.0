# AegisGate Frontend

Next.js frontend for the AegisGate dashboard and chat playground.

## Run locally

Install the frontend dependencies and start Next.js:

```powershell
cd frontend
npm install
npm run dev
```

In another terminal, start the FastAPI backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

The frontend is available at `http://localhost:3000`; the backend defaults to `http://127.0.0.1:8000`. The chat page uses a same-origin Next.js route to forward requests to the backend, so no backend CORS changes are required.

To use a different backend address, set the server-only `AEGISGATE_API_BASE_URL` environment variable before starting the frontend. The default is `http://127.0.0.1:8000`.

The chat playground supports the backend's `echo` and `scripted_leaky` mock providers. `scripted_leaky` is intended to demonstrate output inspection; neither provider is a production AI model. The UI does not request RAG because retrieval is not implemented by the current chat handler.

## Local records

Successful chat responses are saved under the AegisGate-owned Local Storage key `aegisgate:local-data` using schema version 1. The chat message, returned response text, and finding strings are filtered for common credential and personal-identifier patterns before they are stored. Failed requests are not saved. Local Storage is browser-local and is not a secure credential vault; do not submit passwords, API secrets, or authentication tokens.

Dashboard summaries, Security Findings, Threat Signals, and Audit Trail read only records from this local archive. Audit rows are actual `audit_event` values returned with chat responses, but the local archive is not a complete server-side audit feed. Evaluation Lab remains unavailable because there is no evaluation runner or endpoint. Use **Local data** in navigation to inspect or clear only AegisGate-owned records. Malformed or newer-version records are not silently rewritten; the app reports the issue and leaves them untouched until an explicit clear.

Run the storage and data-derivation tests with `npm test`. This uses Node's built-in test runner and the built-in TypeScript type stripper; no test dependency is added.
