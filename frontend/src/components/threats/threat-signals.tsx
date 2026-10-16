"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { useLocalData } from "@/lib/data/use-local-data";
import { deriveFindings, type FindingRecord } from "@/lib/data/analytics";
import styles from "./threat-signals.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unavailable";
}

function SignalDetails({ signal }: { signal: FindingRecord | undefined }) {
  if (!signal) return <Card className={styles.detailPanel}><div className={styles.emptyDetails}><span aria-hidden="true">◇</span><h3>Select a finding</h3><p>Choose a returned safe finding to review its request metadata.</p></div></Card>;
  return <Card className={styles.detailPanel}>
    <div className={styles.detailHeading}><div><p className={styles.detailEyebrow}>BACKEND RESPONSE FINDING</p><h2>{signal.summary}</h2></div><span className={styles.liveTag}>LOCAL</span></div>
    <div className={styles.detailFields}>
      <div><span>Request ID</span><code>{signal.requestId}</code></div>
      <div><span>Provider</span><strong>{signal.provider ?? "Not reported"}</strong></div>
      <div><span>Model ID</span><strong>{signal.modelId}</strong></div>
      <div><span>Policy action</span><strong>{signal.policyAction}</strong></div>
      <div><span>Output action</span><strong>{signal.outputAction}</strong></div>
      <div><span>Captured locally</span><strong>{formatDate(signal.receivedAt)}</strong></div>
    </div>
    <p className={styles.detailFootnote}>No severity score, threat-intelligence enrichment, or anomaly classification is supplied by the current API.</p>
  </Card>;
}

export function ThreatSignals() {
  const localData = useLocalData();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All policy actions");
  const [selectedId, setSelectedId] = useState("");
  const findings = useMemo(() => deriveFindings(localData.chats), [localData.chats]);
  const actions = useMemo(() => [...new Set(findings.map((finding) => finding.policyAction))].sort(), [findings]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = findings.filter((finding) => {
    const matchesQuery = !normalizedQuery || [finding.summary, finding.requestId, finding.provider ?? "", finding.modelId]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery && (action === "All policy actions" || finding.policyAction === action);
  });
  const selected = filtered.find((finding) => finding.id === selectedId) ?? filtered[0];
  const isFiltered = Boolean(query || action !== "All policy actions");
  const isReady = localData.status === "ready" || localData.status === "partial";
  const requestsWithFindings = new Set(findings.map((finding) => finding.requestId)).size;
  const blockedRequests = new Set(localData.chats.filter((chat) => chat.policyAction.toUpperCase() === "BLOCK").map((chat) => chat.requestId)).size;

  function clearFilters() {
    setQuery("");
    setAction("All policy actions");
  }

  return <div className={styles.page}>
    <PageHeading eyebrow="INVESTIGATION / RESPONSE FINDINGS" title="Threat signals" description="Review security findings actually returned by chat requests captured in this browser." action={<Link href="/settings" className={styles.chatLink}>Manage local data ↗</Link>} />
    <div className={styles.notice} role="note"><span className={styles.noticeIcon} aria-hidden="true">i</span><p><strong>No historical threat feed is connected.</strong> This timeline contains only safe findings from actual <code>POST /chat</code> responses. It does not represent external threat intelligence, anomaly detection, or a complete event stream.</p></div>
    {localData.message && <div className={styles.notice} role="status"><p>{localData.message}</p></div>}
    <section className={styles.metricGrid} aria-label="Counts derived from saved API responses">
      <Card className={styles.metricCard}><span>Returned findings</span><strong>{isReady ? findings.length.toLocaleString() : "—"}</strong><small>safe_findings from the API</small></Card>
      <Card className={styles.metricCard}><span>Requests with findings</span><strong>{isReady ? requestsWithFindings.toLocaleString() : "—"}</strong><small>Unique backend request IDs</small></Card>
      <Card className={styles.metricCard}><span>Blocked requests</span><strong>{isReady ? blockedRequests.toLocaleString() : "—"}</strong><small>Actual security.action values</small></Card>
      <Card className={styles.metricCard}><span>Saved chat responses</span><strong>{isReady ? localData.chats.length.toLocaleString() : "—"}</strong><small>Local browser archive</small></Card>
    </section>
    <Card className={styles.timelinePanel}>
      <div className={styles.panelHeading}><div><h2>Recorded response findings</h2><p>Ordered by local capture time · no severity axis is available</p></div><span className={styles.liveTag}>LOCAL ARCHIVE</span></div>
      <div className={styles.filters}>
        <div className={`${styles.field} ${styles.searchField}`}><label htmlFor="signal-search">Search findings</label><input id="signal-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Finding text, request ID, provider…" /></div>
        <div className={styles.field}><label htmlFor="signal-action">Policy action</label><select id="signal-action" value={action} onChange={(event) => setAction(event.target.value)}><option>All policy actions</option>{actions.map((item) => <option key={item}>{item}</option>)}</select></div>
        <Button className={styles.clearButton} type="button" variant="secondary" disabled={!isFiltered} onClick={clearFilters}>Clear filters</Button>
      </div>
      <div className={styles.resultMeta} aria-live="polite"><span><strong>{isReady ? filtered.length : "—"}</strong> of {isReady ? findings.length : "—"} response findings</span><span>Timestamp: local capture time</span></div>
      {!isReady ? <div className={styles.emptyState}><h3>Local response data is unavailable</h3><p>{localData.message ?? "Check browser storage access in Settings."}</p></div> : filtered.length ? <div className={styles.timelineWorkspace}>
        <div className={styles.eventStrip} aria-label="Saved response findings ordered by time">
          {filtered.map((signal) => <button type="button" key={signal.id} className={`${styles.eventButton} ${selected?.id === signal.id ? styles.eventSelected : ""}`} aria-pressed={selected?.id === signal.id} onClick={() => setSelectedId(signal.id)}>
            <span className={styles.eventButtonTop}><strong>{signal.policyAction}</strong><time dateTime={signal.receivedAt}>{formatDate(signal.receivedAt)}</time></span>
            <span>{signal.summary}</span>
            <span className={styles.eventMeta}>{signal.provider ?? "Provider not reported"} · <code>{signal.requestId}</code></span>
          </button>)}
        </div>
        <SignalDetails signal={selected} />
      </div> : <div className={styles.emptyState}><h3>{findings.length ? "No findings match these filters" : "No threat findings have been captured"}</h3><p>{findings.length ? "Adjust your search or policy action filter." : "Send a real request in Chat Playground. Only returned safe findings will appear here."}</p>{findings.length === 0 && <Link href="/chat" className={styles.chatLink}>Open Chat Playground ↗</Link>}{isFiltered && <Button type="button" variant="quiet" onClick={clearFilters}>Clear filters</Button>}</div>}
      <p className={styles.timelineFootnote}>This page does not infer threat severity or classify events beyond the fields returned by the backend.</p>
    </Card>
  </div>;
}
