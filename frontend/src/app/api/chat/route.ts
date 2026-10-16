import { backendBaseUrl } from "@/lib/api/config";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "The request body is not valid JSON." } },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${backendBaseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const content = await upstream.text();
    return new Response(content, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Could not reach the AegisGate backend. Check that it is running, then retry.",
        },
      },
      { status: 502 },
    );
  }
}
