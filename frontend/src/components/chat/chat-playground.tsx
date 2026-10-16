"use client";

import { useRef, useState, type FormEvent } from "react";
import { ChatApiError, postChat } from "@/lib/api/chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { ChatRequest, ChatResponse, MockProvider } from "@/types/chat";
import styles from "./chat-playground.module.css";

type TurnStatus = "pending" | "success" | "error";
type ChatTurn = {
  id: string;
  submittedAt: string;
  request: ChatRequest;
  status: TurnStatus;
  response?: ChatResponse;
  error?: { message: string; requestId?: string };
};

const MAX_MESSAGE_LENGTH = 8_000;

function statusForAction(action: string): "neutral" | "success" | "warning" | "danger" {
  switch (action.toUpperCase()) {
    case "ALLOW": return "success";
    case "SANITIZE":
    case "REDACT": return "warning";
    case "BLOCK": return "danger";
    default: return "neutral";
  }
}

function countCharacters(value: string) {
  return Array.from(value).length;
}

function TurnCard({ turn, onRetry, isBusy }: { turn: ChatTurn; onRetry: (turn: ChatTurn) => void; isBusy: boolean }) {
  const status = turn.status === "pending"
    ? { label: "PROCESSING", tone: "warning" as const }
    : turn.status === "success"
      ? { label: "COMPLETE", tone: "success" as const }
      : { label: "REQUEST FAILED", tone: "danger" as const };

  return <article className={styles.turn} aria-label={`Request ${turn.status}`}>
    <div className={styles.turnHeader}>
      <div className={styles.turnOrigin}><span className={styles.userAvatar} aria-hidden="true">Y</span><div><strong>Your request</strong><span>{turn.submittedAt} · {turn.request.model_id} mock provider</span></div></div>
      <StatusIndicator label={status.label} tone={status.tone} />
    </div>
    <div className={styles.promptBubble}><p>{turn.request.message}</p></div>
    {turn.status === "pending" && <div className={styles.pendingResponse} role="status"><span className={styles.spinner} aria-hidden="true" />Inspecting request and provider output…</div>}
    {turn.response && <div className={styles.responseBlock}>
      <div className={styles.responseLabel}><span className={styles.aegisMark} aria-hidden="true">A</span><div><strong>Inspected response</strong><span>Returned by the security pipeline</span></div></div>
      <p className={styles.responseText}>{turn.response.response}</p>
    </div>}
    {turn.status === "error" && turn.error && <div className={styles.turnError} role="alert">
      <div className={styles.errorCopy}><strong>We couldn’t complete this request.</strong><p>{turn.error.message}</p>{turn.error.requestId && <small>Request ID: <code>{turn.error.requestId}</code></small>}</div>
      <Button variant="secondary" type="button" onClick={() => onRetry(turn)} disabled={isBusy}>Retry</Button>
    </div>}
  </article>;
}

function SecurityResult({ turn }: { turn?: ChatTurn }) {
  if (!turn) return <div className={styles.resultEmpty}><span className={styles.emptyShield} aria-hidden="true">◇</span><h3>Security result</h3><p>Send a request to see the policy decision and safe findings returned by the backend.</p></div>;

  if (turn.status === "pending") return <div className={styles.resultEmpty} role="status"><span className={styles.spinner} aria-hidden="true"/><h3>Inspection in progress</h3><p>The backend response and security metadata will appear here when available.</p></div>;

  if (turn.status === "error") return <div className={styles.resultError}>
    <StatusIndicator label="No response received" tone="danger" />
    <p>{turn.error?.message ?? "The request failed before a security result was returned."}</p>
    {turn.error?.requestId && <div className={styles.requestId}><span>Request ID</span><code>{turn.error.requestId}</code></div>}
    <p className={styles.resultFootnote}>No success result has been created for this attempt.</p>
  </div>;

  const result = turn.response;
  if (!result) return null;
  const notes = result.security.findings;

  return <div className={styles.resultContent}>
    <div className={styles.resultStatus}><StatusIndicator label={`POLICY · ${result.security.action}`} tone={statusForAction(result.security.action)} /><StatusIndicator label={`OUTPUT · ${result.security.output_action}`} tone={statusForAction(result.security.output_action)} /></div>
    <div className={styles.requestId}><span>Request ID</span><code>{result.request_id}</code></div>
    <div className={styles.metadataGrid}><div><span>Provider</span><strong>{result.provider ?? "Not reported"}</strong></div><div><span>Model ID</span><strong>{result.model_id || "Not reported"}</strong></div></div>
    <section className={styles.findingSection} aria-labelledby="security-notes-title">
      <div className={styles.sectionTitle}><h3 id="security-notes-title">Security summary</h3><span>{notes.length}</span></div>
      {notes.length ? <ul className={styles.findingList}>{notes.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul> : <p className={styles.noFindings}>No security summary findings were returned.</p>}
    </section>
    <section className={styles.findingSection} aria-labelledby="safe-findings-title">
      <div className={styles.sectionTitle}><h3 id="safe-findings-title">Safe findings</h3><span>{result.safe_findings.length}</span></div>
      {result.safe_findings.length ? <ul className={styles.findingList}>{result.safe_findings.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul> : <p className={styles.noFindings}>No safe findings were returned.</p>}
    </section>
    <p className={styles.resultFootnote}>Security metadata is from this API response. The backend does not provide persistent audit history here.</p>
  </div>;
}

export function ChatPlayground() {
  const [draft, setDraft] = useState("");
  const [provider, setProvider] = useState<MockProvider>("echo");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState("");
  const pendingRef = useRef(false);
  const characterCount = countCharacters(draft);
  const latestTurn = turns.at(-1);

  async function runRequest(id: string, request: ChatRequest) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: "pending", error: undefined } : turn));

    try {
      const response = await postChat(request);
      setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: "success", response, error: undefined } : turn));
    } catch (error) {
      const message = error instanceof ChatApiError
        ? error.status === 422 ? `Request validation failed. ${error.message}` : error.message
        : "The request failed unexpectedly. Please retry.";
      const requestId = error instanceof ChatApiError ? error.requestId : undefined;
      setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: "error", response: undefined, error: { message, requestId } } : turn));
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    const message = draft.trim();
    if (!message) {
      setFormError("Enter a message before sending.");
      return;
    }
    if (countCharacters(message) > MAX_MESSAGE_LENGTH) {
      setFormError(`Messages must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }

    setFormError("");
    const request: ChatRequest = { message, model_id: provider };
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${turns.length}`;
    const submittedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTurns((current) => [...current, { id, submittedAt, request, status: "pending" }]);
    setDraft("");
    void runRequest(id, request);
  }

  function retryTurn(turn: ChatTurn) {
    void runRequest(turn.id, turn.request);
  }

  return <div className={styles.page}>
    <PageHeading
      eyebrow="LIVE WORKSPACE"
      title="Chat playground"
      description="Send a message through AegisGate’s input policy, mock provider, and output inspection flow."
      action={<StatusIndicator label={isPending ? "REQUEST IN PROGRESS" : "BACKEND VIA LOCAL PROXY"} tone={isPending ? "warning" : "neutral"} />}
    />

    <div className={styles.providerNote}><span className={styles.providerNoteIcon} aria-hidden="true">i</span><p><strong>Mock providers only</strong><span><code>echo</code> returns a deterministic reply. <code>scripted_leaky</code> demonstrates output inspection. Retrieval is not implemented; this playground does not request RAG.</span></p></div>

    <div className={styles.workspace}>
      <section className={styles.conversationColumn} aria-label="Chat conversation">
        <Card className={styles.conversationCard}>
          <div className={styles.conversationHeading}><div><h2>Request trace</h2><p>Prompts are held in this page only and are not saved by the frontend.</p></div><span className={styles.inMemoryLabel}>CURRENT SESSION</span></div>
          {turns.length === 0 ? <div className={styles.emptyConversation}><div className={styles.emptyOrb} aria-hidden="true"><span>✳</span></div><h3>Ready when you are</h3><p>Write a synthetic test message below. AegisGate will return the provider output only after its security pipeline processes the request.</p><button className={styles.samplePrompt} type="button" onClick={() => { setDraft("In one sentence, describe the purpose of AegisGate."); setFormError(""); }}>Use a sample prompt <span aria-hidden="true">↗</span></button></div> : <div className={styles.turnList} role="log" aria-label="Submitted requests and backend responses" aria-live="polite">
            {turns.map((turn) => <TurnCard key={turn.id} turn={turn} onRetry={retryTurn} isBusy={isPending} />)}
          </div>}
        </Card>

        <Card className={styles.composerCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.composerTopline}><label htmlFor="chat-message">Message to inspect</label><span className={characterCount > MAX_MESSAGE_LENGTH ? styles.counterOver : ""} id="message-count">{characterCount.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}</span></div>
            <textarea id="chat-message" value={draft} onChange={(event) => { setDraft(event.target.value); setFormError(""); }} placeholder="Write a synthetic message for AegisGate to inspect…" rows={4} aria-describedby="message-help message-count" aria-invalid={Boolean(formError) || characterCount > MAX_MESSAGE_LENGTH} />
            <div className={styles.composerHelp} id="message-help">Use synthetic content only. Avoid entering real credentials or personal information.</div>
            {formError && <p className={styles.formError} role="alert">{formError}</p>}
            <div className={styles.composerControls}>
              <div className={styles.providerControl}><label htmlFor="mock-provider">Provider</label><select id="mock-provider" value={provider} disabled={isPending} onChange={(event) => setProvider(event.target.value as MockProvider)}>
                <option value="echo">echo · deterministic test</option>
                <option value="scripted_leaky">scripted_leaky · output inspection demo</option>
              </select></div>
              <Button type="submit" disabled={isPending || !draft.trim() || characterCount > MAX_MESSAGE_LENGTH}>
                {isPending ? <><span className={styles.buttonSpinner} aria-hidden="true" />Sending…</> : <>Send for inspection <span aria-hidden="true">↗</span></>}
              </Button>
            </div>
          </form>
        </Card>
        <p className={styles.privacyNote}>The UI keeps this conversation in memory for the current page session. The backend records audit metadata in memory; this interface does not query a history endpoint.</p>
      </section>

      <aside className={styles.securityColumn} aria-label="Security response details">
        <Card className={styles.securityCard}>
          <div className={styles.securityHeading}><div><p className={styles.securityEyebrow}>RESPONSE INSIGHT</p><h2>Security result</h2></div><span className={styles.liveBadge}><i />LIVE API</span></div>
          <SecurityResult turn={latestTurn} />
        </Card>
        <Card className={styles.pipelineCard}>
          <p className={styles.securityEyebrow}>REQUEST FLOW</p>
          <ol className={styles.pipelineList}>
            <li><span>01</span><div><strong>Input inspection</strong><small>Policy evaluates the submitted message</small></div></li>
            <li><span>02</span><div><strong>Mock provider</strong><small>Invoked only when policy permits</small></div></li>
            <li><span>03</span><div><strong>Output inspection</strong><small>Provider output is inspected before return</small></div></li>
          </ol>
          <p className={styles.pipelineFootnote}>A blocked request may not invoke the provider.</p>
        </Card>
      </aside>
    </div>
    <div className="sr-only" role="status" aria-live="polite">{isPending ? "AegisGate request in progress" : latestTurn?.status === "success" ? "AegisGate response received" : ""}</div>
  </div>;
}
