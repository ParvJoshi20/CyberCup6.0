"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { deriveAuditRecords, type AuditRecord } from "@/lib/data/analytics";
import { useLocalData } from "@/lib/data/use-local-data";
import styles from "./audit-trail.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function EventDetails({ record }: { record: AuditRecord | undefined }) {
  if (!record) return <Card className={styles.detailPanel}><div className={styles.detailEmpty}><span aria-hidden="true">◇</span><h3>Select an event</h3><p>Choose a captured API event to view its returned metadata.</p></div></Card>;
  const { event } = record;
  return <Card className={styles.detailPanel}>
    <div className={styles.detailHeading}><div><p className={styles.detailEyebrow}>API RESPONSE METADATA</p><h2>Chat request audit event</h2></div><span className={styles.liveTag}>LOCAL ARCHIVE</span></div>
    <p className={styles.detailCopy}>This event was returned in a real <code>POST /chat</code> response and saved by this browser.</p>
    <div className={styles.detailFields}>
      <div><span>Request ID</span><code>{event.requestId}</code></div>
      <div><span>Provider ID</span><strong>{event.providerId ?? "Not reported"}</strong></div>
      <div><span>Model ID</span><strong>{record.modelId}</strong></div>
      <div><span>Policy action</span><StatusIndicator label={event.policyAction} /></div>
      <div><span>Final outcome</span><StatusIndicator label={event.finalOutcome} /></div>
      <div><span>Provider invoked</span><strong>{event.providerInvoked ? "Yes" : "No"}</strong></div>
      <div><span>Backend event time</span><strong>{formatDate(event.timestamp)}</strong></div>
      <div><span>Browser capture time</span><strong>{formatDate(record.receivedAt)}</strong></div>
    </div>
    <div className={styles.liveCategories}><span>Backend categories</span>{event.categories.length ? event.categories.map((category) => <code key={category}>{category}</code>) : <span>None returned</span>}</div>
    <p className={styles.detailFootnote}>This local archive contains only events present in captured chat responses. It is not complete server-side audit storage.</p>
  </Card>;
}

export function AuditTrail() {
  const localData = useLocalData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [outcome, setOutcome] = useState("All outcomes");
  const [selectedId, setSelectedId] = useState("");
  const events = useMemo(() => deriveAuditRecords(localData.chats), [localData.chats]);
  const categories = useMemo(() => [...new Set(events.flatMap((record) => record.event.categories))].sort(), [events]);
  const outcomes = useMemo(() => [...new Set(events.map((record) => record.event.finalOutcome))].sort(), [events]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = events.filter(({ id, event, modelId }) => {
    const matchesQuery = !normalizedQuery || [id, event.providerId ?? "", event.categories.join(" "), modelId, event.finalOutcome]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery
      && (category === "All categories" || event.categories.includes(category))
      && (outcome === "All outcomes" || event.finalOutcome === outcome);
  });
  const selected = filtered.find((record) => record.id === selectedId) ?? filtered[0];
  const isFiltered = Boolean(query || category !== "All categories" || outcome !== "All outcomes");
  const isReady = localData.status === "ready" || localData.status === "partial";

  function clearFilters() {
    setQuery("");
    setCategory("All categories");
    setOutcome("All outcomes");
  }

  return <div className={styles.page}>
    <PageHeading eyebrow="GOVERNANCE / LOCAL EVENT ARCHIVE" title="Audit trail" description="Inspect backend audit metadata captured from successful chat responses." action={<Link href="/settings" className={styles.chatLink}>Manage local data ↗</Link>} />
    <div className={styles.notice} role="note"><span className={styles.noticeIcon} aria-hidden="true">i</span><p><strong>No audit-query endpoint is implemented.</strong> Rows below are actual <code>audit_event</code> objects returned by <code>POST /chat</code> and saved locally. They are not the backend’s complete audit history.</p></div>
    {localData.message && <div className={styles.notice} role="status"><p>{localData.message}</p></div>}
    <Card className={styles.tablePanel}>
      <div className={styles.panelHeading}><div><h2>Captured API events</h2><p>{events.length} audit event{events.length === 1 ? "" : "s"} present in this browser archive</p></div><span className={styles.liveTag}>LOCAL ARCHIVE</span></div>
      <div className={styles.filters}>
        <div className={`${styles.field} ${styles.searchField}`}><label htmlFor="audit-search">Search captured events</label><input id="audit-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Request ID, category, provider…" /></div>
        <div className={styles.field}><label htmlFor="audit-category">Backend category</label><select id="audit-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="audit-outcome">Final outcome</label><select id="audit-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option>All outcomes</option>{outcomes.map((item) => <option key={item}>{item}</option>)}</select></div>
        <Button className={styles.clearButton} variant="secondary" type="button" disabled={!isFiltered} onClick={clearFilters}>Clear filters</Button>
      </div>
      <div className={styles.resultMeta} aria-live="polite"><span><strong>{isReady ? filtered.length : "—"}</strong> of {isReady ? events.length : "—"} captured events</span><span>Event timestamps are from the backend response</span></div>
      {!isReady ? <div className={styles.emptyState}><h3>Local audit records are unavailable</h3><p>{localData.message ?? "Check browser storage access in Settings."}</p></div> : filtered.length ? <div className={styles.recordsGrid}>
        <DataTable className={styles.dataTable}>
          <thead><tr><th scope="col">Request ID</th><th scope="col">Categories</th><th scope="col">Policy action</th><th scope="col">Provider invoked</th><th scope="col">Final outcome</th><th scope="col">Backend time</th></tr></thead>
          <tbody>{filtered.map((record) => <tr key={record.id} aria-selected={selected?.id === record.id}>
            <td><div className={styles.eventCell}><button type="button" className={styles.eventButton} aria-pressed={selected?.id === record.id} onClick={() => setSelectedId(record.id)}>{record.id}</button><span className={styles.eventId}>POST /chat · saved locally</span></div></td>
            <td>{record.event.categories.length ? record.event.categories.join(", ") : "None returned"}</td>
            <td><StatusIndicator label={record.event.policyAction} /></td>
            <td>{record.event.providerInvoked ? "Yes" : "No"}</td>
            <td><StatusIndicator label={record.event.finalOutcome} /></td>
            <td className={styles.timeCell}>{formatDate(record.event.timestamp)}</td>
          </tr>)}</tbody>
        </DataTable>
        <EventDetails record={selected} />
      </div> : <div className={styles.emptyState}><h3>{events.length ? "No captured events match these filters" : "No audit events have been captured"}</h3><p>{events.length ? "Adjust your search or filters." : "Send a real request in Chat Playground. An event appears here only if the API includes audit_event in its response."}</p>{events.length === 0 && <Link href="/chat" className={styles.chatLink}>Open Chat Playground ↗</Link>}{isFiltered && <Button type="button" variant="quiet" onClick={clearFilters}>Clear filters</Button>}</div>}
      <p className={styles.tableFootnote}>The backend keeps its audit collection in memory. This browser archive cannot query it and may be incomplete.</p>
    </Card>
  </div>;
}
