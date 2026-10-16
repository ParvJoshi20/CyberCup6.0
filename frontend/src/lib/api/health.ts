export type BackendHealth = "checking" | "available" | "unavailable";

/** Check the status code from the same-origin proxy to the implemented GET /health endpoint. */
export async function checkBackendHealth(): Promise<Exclude<BackendHealth, "checking">> {
  try {
    const response = await fetch("/api/health", { method: "GET", cache: "no-store" });
    return response.ok ? "available" : "unavailable";
  } catch {
    return "unavailable";
  }
}
