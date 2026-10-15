# AegisGate Repository Instructions

## 1. Project overview

AegisGate is an AI data-leakage security gateway. Its backend inspects chat requests, applies security policies, invokes permitted providers, inspects provider output, and returns structured responses.

The repository contains the backend, frontend, project documentation, and supporting assets.

Read the root `README.md` and relevant documentation before making changes.

## 2. Critical scope boundary

**The active implementation task is frontend development. Do not modify backend files unless the user explicitly authorizes backend work.**

During frontend tasks:

- Work inside `frontend/` and its directly relevant documentation only.
- Do not modify `backend/`, backend tests, security detectors, policy logic, provider implementations, API schemas, or backend configuration.
- Do not change API contracts to make frontend implementation easier.
- If the existing backend does not support a requested frontend feature, implement a clearly labeled demonstration or empty state, or explain the missing capability.
- Never claim a planned feature is implemented merely because its UI exists.

If a task genuinely requires backend changes, stop before making them and explain the dependency.

## 3. Current backend contract

The currently implemented HTTP endpoints are:

- `GET /health`
- `POST /chat`

The backend uses deterministic mock providers:

- `echo`
- `scripted_leaky`

The chat pipeline includes input inspection, finding validation, policy decisions, sanitization/redaction, provider invocation, output inspection, and in-memory audit-event collection.

The following capabilities are not currently implemented as complete backend features:

- Authentication and authorization.
- RAG and document retrieval.
- Persistent audit storage.
- Dedicated audit-query and evaluation endpoints.
- Real external AI-provider integration.

The request schema accepts `use_rag`, but the current chat handler does not perform retrieval.

Use the live OpenAPI schema at `/openapi.json` and the backend implementation as the source of truth for exact API fields and behavior.

## 4. Frontend design direction

Build a polished, responsive, enterprise-grade cybersecurity dashboard inspired by the supplied visual references.

Design characteristics:

- Dark near-black backgrounds and charcoal surfaces.
- Subtle borders and restrained shadows.
- Purple and magenta accents used selectively.
- Clear typography and strong information hierarchy.
- Compact navigation, structured tables, useful charts, and consistent status indicators.
- Responsive layouts and accessible interactions.
- Thoughtful loading, error, and empty states.

Use original AegisGate branding. Do not copy another product's logo, name, or proprietary assets.

Avoid excessive neon effects, generic template layouts, unnecessary decoration, and nonfunctional controls.

Consult `docs/FRONTEND_HANDOFF.md` for the full frontend requirements.

## 5. Frontend implementation principles

Before editing:

1. Inspect the existing frontend files and package configuration.
2. Identify the framework, package manager, existing components, and established conventions.
3. Reuse working code and dependencies where appropriate.
4. Determine which features can use real backend data and which require demonstration data.

During implementation:

- Keep API calls in a dedicated utility layer.
- Keep request and response types consistent with the actual backend contract.
- Reuse components and styling patterns.
- Use clear component names and manageable file sizes.
- Avoid duplicating application logic.
- Keep configuration centralized.
- Do not expose secrets in frontend code or public environment variables.
- Do not add dependencies unless they provide a clear benefit.
- Do not create fake authentication or authorization.
- Clearly label mock data and simulated outcomes.
- Never expose raw sensitive values unnecessarily.

All navigation elements and interactive controls must have meaningful behavior. Do not add buttons that merely look functional.

## 6. Security requirements

Preserve the backend's fail-closed behavior and security boundaries.

For frontend work:

- Render only the response fields supported by the actual API.
- Treat security findings as potentially sensitive data.
- Avoid displaying raw credentials, API keys, personal information, or unredacted secrets.
- Do not put sensitive prompts or responses into unnecessary browser logs.
- Do not treat client-side checks as authorization.
- Do not assume the presence of a user interface means the backend enforces access control.
- Handle network errors and unsuccessful HTTP responses safely.
- Do not represent illustrative dashboard data as live security telemetry.

Never weaken security checks to make a demonstration look successful.

## 7. API integration

The default local backend URL is:

`http://127.0.0.1:8000`

Centralize the base URL in the frontend configuration or API utility layer.

Use:

- `GET /health` for basic backend process connectivity.
- `POST /chat` for actual chat-security demonstrations.

For chat integration:

- Use the exact request schema from the backend.
- Use only supported mock-provider selections.
- Handle loading, success, validation failure, network failure, and server errors.
- Render actual response and security metadata rather than inventing response fields.
- Do not assume that `use_rag` performs retrieval.
- Do not assume audit events persist across backend restarts.

Do not call proposed endpoints such as `/api/v1/audit` or `/api/v1/evaluate` unless they are implemented and verified.

## 8. Demo data

Dashboard charts, historical findings, threat timelines, audit history, and evaluation results may need demonstration data.

When real API data is unavailable:

- Label the content `DEMO DATA`, `ILLUSTRATIVE`, or an equally clear term.
- Keep demo data separate from live API results.
- Do not imply that demo records were generated by the running backend.
- Do not imply persistence, external threat intelligence, real users, or live evaluation execution.
- Provide an honest empty or coming-soon state when demo data would confuse users.

The chat playground should use the real backend when the API is available.

## 9. Verification and quality checks

Inspect `package.json` and existing scripts before running commands. Use the package manager already established by the repository.

Run the relevant available checks, such as:

- Linting.
- Type checking.
- Frontend tests.
- Production build.

Fix issues introduced by your changes. Do not claim a check passed unless it actually ran successfully.

If a command cannot run because of missing dependencies, configuration, or environment limitations, report the limitation accurately.

If backend behavior needs verification, inspect the relevant code or OpenAPI contract without modifying it.

## 10. Git and change management

- Preserve the user's current branch and existing work.
- Do not reset, rebase, force-push, or discard changes unless explicitly instructed.
- Do not overwrite unrelated files.
- Avoid broad refactors unrelated to the task.
- Review the final diff for unintended changes.
- Keep changes focused on the requested implementation.
- Do not commit or push unless explicitly requested.

## 11. Token and execution efficiency

Work incrementally and avoid unnecessary exploration.

- Inspect only the files needed for the current task.
- Reuse existing dependencies and components.
- Avoid repeatedly reading large files when relevant context is already available.
- Prefer focused edits over rewriting working files.
- Avoid implementing speculative features.
- Run relevant checks rather than repeatedly running unrelated checks.
- Summarize completed work, changed files, checks run, and known limitations at the end.

Do not sacrifice correctness or security for speed.

## 12. Completion criteria

A frontend task is complete when:

- The requested interface is implemented consistently with the project design.
- Interactions work as described.
- Real API integration follows the implemented contract.
- Demonstration data is clearly identified.
- Responsive behavior and accessibility have been considered.
- Relevant checks have been run, with results reported accurately.
- Backend files and security behavior remain unchanged.
- The final summary lists the main changes and any remaining limitations.

**Final rule:** Build against the repository that exists today, preserve its security boundaries, and distinguish real functionality from planned or simulated functionality.
