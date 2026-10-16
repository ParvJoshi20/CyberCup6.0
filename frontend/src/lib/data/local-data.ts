import type { ChatRequest, ChatResponse, MockProvider } from "@/types/chat";

export const LOCAL_DATA_KEY = "aegisgate:local-data";
export const LOCAL_DATA_VERSION = 1;
export const LOCAL_DATA_CHANGE_EVENT = "aegisgate:local-data-change";
export const STORAGE_UNAVAILABLE_SNAPSHOT = "__aegisgate_local_storage_unavailable__";

const LEGACY_SESSION_KEYS = ["aegisgate.latest-safe-findings", "aegisgate.latest-audit-event"];

export interface SafeAuditEvent {
  requestId: string;
  providerId: string | null;
  categories: string[];
  policyAction: string;
  providerInvoked: boolean;
  finalOutcome: string;
  timestamp: string;
}

export interface SavedChatRecord {
  requestId: string;
  conversationId: string;
  submittedAt: string;
  receivedAt: string;
  providerSelection: MockProvider;
  provider: string | null;
  modelId: string;
  message: string;
  response: string;
  policyAction: string;
  outputAction: string;
  securityFindings: string[];
  safeFindings: string[];
  auditEvent: SafeAuditEvent | null;
  note: string;
}

export interface LocalDataDocument {
  version: typeof LOCAL_DATA_VERSION;
  chats: SavedChatRecord[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LocalDataStatus = "loading" | "ready" | "partial" | "unavailable" | "malformed" | "unsupported";

export interface LocalDataState {
  status: LocalDataStatus;
  chats: SavedChatRecord[];
  message?: string;
}

export type SaveChatInput = {
  request: ChatRequest;
  response: ChatResponse;
  conversationId: string;
  submittedAt: string;
  receivedAt: string;
};

export type SaveResult =
  | { ok: true; record: SavedChatRecord }
  | { ok: false; reason: "unavailable" | "invalid-data" | "write-failed" | "not-found" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseAuditEvent(value: unknown, requestId: string): SafeAuditEvent | null {
  if (!isRecord(value)
    || value.request_id !== requestId
    || (typeof value.provider_id !== "string" && value.provider_id !== null)
    || !isStringArray(value.categories)
    || typeof value.policy_action !== "string"
    || typeof value.provider_invoked !== "boolean"
    || typeof value.final_outcome !== "string"
    || !isTimestamp(value.timestamp)) return null;

  return {
    requestId,
    providerId: value.provider_id,
    categories: value.categories.map(redactForLocalStorage),
    policyAction: value.policy_action,
    providerInvoked: value.provider_invoked,
    finalOutcome: value.final_outcome,
    timestamp: value.timestamp,
  };
}

function parseStoredAuditEvent(value: unknown, requestId: string): SafeAuditEvent | null {
  if (!isRecord(value)
    || value.requestId !== requestId
    || (typeof value.providerId !== "string" && value.providerId !== null)
    || !isStringArray(value.categories)
    || typeof value.policyAction !== "string"
    || typeof value.providerInvoked !== "boolean"
    || typeof value.finalOutcome !== "string"
    || !isTimestamp(value.timestamp)) return null;

  return {
    requestId,
    providerId: value.providerId,
    categories: value.categories,
    policyAction: value.policyAction,
    providerInvoked: value.providerInvoked,
    finalOutcome: value.finalOutcome,
    timestamp: value.timestamp,
  };
}

function parseSavedChat(value: unknown): SavedChatRecord | null {
  if (!isRecord(value)
    || typeof value.requestId !== "string"
    || typeof value.conversationId !== "string"
    || !isTimestamp(value.submittedAt)
    || !isTimestamp(value.receivedAt)
    || (value.providerSelection !== "echo" && value.providerSelection !== "scripted_leaky")
    || (typeof value.provider !== "string" && value.provider !== null)
    || typeof value.modelId !== "string"
    || typeof value.message !== "string"
    || typeof value.response !== "string"
    || typeof value.policyAction !== "string"
    || typeof value.outputAction !== "string"
    || !isStringArray(value.securityFindings)
    || !isStringArray(value.safeFindings)
    || (value.note !== undefined && typeof value.note !== "string")) return null;

  const auditEvent = value.auditEvent === null
    ? null
    : parseStoredAuditEvent(value.auditEvent, value.requestId);
  if (value.auditEvent !== null && !auditEvent) return null;

  return {
    requestId: value.requestId,
    conversationId: value.conversationId,
    submittedAt: value.submittedAt,
    receivedAt: value.receivedAt,
    providerSelection: value.providerSelection,
    provider: value.provider,
    modelId: value.modelId,
    message: value.message,
    response: value.response,
    policyAction: value.policyAction,
    outputAction: value.outputAction,
    securityFindings: value.securityFindings,
    safeFindings: value.safeFindings,
    auditEvent,
    note: typeof value.note === "string" ? value.note : "",
  };
}

/** Redacts common credentials and personal identifiers before text is persisted locally. */
export function redactForLocalStorage(input: string): string {
  return input
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, "[PRIVATE KEY REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [TOKEN REDACTED]")
    .replace(/\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|secret|client[_-]?secret))\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[REDACTED]")
    .replace(/\b(?:sk|pk|rk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{8,}\b/gi, "[CREDENTIAL REDACTED]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/gi, "[CREDENTIAL REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[CREDENTIAL REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[TOKEN REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL REDACTED]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ID NUMBER REDACTED]")
    .replace(/\b(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g, "[PHONE REDACTED]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, (candidate) => (passesLuhn(candidate) ? "[PAYMENT NUMBER REDACTED]" : candidate));
}

function passesLuhn(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function parseLocalData(raw: string | null): LocalDataState {
  if (raw === null || raw === "") return { status: "ready", chats: [] };
  if (raw === STORAGE_UNAVAILABLE_SNAPSHOT) return { status: "unavailable", chats: [], message: "Browser storage is unavailable." };

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { status: "malformed", chats: [], message: "Saved local data could not be read. It has been left untouched." };
  }

  if (!isRecord(value) || typeof value.version !== "number" || !Array.isArray(value.chats)) {
    return { status: "malformed", chats: [], message: "Saved local data has an unknown structure. It has been left untouched." };
  }
  if (value.version !== LOCAL_DATA_VERSION) {
    return { status: "unsupported", chats: [], message: `Saved data version ${value.version} is not supported by this app version. It has been left untouched.` };
  }

  const chats: SavedChatRecord[] = [];
  let hadInvalidRecord = false;
  for (const entry of value.chats) {
    const parsed = parseSavedChat(entry);
    if (parsed) chats.push(parsed);
    else hadInvalidRecord = true;
  }

  return hadInvalidRecord
    ? { status: "partial", chats, message: "Some saved records could not be read. Recoverable records remain available; the stored data has not been rewritten." }
    : { status: "ready", chats };
}

export function createSavedChatRecord(input: SaveChatInput): SavedChatRecord {
  const { request, response } = input;
  return {
    requestId: response.request_id,
    conversationId: input.conversationId,
    submittedAt: input.submittedAt,
    receivedAt: input.receivedAt,
    providerSelection: request.model_id,
    provider: response.provider,
    modelId: response.model_id,
    message: redactForLocalStorage(request.message),
    response: redactForLocalStorage(response.response),
    policyAction: response.security.action,
    outputAction: response.security.output_action,
    securityFindings: response.security.findings.map(redactForLocalStorage),
    safeFindings: response.safe_findings.map(redactForLocalStorage),
    auditEvent: parseAuditEvent(response.audit_event, response.request_id),
    note: "",
  };
}

function notifyLocalDataChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCAL_DATA_CHANGE_EVENT));
}

function getBrowserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getLocalDataSnapshot(): string | null {
  const storage = getBrowserStorage();
  if (!storage) return STORAGE_UNAVAILABLE_SNAPSHOT;
  try {
    return storage.getItem(LOCAL_DATA_KEY) ?? "";
  } catch {
    return STORAGE_UNAVAILABLE_SNAPSHOT;
  }
}

export function subscribeToLocalData(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_DATA_KEY || event.key === null) onChange();
  };
  window.addEventListener(LOCAL_DATA_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOCAL_DATA_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveChatResponse(storage: StorageLike | null, input: SaveChatInput): SaveResult {
  if (!storage) return { ok: false, reason: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_DATA_KEY);
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const existing = parseLocalData(raw);
  if (existing.status !== "ready") return { ok: false, reason: "invalid-data" };

  const record = createSavedChatRecord(input);
  const chats = [...existing.chats.filter((chat) => chat.requestId !== record.requestId), record];
  const document: LocalDataDocument = { version: LOCAL_DATA_VERSION, chats };
  try {
    storage.setItem(LOCAL_DATA_KEY, JSON.stringify(document));
  } catch {
    return { ok: false, reason: "write-failed" };
  }
  notifyLocalDataChanged();
  return { ok: true, record };
}

function writeDocument(storage: StorageLike, chats: SavedChatRecord[]): boolean {
  const document: LocalDataDocument = { version: LOCAL_DATA_VERSION, chats };
  try {
    storage.setItem(LOCAL_DATA_KEY, JSON.stringify(document));
    notifyLocalDataChanged();
    return true;
  } catch {
    return false;
  }
}

export function updateChatRecord(storage: StorageLike | null, requestId: string, changes: { note: string }): SaveResult {
  if (!storage) return { ok: false, reason: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_DATA_KEY);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  const existing = parseLocalData(raw);
  if (existing.status !== "ready") return { ok: false, reason: "invalid-data" };
  const record = existing.chats.find((chat) => chat.requestId === requestId);
  if (!record) return { ok: false, reason: "not-found" };
  const updated = { ...record, note: redactForLocalStorage(changes.note) };
  if (!writeDocument(storage, existing.chats.map((chat) => chat.requestId === requestId ? updated : chat))) {
    return { ok: false, reason: "write-failed" };
  }
  return { ok: true, record: updated };
}

export function deleteChatRecord(storage: StorageLike | null, requestId: string): SaveResult {
  if (!storage) return { ok: false, reason: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_DATA_KEY);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  const existing = parseLocalData(raw);
  if (existing.status !== "ready") return { ok: false, reason: "invalid-data" };
  const record = existing.chats.find((chat) => chat.requestId === requestId);
  if (!record) return { ok: false, reason: "not-found" };
  if (!writeDocument(storage, existing.chats.filter((chat) => chat.requestId !== requestId))) {
    return { ok: false, reason: "write-failed" };
  }
  return { ok: true, record };
}

export function clearStoredLocalData(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(LOCAL_DATA_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Clears only AegisGate-owned Local Storage and legacy AegisGate session snapshots. */
export function clearAegisGateBrowserData(): boolean {
  const storage = getBrowserStorage();
  if (!clearStoredLocalData(storage)) return false;
  try {
    for (const key of LEGACY_SESSION_KEYS) window.sessionStorage.removeItem(key);
  } catch {
    // The Local Storage archive was already cleared; legacy tab snapshots are optional.
  }
  notifyLocalDataChanged();
  return true;
}

export function getBrowserStorageForWrite(): StorageLike | null {
  return getBrowserStorage();
}
