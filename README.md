# AegisGate — CyberCup 6.0

AegisGate is a model-independent security gateway designed to inspect AI requests and responses, enforce data-handling policies, apply prompt-injection checks, retrieve only authorized documents, and record privacy-aware audit events.

## Repository layout

- `backend/` — FastAPI service, security pipeline, provider adapters, retrieval, audit, and tests.
- `frontend/` — Next.js/React user interface.
- `docs/` — API contract, architecture, and demo scenarios.
- `data/` — local/generated data; do not commit real secrets or private datasets.

## Development status

This commit is a project scaffold. Feature implementations and the shared API contract are still to be agreed and built.

## Collaboration

- Keep `main` stable.
- Work on focused branches such as `feat/security-engine` and `feat/backend-foundation`.
- Open pull requests and review before merging.
- Coordinate changes to the API contract in `docs/api-contract.md` before integrating frontend and backend work.

## Security notes

- Use synthetic data for demos and tests.
- Do not commit `.env` files, provider keys, real personal data, or local audit databases.
- Audit records should store minimal metadata and reason codes by default, not raw prompts, responses, or detected secrets.
- Pattern matches are candidate detections, not proof of a person's identity.
