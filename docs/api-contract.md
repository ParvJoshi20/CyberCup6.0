# API Contract — Draft

This is a coordination placeholder, not a finalized schema. Backend and frontend owners should agree on exact field names, status values, error format, and examples before integration.

## Initial endpoint proposal

- `GET /health` — service liveness.
- `POST /api/v1/chat` — inspect a user request, apply policy, optionally retrieve authorized context, invoke the configured provider, inspect the output, and return a structured result.
- `GET /api/v1/audit` — list metadata-only audit events for the demo.
- `POST /api/v1/evaluate` — run labeled evaluation cases.

## Contract decisions to settle

- Request identity and role representation.
- Policy actions and their precedence.
- Finding schema (category, offsets, rule ID, validation status).
- Response status and consistent error envelope.
- Audit event fields and redaction guarantees.

Do not treat the examples in planning notes as finalized API contracts.
