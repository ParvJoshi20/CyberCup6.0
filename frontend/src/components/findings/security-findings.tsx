"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PageHeading } from "@/components/ui/page-heading";
import { useLocalData } from "@/lib/data/use-local-data";
import { deriveFindings, type FindingRecord } from "@/lib/data/analytics";
import styles from "./security-findings.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unavailable";
}

function FindingDetails({ finding }: { finding: FindingRecord | undefined }) {
  if (!finding) return <Card className={styles.detailPanel}><div className={styles.empty}><h3>Select a finding</h3><p>Choose a result to inspect its API response metadata.</p></div></Card>;
  return <Card className={styles.detailPanel}>
    <div className={styles.detailTitle}><div><h2>Finding details</h2><p>Safe finding text from a backend response</p></div></div>
    <p className={styles.detailText}>{finding.summary}</p>
    <div className={styles.detailFields}>
      <div><span>Request ID</span><code>{finding.requestId}</code></div>
      <div><span>Provider</span><strong>{finding.provider ?? "Not reported"}</strong></div>
      <div><span>Model ID</span><strong>{finding.modelId}</strong></div>
      <div><span>Policy action</span><strong>{finding.policyAction}</strong></div>
      <div><span>Output action</span><strong>{finding.outputAction}</strong></div>
      <div><span>Captured locally</span><strong>{formatDate(finding.receivedAt)}</strong></div>
    </div>
    <p className={styles.detailFootnote}>Severity and finding categories are not provided per finding by the current API, so they are not inferred here.</p>
  </Card>;
}

export function SecurityFindings() {
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

  function clearFilters() {
    setQuery("");
    setAction("All policy actions");
  }

  return <div className={styles.page}>
    <PageHeading eyebrow="INVESTIGATION / SAFE FINDINGS" title="Security findings" description="Review safe finding strings returned by real chat requests saved in this browser." action={<Link href="/settings" className={styles.link}>Manage local data ↗</Link>} />
    <div className={styles.notice} role="note"><span className={styles.noticeIcon} aria-hidden="true">i</span><p><strong>No findings-history endpoint exists.</strong> This page reads only the <code>safe_findings</code> values returned by successful <code>POST /chat</code> responses and saved locally. The backend does not provide per-finding severity or category fields.</p></div>
    {localData.message && <div className={styles.notice} role="status"><p>{localData.message}</p></div>}
    <Card className={styles.explorerPanel}>
      <div className={styles.panelHeading}><div><h2>Saved API findings</h2><p>{localData.chats.length} successful chat response{localData.chats.length === 1 ? "" : "s"} in this browser</p></div><span className={styles.sourceChip}>LOCAL ARCHIVE</span></div>
      <div className={styles.filters} aria-label="Finding filters">
        <div className={`${styles.field} ${styles.searchField}`}><label htmlFor="finding-search">Search findings</label><input id="finding-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finding text, request ID, provider…" /></div>
        <div className={styles.field}><label htmlFor="finding-action">Policy action</label><select id="finding-action" value={action} onChange={(event) => setAction(event.target.value)}><option>All policy actions</option>{actions.map((item) => <option key={item}>{item}</option>)}</select></div>
        <Button className={styles.clearButton} type="button" variant="secondary" disabled={!isFiltered} onClick={clearFilters}>Clear filters</Button>
      </div>
      <div className={styles.resultMeta} aria-live="polite"><span><strong>{isReady ? filtered.length : "—"}</strong> of {isReady ? findings.length : "—"} saved findings</span><span>Source: local copies of backend responses</span></div>
      {!isReady ? <div className={styles.empty}><h3>Local findings are unavailable</h3><p>{localData.message ?? "Check browser storage access in Settings."}</p></div> : filtered.length ? <div className={styles.explorerGrid}>
        <DataTable className={styles.table}>
          <thead><tr><th scope="col">Safe finding</th><th scope="col">Policy</th><th scope="col">Provider</th><th scope="col">Request ID</th><th scope="col">Captured</th></tr></thead>
          <tbody>{filtered.map((finding) => <tr key={finding.id} aria-selected={selected?.id === finding.id}>
            <td><div className={styles.rowName}><button className={styles.rowButton} type="button" onClick={() => setSelectedId(finding.id)} aria-pressed={selected?.id === finding.id}>{finding.summary}</button><span className={styles.rowMeta}>{finding.modelId}</span></div></td>
            <td><span className={styles.outcome}>{finding.policyAction}</span></td>
            <td>{finding.provider ?? "Not reported"}</td>
            <td><code>{finding.requestId}</code></td>
            <td>{formatDate(finding.receivedAt)}</td>
          </tr>)}</tbody>
        </DataTable>
        <FindingDetails finding={selected} />
      </div> : <div className={styles.empty}><h3>{findings.length ? "No findings match these filters" : "No security findings have been saved"}</h3><p>{findings.length ? "Change the search or policy action filter to see other saved responses." : "Send a real request in Chat Playground. Only safe findings returned by the API will appear here."}</p>{findings.length === 0 && <Link href="/chat" className={styles.link}>Open Chat Playground ↗</Link>}{isFiltered && <Button type="button" variant="quiet" onClick={clearFilters}>Clear filters</Button>}</div>}
      <p className={styles.detailFootnote}>Saved text is browser-local and common credential patterns are redacted before storage. It is not a server-side findings history.</p>
    </Card>
  </div>;
}
