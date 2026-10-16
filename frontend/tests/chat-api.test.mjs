import assert from "node:assert/strict";
import test from "node:test";
import { ChatApiError, postChat } from "../src/lib/api/chat.ts";

const request = { message: "A harmless synthetic request", model_id: "echo" };
const backendResponse = {
  request_id: "req-real-shape",
  provider: "echo",
  model_id: "echo",
  response: "A response returned by the API",
  security: { action: "ALLOW", output_action: "ALLOW", findings: [] },
  safe_findings: [],
  audit_event: {},
};

function mockFetch(t, implementation) {
  const previous = globalThis.fetch;
  globalThis.fetch = implementation;
  t.after(() => { globalThis.fetch = previous; });
}

test("passes through a complete backend response", async (t) => {
  mockFetch(t, async () => new Response(JSON.stringify(backendResponse), { status: 200 }));
  const result = await postChat(request);
  assert.equal(result.request_id, "req-real-shape");
  assert.equal(result.response, "A response returned by the API");
});

test("does not fabricate empty findings when a successful payload is incomplete", async (t) => {
  const incomplete = { ...backendResponse };
  delete incomplete.safe_findings;
  mockFetch(t, async () => new Response(JSON.stringify(incomplete), { status: 200 }));
  await assert.rejects(postChat(request), (error) => error instanceof ChatApiError && error.code === "INVALID_RESPONSE");
});

test("reports backend unavailability without returning a success response", async (t) => {
  mockFetch(t, async () => { throw new TypeError("offline"); });
  await assert.rejects(postChat(request), (error) => error instanceof ChatApiError && error.code === "FRONTEND_API_UNAVAILABLE");
});

test("keeps a structured backend error as an error", async (t) => {
  mockFetch(t, async () => new Response(JSON.stringify({ error: { code: "INVALID_PROVIDER", message: "Provider is not supported", request_id: "req-error" } }), { status: 400 }));
  await assert.rejects(postChat(request), (error) => error instanceof ChatApiError && error.code === "INVALID_PROVIDER" && error.requestId === "req-error");
});
