"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { clearAegisGateBrowserData, deleteChatRecord, getBrowserStorageForWrite, updateChatRecord, type SavedChatRecord } from "@/lib/data/local-data";
import { useLocalData } from "@/lib/data/use-local-data";
import styles from "./local-data-settings.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unavailable";
}

function SavedRecordRow({ record, editable, onSave, onDelete }: {
  record: SavedChatRecord;
  editable: boolean;
  onSave: (requestId: string, note: string) => void;
  onDelete: (record: SavedChatRecord) => void;
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  return <tr>
    <td><code>{record.requestId}</code><small>{formatDate(record.receivedAt)}</small></td>
    <td><span>{record.policyAction}</span><small>Output · {record.outputAction}</small></td>
    <td><label className={styles.srOnly} htmlFor={`note-${record.requestId}`}>Local note for request {record.requestId}</label><textarea ref={noteRef} id={`note-${record.requestId}`} className={styles.noteInput} defaultValue={record.note} onChange={(event) => setIsDirty(event.target.value !== record.note)} maxLength={500} placeholder="Add an investigation note…" disabled={!editable} /></td>
    <td><div className={styles.rowActions}><Button type="button" variant="quiet" disabled={!editable || !isDirty} onClick={() => onSave(record.requestId, noteRef.current?.value ?? record.note)}>Save note</Button><Button type="button" variant="secondary" disabled={!editable} onClick={() => onDelete(record)}>Delete</Button></div></td>
  </tr>;
}

export function LocalDataSettings() {
  const localData = useLocalData();
  const [feedback, setFeedback] = useState("");
  const hasReadableData = localData.status === "ready" || localData.status === "partial";
  const statusLabel = localData.status === "ready" ? "AVAILABLE"
    : localData.status === "partial" ? "PARTIALLY READABLE"
      : localData.status === "loading" ? "CHECKING"
        : localData.status === "unavailable" ? "UNAVAILABLE" : "NEEDS ATTENTION";

  function clearData() {
    const count = hasReadableData ? `${localData.chats.length} AegisGate chat ${localData.chats.length === 1 ? "record" : "records"}` : "all saved AegisGate records";
    const confirmed = window.confirm(`Clear ${count} and AegisGate's older tab snapshots from this browser? This cannot be undone. Other websites' storage will not be changed.`);
    if (!confirmed) return;
    const cleared = clearAegisGateBrowserData();
    setFeedback(cleared ? "AegisGate local data was cleared from this browser." : "Browser storage could not be cleared. No other site data was touched.");
  }

  function saveNote(requestId: string, note: string) {
    const result = updateChatRecord(getBrowserStorageForWrite(), requestId, { note });
    setFeedback(result.ok ? "Local note saved." : "The note could not be saved. Check browser storage and data status.");
  }

  function deleteRecord(record: SavedChatRecord) {
    if (!window.confirm(`Delete saved response ${record.requestId} and its local note from this browser? This cannot be undone.`)) return;
    const result = deleteChatRecord(getBrowserStorageForWrite(), record.requestId);
    setFeedback(result.ok ? `Saved response ${record.requestId} was deleted.` : "The response could not be deleted. Check browser storage and data status.");
  }

  return <div className={styles.page}>
    <PageHeading eyebrow="PREFERENCES / BROWSER STORAGE" title="Local data" description="Review and manage the records AegisGate saves in this browser." action={<StatusIndicator label={statusLabel} tone={localData.status === "ready" ? "success" : localData.status === "loading" ? "neutral" : "warning"} />} />
    {localData.message && <div className={styles.notice} role="status">{localData.message}</div>}
    <Card className={styles.panel}>
      <div className={styles.panelHeading}><div><h2>Saved chat responses</h2><p>Versioned AegisGate Local Storage archive</p></div><span className={styles.version}>SCHEMA V1</span></div>
      <div className={styles.summary}>
        <div><span>Readable successful responses</span><strong>{hasReadableData ? localData.chats.length.toLocaleString() : "—"}</strong></div>
        <div><span>Storage source</span><strong>This browser only</strong></div>
        <div><span>Backend history</span><strong>Not available</strong></div>
      </div>
      <div className={styles.explanation}>
        <h3>What is saved</h3>
        <p>Successful <code>POST /chat</code> responses, their actual request IDs and security actions, returned safe findings, and supported audit metadata. Failed requests are not saved. User and response text are filtered for common credential and personal-identifier patterns before storage.</p>
        <h3>Storage limits</h3>
        <p>These records remain in this browser and may be removed if browser site data is cleared. Local Storage is accessible to scripts running on this site and is not a secure credential vault. Do not use it to store passwords, API secrets, or authentication tokens.</p>
        <h3>Malformed or newer data</h3>
        <p>Unreadable records are not silently overwritten during startup or normal saves. Valid records are shown when recoverable. Clearing below is an explicit action and removes only AegisGate-owned keys.</p>
      </div>
      <div className={styles.recordsHeading}><div><h3>Saved response records</h3><p>Write or update a local investigation note, or delete an individual record.</p></div><span>{hasReadableData ? localData.chats.length : "—"}</span></div>
      {hasReadableData && localData.chats.length > 0 ? <DataTable className={styles.recordTable}>
        <thead><tr><th scope="col">Request / captured</th><th scope="col">Actions</th><th scope="col">Local note</th><th scope="col">Manage</th></tr></thead>
        <tbody>{[...localData.chats].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((record) => <SavedRecordRow key={`${record.requestId}:${record.note}`} record={record} editable={localData.status === "ready"} onSave={saveNote} onDelete={deleteRecord} />)}</tbody>
      </DataTable> : <div className={styles.noRecords}>{hasReadableData ? "No saved chat responses yet. Send one in Chat Playground to create a local record." : "Records cannot be listed until the stored data is readable."}</div>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={clearData} disabled={localData.status === "loading" || localData.status === "unavailable"}>Clear AegisGate local data</Button>
        {feedback && <span role="status" aria-live="polite">{feedback}</span>}
      </div>
    </Card>
  </div>;
}
