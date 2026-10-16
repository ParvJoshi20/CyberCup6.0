# AegisGate Frontend Handoff

## 1. Purpose

Build a polished, responsive frontend for AegisGate, an AI data-leakage security gateway.

The frontend should provide a professional cybersecurity dashboard and a working chat playground connected to the existing FastAPI backend. The interface should make security decisions understandable and visually demonstrate how AegisGate inspects requests and responses.

This document is the implementation brief for the frontend. The existing backend implementation and its live OpenAPI schema remain the source of truth for API behavior.

## 2. Scope and boundaries

### Frontend responsibilities

- Implement the dashboard interface and navigation.
- Build a chat playground that integrates with the implemented backend.
- Visualize security findings and request outcomes.
- Provide clear loading, success, empty, and error states.
- Use clearly labeled demo data for dashboard sections that do not yet have backend endpoints.
- Keep frontend components, API utilities, and types organized and maintainable.

### Strict backend boundary

**Work on the frontend only. Do not modify backend code, security rules, API schemas, backend tests, or existing backend behavior.**

The following backend capabilities are not currently implemented:

- Authentication and authorization.
- RAG or document retrieval.
- Persistent audit storage.
- Dedicated audit-query and evaluation endpoints.
- Real external AI-provider integration.

Do not create frontend behavior that falsely suggests these features are operational. Use demo data where necessary and label it clearly.

## 3. Visual direction

Use the supplied cybersecurity dashboard reference images as visual inspiration. Reproduce their general visual language, information density, and professional polish without copying another product's branding, name, logo, or proprietary assets.

### Design characteristics

- Dark, enterprise-grade cybersecurity aesthetic.
- Near-black page backgrounds and charcoal panels.
- Subtle borders and restrained shadows.
- Purple-to-magenta gradients used sparingly for emphasis.
- Modern sans-serif typography with a clear hierarchy.
- Compact navigation, precise spacing, and readable data tables.
- Clean charts with restrained gridlines and legible labels.
- Consistent status colors and compact severity indicators.
- Subtle hover and transition effects.
- Responsive layouts that preserve usability on smaller screens.

Avoid excessive glow, neon overload, giant empty cards, excessive rounding, and generic template styling. The result should feel like a credible security operations product.

### Suggested palette

Treat these values as starting points and adjust them consistently across the design system.

| Purpose | Suggested color |
|---|---|
| Main background | `#0B0B10` |
| Sidebar/background surface | `#101017` |
| Card surface | `#15151F` |
| Elevated surface | `#1B1B28` |
| Borders | `#2A2A3A` |
| Primary text | `#F3F3F8` |
| Secondary text | `#A1A1B5` |
| Accent purple | `#8B5CF6` |
| Accent magenta | `#D946EF` |
| Success | `#34D399` |
| Warning | `#FBBF24` |
| Critical | `#FB7185` |
| Informational | `#60A5FA` |

Use accessible contrast for text, controls, charts, and status indicators. Never communicate severity through color alone.

## 4. Application layout

Create a consistent application shell.

### Sidebar

Include:

- AegisGate wordmark or a simple original shield-style mark.
- Dashboard.
- Chat Playground.
- Security Findings.
- Threat Signals.
- Audit Trail.
- Evaluation Lab.
- A compact settings or project section if appropriate.

Use active navigation states and restrained icons. Do not add external product branding.

### Top navigation

Include:

- Current page title or breadcrumb.
- A clear indicator for backend connectivity where relevant.
- Optional search or utility controls if they improve the workflow.
- A compact profile placeholder only if it is explicitly a demo element.

Do not implement a fake login flow or imply real user identity, roles, or permissions.

### Main content

Use a clear page hierarchy, consistent card spacing, aligned content edges, and responsive grids. Prioritize meaningful information over decoration.

## 5. Required pages

### A. Security Dashboard

Create the primary overview page.

Include visual elements inspired by the reference images:

- Overview metrics such as inspected requests, blocked requests, redacted findings, and high-severity signals.
- A time-series chart for security activity.
- A threat or finding category breakdown.
- A severity/status distribution.
- A recent security events table.
- Compact status summaries and useful empty states.

**Data integrity requirement:** Until real endpoints exist for these metrics, mark the dashboard data as `DEMO DATA` or `ILLUSTRATIVE`. Do not invent live backend metrics or claim that these values are persistent audit records.

The dashboard may include a backend connection indicator driven by `GET /health`, but that indicator only confirms that the API health endpoint responds.

### B. Chat Playground — functional priority

This is the main live integration page.

Build a polished chat workspace with:

- A message composer.
- A send button.
- A conversation-style request and response area.
- A provider selection control for supported providers.
- A request status indicator.
- A security summary panel.
- A safe findings list.
- A request ID display when available.
- Clear loading and error states.
- A way to distinguish the submitted prompt, sanitized processing outcome, and returned response.

Connect the chat playground to the existing `POST /chat` endpoint.

The current supported provider selections are:

- `echo`
- `scripted_leaky`

Label them as test/mock providers, not production AI models.

When a response is received, render its security information using the actual response schema. Do not assume undocumented field names or enum values. Check the backend's live OpenAPI schema at `/openapi.json`.

When a request fails, display a safe, understandable message. Do not expose stack traces, raw secrets, or sensitive values in error details.

Do not fabricate a successful response when the API is unavailable. Provide a retry option and a clear connection/error state.

### C. Security Findings

Create a findings exploration page with:

- Severity/status filters.
- Finding categories.
- Search or text filtering where useful.
- A structured table or list.
- A details panel or expandable row for safe metadata.

The current chat response includes `safe_findings`. Use those actual findings when available.

Do not present hardcoded findings as live backend results. If a richer historical findings feed is shown, label it as demo data because there is no dedicated findings-history API in the current backend.

Avoid displaying raw sensitive values. Prefer redacted previews, category names, safe excerpts, and request identifiers.

### D. Threat Signals

Create a visual investigation page inspired by a security signal timeline.

Possible components include:

- An activity timeline.
- Signal category legends.
- Severity distribution.
- A selected-signal details panel.
- A compact event list.

Until real historical signals are provided by the backend, all example events and charts must be labeled as illustrative demo data. Do not imply that external threat intelligence, anomaly detection, or third-party connectors are integrated.

### E. Audit Trail

Create a page layout suitable for future audit integration, including:

- Event table.
- Time and category filters.
- Outcome and severity indicators.
- Request identifier.
- Safe event details.

The current audit logger stores events in memory, and no dedicated audit-query endpoint is implemented. Therefore, do not claim that this page shows a complete or persistent audit history.

Use an unmistakable demo label for sample rows, or provide a well-designed empty/coming-soon state.

### F. Evaluation Lab

Create a future-facing interface for security test cases, evaluation summaries, and outcome visualization.

The page can show clearly labeled sample scenarios and illustrative results, but must not claim to execute a backend evaluation unless an implemented endpoint supports it.

Keep the distinction between static demonstration content and actual execution visible.

## 6. Backend integration contract

### Base URL

Use a configurable backend base URL, with the local development default:

`http://127.0.0.1:8000`

Avoid scattering the base URL across components. Centralize it in a frontend API utility or configuration module.

If the chosen framework requires a public environment variable, document its expected name in the frontend setup instructions. Do not place secrets in public frontend variables.

### Implemented endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Basic API process liveness check |
| `POST` | `/chat` | Process a chat request through the security pipeline |

### Chat request

The backend request schema supports:

- `message` — required string, nonempty after trimming, maximum 8,000 characters.
- `model_id` — optional string, defaults to `echo`, maximum 128 characters.
- `use_rag` — optional boolean, accepted but not connected to retrieval in the current handler.
- `conversation_id` — optional string, maximum 128 characters.

Use the live OpenAPI schema to confirm the exact types and constraints before finalizing frontend types.

### Chat response

The response schema includes:

- `request_id`
- `provider`
- `model_id`
- `response`
- `security`
- `safe_findings`
- `audit_event`

Use the actual schema for nested objects and optional fields. Handle missing or nullable values safely.

### Error handling

The backend uses a structured error envelope with an `error` object containing fields such as `code`, `message`, and `request_id`.

Implement graceful handling for:

- Backend unavailable.
- Network failure.
- HTTP error responses.
- Request validation errors.
- Unexpected or malformed response data.

Do not assume all failures have identical HTTP statuses or identical messages.

## 7. Suggested frontend structure

First inspect the existing `frontend` directory and package configuration. Preserve any working setup and follow the framework already selected by the repository.

If the app is still a scaffold, organize the implementation along these lines, adapting names to the existing conventions:

```text
frontend/
  src/
    app/
      dashboard/
      chat/
      findings/
      threats/
      audit/
      evaluations/
    components/
      layout/
      dashboard/
      charts/
      tables/
      chat/
      security/
      ui/
    lib/
      api/
      utils/
    types/
```

Keep API requests separate from presentation components. Reuse layout primitives, status badges, table styles, and card patterns instead of reimplementing them on every page.

Avoid unnecessary dependencies. Reuse existing packages when suitable and add new ones only when they materially improve the result.

## 8. UX and accessibility requirements

- Support desktop, tablet, and mobile screen sizes.
- Make navigation usable with a keyboard.
- Provide visible focus indicators.
- Use labels for form fields and buttons.
- Provide meaningful loading, empty, and error states.
- Ensure tables remain usable on narrow screens.
- Keep text and status indicators readable in the dark theme.
- Add useful tooltips only where they improve understanding.
- Avoid animation that interferes with usability.
- Make demo data clearly distinguishable from live results.

## 9. Implementation sequence

Build in this order:

1. Inspect the existing frontend structure, package manager, framework, and current branch.
2. Establish the theme, typography, shared components, sidebar, and top navigation.
3. Implement the dashboard layout with clearly labeled demo data.
4. Build the chat playground and integrate it with the real `/chat` endpoint.
5. Implement findings, threat signals, audit, and evaluation pages with honest demo/empty states.
6. Add responsive behavior and interaction details.
7. Run the available frontend lint, type-check, build, and test commands.
8. Fix integration issues without changing backend behavior.
9. Update frontend setup documentation and report what is functional versus illustrative.

## 10. Acceptance criteria

The frontend is ready for review when:

- The app starts using the repository's existing framework and package manager.
- Navigation works across all implemented pages.
- The visual style is consistent and closely follows the supplied design references without copying branding.
- The dashboard is polished, readable, and responsive.
- The chat playground successfully calls `POST /chat` when the backend is running.
- The UI displays real chat response and security metadata from the API.
- Unsupported endpoints are not treated as available.
- Demo data is clearly labeled.
- Errors and backend unavailability are handled gracefully.
- Sensitive values are not unnecessarily exposed in the UI.
- Existing backend files and security behavior remain unchanged.
- Available frontend checks complete successfully.

## 11. Final instruction

Prioritize a cohesive, polished product experience and a genuinely functional chat integration over adding superficial features.

Build the frontend around the current implementation, not an imagined future backend. Preserve the distinction between real API results, mock-provider demonstrations, and planned capabilities throughout the application.
