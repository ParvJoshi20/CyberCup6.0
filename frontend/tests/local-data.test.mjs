import assert from "node:assert/strict";
import test from "node:test";
import {
  clearStoredLocalData,
  deleteChatRecord,
  LOCAL_DATA_KEY,
  parseLocalData,
  redactForLocalStorage,
  saveChatResponse,
  updateChatRecord,
} from "../src/lib/data/local-data.ts";
import { deriveChatMetrics, deriveDailyActivity, deriveFindings } from "../src/lib/data/analytics.ts";

class MemoryStorage {
  #values = new Map();
  failRead = false;
  failWrite = false;
  getItem(key) {
    if (this.failRead) throw new Error("storage read failed");
    return this.#values.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("storage write failed");
    this.#values.set(key, value);
  }
  removeItem(key) {
    this.#values.delete(key);
  }
  seed(key, value) {
    this.#values.set(key, value);
  }
}

function chatInput(overrides = {}) {
  const now = new Date("2026-10-16T10:00:00.000Z").toISOString();
  return {
    request: { message: "Contact alex@example.com; password=hunter2", model_id: "echo" },
    response: {
      request_id: "req-1",
      provider: "echo",
      model_id: "echo",
      response: "Your email is alex@example.com",
      security: { action: "ALLOW", output_action: "ALLOW", findings: ["Email alex@example.com was masked"] },
      safe_findings: ["Email address pattern detected"],
      audit_event: {
        request_id: "req-1",
        provider_id: "echo",
        categories: ["personal_data"],
        policy_action: "ALLOW",
        provider_invoked: true,
        final_outcome: "ALLOW",
        timestamp: now,
      },
    },
    conversationId: "local-conversation-1",
    submittedAt: now,
    receivedAt: now,
    ...overrides,
  };
}

test("redacts common credentials and identifiers before local persistence", () => {
  const value = redactForLocalStorage("email a@b.com password=hunter2 Bearer abc.def.123");
  assert.match(value, /\[EMAIL REDACTED\]/);
  assert.match(value, /password=\[REDACTED\]/);
  assert.match(value, /Bearer \[TOKEN REDACTED\]/);
  assert.doesNotMatch(value, /hunter2|abc\.def\.123|a@b\.com/);
});

test("stores actual response metadata and reloads a validated local record", () => {
  const storage = new MemoryStorage();
  const result = saveChatResponse(storage, chatInput());
  assert.equal(result.ok, true);
  const restored = parseLocalData(storage.getItem(LOCAL_DATA_KEY));
  assert.equal(restored.status, "ready");
  assert.equal(restored.chats.length, 1);
  assert.equal(restored.chats[0].requestId, "req-1");
  assert.equal(restored.chats[0].response, "Your email is [EMAIL REDACTED]");
  assert.equal(restored.chats[0].message, "Contact [EMAIL REDACTED]; password=[REDACTED]");
  assert.equal(restored.chats[0].auditEvent?.finalOutcome, "ALLOW");
});

test("does not overwrite malformed or newer-version data", () => {
  for (const raw of ["{bad json", JSON.stringify({ version: 99, chats: [] })]) {
    const storage = new MemoryStorage();
    storage.seed(LOCAL_DATA_KEY, raw);
    const before = storage.getItem(LOCAL_DATA_KEY);
    const result = saveChatResponse(storage, chatInput());
    assert.equal(result.ok, false);
    assert.equal(storage.getItem(LOCAL_DATA_KEY), before);
  }
});

test("handles blocked and failing storage without throwing", () => {
  const storage = new MemoryStorage();
  storage.failRead = true;
  assert.deepEqual(saveChatResponse(storage, chatInput()), { ok: false, reason: "unavailable" });
  storage.failRead = false;
  storage.failWrite = true;
  assert.deepEqual(saveChatResponse(storage, chatInput()), { ok: false, reason: "write-failed" });
});

test("clears only the AegisGate-owned storage key", () => {
  const storage = new MemoryStorage();
  storage.seed(LOCAL_DATA_KEY, "owned");
  storage.seed("other-app:data", "keep");
  assert.equal(clearStoredLocalData(storage), true);
  assert.equal(storage.getItem(LOCAL_DATA_KEY), null);
  assert.equal(storage.getItem("other-app:data"), "keep");
});

test("updates only user-authored notes and deletes a saved chat record", () => {
  const storage = new MemoryStorage();
  saveChatResponse(storage, chatInput());
  const edited = updateChatRecord(storage, "req-1", { note: "Review contact alex@example.com" });
  assert.equal(edited.ok, true);
  assert.equal(edited.record.note, "Review contact [EMAIL REDACTED]");
  assert.equal(edited.record.requestId, "req-1");
  const removed = deleteChatRecord(storage, "req-1");
  assert.equal(removed.ok, true);
  assert.deepEqual(parseLocalData(storage.getItem(LOCAL_DATA_KEY)).chats, []);
});

test("derives page values only from stored records", () => {
  const storage = new MemoryStorage();
  const first = chatInput();
  saveChatResponse(storage, first);
  saveChatResponse(storage, chatInput({
    request: { message: "Second real prompt", model_id: "scripted_leaky" },
    response: {
      ...chatInput().response,
      request_id: "req-2",
      model_id: "scripted_leaky",
      security: { action: "BLOCK", output_action: "BLOCK", findings: [] },
      safe_findings: [],
      audit_event: null,
    },
    conversationId: "local-conversation-2",
  }));
  const chats = parseLocalData(storage.getItem(LOCAL_DATA_KEY)).chats;
  const metrics = deriveChatMetrics(chats);
  assert.equal(metrics.responses, 2);
  assert.equal(metrics.conversations, 2);
  assert.equal(metrics.auditEvents, 1);
  assert.equal(metrics.safeFindings, 1);
  assert.deepEqual(deriveFindings(chats).map((finding) => finding.summary), ["Email address pattern detected"]);
  assert.equal(deriveDailyActivity(chats, new Date("2026-10-16T12:00:00.000Z")).at(-1)?.count, 2);
});
