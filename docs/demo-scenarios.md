# Demo Scenarios (planned)

## 1. Sensitive data in a prompt
Use synthetic data. Show a candidate detection and mask/block decision, then demonstrate that blocked or masked content is not forwarded in its original form when policy requires that.

## 2. Prompt injection and output leakage
Use a deterministic mock provider that simulates a risky response. Show the gateway's input/output checks and the resulting policy decision.

## 3. Permission-filtered retrieval
Create synthetic documents with different access labels. Demonstrate that an unauthorized document is excluded before context assembly, while an authorized user can retrieve the permitted counterpart.

## Evidence to capture
- Decision and reason codes.
- Whether a provider call occurred.
- Whether restricted context was assembled.
- Audit event metadata.
- Evaluation case outcome.

Avoid real credentials, real personal data, and unsupported claims of perfect detection.
