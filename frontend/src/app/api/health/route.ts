import { backendBaseUrl } from "@/lib/api/config";

export async function GET() {
  try {
    const upstream = await fetch(`${backendBaseUrl}/health`, { method: "GET", cache: "no-store" });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
