const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";

/** Server-only destination used by the same-origin chat proxy. */
export const backendBaseUrl = (
  process.env.AEGISGATE_API_BASE_URL?.trim() || DEFAULT_BACKEND_BASE_URL
).replace(/\/+$/, "");
