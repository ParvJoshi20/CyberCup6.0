export type MockProvider = "echo" | "scripted_leaky";

/** Mirrors the backend ChatRequest schema; optional fields stay optional. */
export interface ChatRequest {
  message: string;
  model_id: MockProvider;
  use_rag?: boolean;
  conversation_id?: string | null;
}

export interface SecuritySummary {
  action: string;
  output_action: string;
  findings: string[];
}

/** Mirrors backend ChatResponse from backend/app/schemas.py. */
export interface ChatResponse {
  request_id: string;
  provider: string | null;
  model_id: string;
  response: string;
  security: SecuritySummary;
  safe_findings: string[];
  audit_event: Record<string, unknown>;
}

/** Mirrors the backend ErrorResponse schema from backend/app/schemas.py. */
export interface BackendErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

/** The local frontend proxy may fail before the backend assigns a request ID. */
export interface ProxyErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export type ChatErrorResponse = BackendErrorResponse | ProxyErrorResponse;
