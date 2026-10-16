import type { ChatErrorResponse, ChatRequest, ChatResponse } from "@/types/chat";

export class ChatApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;

  constructor(message: string, options: { code: string; status?: number; requestId?: string }) {
    super(message);
    this.name = "ChatApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseChatResponse(value: unknown): ChatResponse | undefined {
  if (!isRecord(value) || !isRecord(value.security)) return undefined;

  const { security } = value;
  const provider = value.provider;
  const securityFindings = security.findings;
  const safeFindings = value.safe_findings;
  const auditEvent = value.audit_event;

  if (typeof value.request_id !== "string"
    || (typeof provider !== "string" && provider !== null)
    || typeof value.model_id !== "string"
    || typeof value.response !== "string"
    || typeof security.action !== "string"
    || typeof security.output_action !== "string"
    || !isStringArray(securityFindings)
    || !isStringArray(safeFindings)
    || !isRecord(auditEvent)) return undefined;

  return {
    request_id: value.request_id,
    provider,
    model_id: value.model_id,
    response: value.response,
    security: {
      action: security.action,
      output_action: security.output_action,
      findings: securityFindings,
    },
    safe_findings: safeFindings,
    audit_event: auditEvent,
  };
}

function readError(value: unknown): ChatErrorResponse["error"] | undefined {
  if (!isRecord(value) || !isRecord(value.error)) return undefined;
  const error = value.error;
  if (typeof error.code !== "string" || typeof error.message !== "string") return undefined;

  return {
    code: error.code,
    message: error.message.slice(0, 400),
    request_id: typeof error.request_id === "string" ? error.request_id : undefined,
  };
}

export async function postChat(request: ChatRequest): Promise<ChatResponse> {
  let response: Response;

  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch {
    throw new ChatApiError("Could not reach the frontend API route. Check the frontend server and retry.", {
      code: "FRONTEND_API_UNAVAILABLE",
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const apiError = readError(payload);
    throw new ChatApiError(
      apiError?.message ?? "The request could not be processed. Please retry.",
      {
        code: apiError?.code ?? "HTTP_ERROR",
        status: response.status,
        requestId: apiError?.request_id,
      },
    );
  }

  const chatResponse = parseChatResponse(payload);
  if (!chatResponse) {
    throw new ChatApiError("The backend returned an unexpected response. Please retry.", {
      code: "INVALID_RESPONSE",
      status: response.status,
    });
  }

  return chatResponse;
}
