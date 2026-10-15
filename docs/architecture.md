# Architecture (initial)

AegisGate sits between a user-facing client and an AI model provider.

Planned request path:
1. Validate request and caller context.
2. Detect candidate sensitive data and prompt-injection signals.
3. Apply policy (allow, warn, mask/redact, or block).
4. Retrieve documents only after applying caller permissions.
5. Send the permitted request to a provider adapter.
6. Inspect the model output before returning it.
7. Record a privacy-aware audit event.

The initial demo should support deterministic mock-provider modes so security outcomes are repeatable without depending on an external model.
