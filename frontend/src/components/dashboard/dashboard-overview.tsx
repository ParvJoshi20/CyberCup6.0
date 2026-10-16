"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { deriveChatMetrics, deriveDailyActivity } from "@/lib/data/analytics";
import { useLocalData } from "@/lib/data/use-local-data";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unavailable";
}

function Metric({ label, value, note, tone, index }: { label: string; value: string; note: string; tone: string; index: string }) {
  return <Card className={`metric-card metric-${tone}`}>
    <div className="metric-topline"><span>{label}</span><span className="metric-number">{index}</span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-meta"><i className="metric-indicator" />{note}</div>
  </Card>;
}

function ActivityPanel({ days, isReady }: { days: ReturnType<typeof deriveDailyActivity>; isReady: boolean }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const hasActivity = days.some((day) => day.count > 0);
  return <Card className="dashboard-panel">
    <div className="panel-heading"><div><h2>Saved chat activity</h2><p>Successful responses recorded locally · last 7 days</p></div><StatusIndicator label={isReady ? "LOCAL DATA" : "UNAVAILABLE"} tone={isReady ? "neutral" : "warning"} /></div>
    {isReady && hasActivity ? <svg className="activity-chart" viewBox="0 0 570 226" role="img" aria-label={`Successful local chat responses in the last seven days: ${days.map((day) => `${day.label} ${day.count}`).join(", ")}`}>
      {[45, 90, 135, 180].map((y) => <line key={y} x1="30" y1={y} x2="556" y2={y} className="chart-gridline" />)}
      {days.map((day, index) => {
        const x = 45 + index * 72;
        const height = day.count ? Math.max(7, (day.count / max) * 145) : 0;
        return <g key={day.key}>
          {day.count > 0 && <rect x={x} y={190 - height} width="24" height={height} rx="4" className="activity-bar bar-inspected" />}
          <text x={x + 12} y="211" textAnchor="middle" className="chart-axis-label">{day.label}</text>
          <text x={x + 12} y={day.count ? 183 - height : 183} textAnchor="middle" className="chart-axis-label">{day.count || ""}</text>
        </g>;
      })}
    </svg> : <div className="data-empty">{isReady ? "No successful chat responses were recorded in the last seven days." : "Local data is not available to chart."}</div>}
    <p className="chart-footnote">Counts use locally saved successful <code>POST /chat</code> responses. No server history is queried.</p>
  </Card>;
}

function ActionPanel({ title, subtitle, items, isReady }: { title: string; subtitle: string; items: { label: string; count: number }[]; isReady: boolean }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return <Card className="dashboard-panel">
    <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><StatusIndicator label={isReady ? "LOCAL DATA" : "UNAVAILABLE"} tone={isReady ? "neutral" : "warning"} /></div>
    {isReady && items.length ? <div className="local-action-list">
      {items.map((item, index) => <div className="local-action-row" key={item.label}>
        <span className={`local-action-dot local-action-${index % 4}`} aria-hidden="true" />
        <span>{item.label}</span>
        <strong>{item.count}</strong>
        <i><b style={{ width: `${Math.max(3, item.count / max * 100)}%` }} /></i>
      </div>)}
    </div> : <div className="data-empty">{isReady ? "No response outcomes have been recorded yet." : "Local data is not available."}</div>}
    <p className="panel-caption">Values come from actual saved backend responses.</p>
  </Card>;
}

function RecentResponses({ chats, isReady }: { chats: ReturnType<typeof useLocalData>["chats"]; isReady: boolean }) {
  const recent = [...chats].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 8);
  return <Card className="dashboard-panel events-panel">
    <div className="panel-heading"><div><h2>Recent API responses</h2><p>Saved locally in this browser</p></div><Link href="/audit" className="panel-link">Open audit view <span aria-hidden="true">↗</span></Link></div>
    {isReady && recent.length ? <DataTable className="events-table">
      <thead><tr><th scope="col">Request ID</th><th scope="col">Provider</th><th scope="col">Policy</th><th scope="col">Safe findings</th><th scope="col">Received</th></tr></thead>
      <tbody>{recent.map((chat) => <tr key={chat.requestId}>
        <td><code className="event-id">{chat.requestId}</code></td>
        <td className="provider-code">{chat.provider ?? "Not reported"}</td>
        <td><span className="outcome-tag">{chat.policyAction}</span></td>
        <td>{chat.safeFindings.length}</td>
        <td className="event-time">{formatDate(chat.receivedAt)}</td>
      </tr>)}</tbody>
    </DataTable> : <div className="data-empty">{isReady ? <>No saved API responses yet. <Link href="/chat">Open Chat Playground</Link> to send a real request.</> : "Local records could not be loaded."}</div>}
    <p className="panel-caption">Request identifiers and security metadata come from the returned API response.</p>
  </Card>;
}

export function DashboardOverview() {
  const localData = useLocalData();
  const isReady = localData.status === "ready" || localData.status === "partial";
  const metrics = useMemo(() => deriveChatMetrics(localData.chats), [localData.chats]);
  const days = useMemo(() => deriveDailyActivity(localData.chats, new Date()), [localData.chats]);
  const value = (number: number) => isReady ? number.toLocaleString() : "—";

  return <div className="dashboard-page">
    <PageHeading
      eyebrow="SECURITY OVERVIEW"
      title="Dashboard"
      description="A local view of successful chat responses captured from the implemented API."
      action={<Link href="/settings" className="panel-link">Manage local data <span aria-hidden="true">↗</span></Link>}
    />
    <div className="demo-notice local-notice" role="note"><span className="demo-notice-icon" aria-hidden="true">i</span><p><strong>Browser archive</strong><span>Metrics below are derived from real API responses saved in this browser. This is not server telemetry or a complete audit history.</span></p></div>
    {localData.message && <div className="storage-warning" role="status">{localData.message} <Link href="/settings">Review local data settings</Link></div>}
    <section className="metric-grid" aria-label="Local response metrics">
      <Metric label="Saved responses" value={value(metrics.responses)} note="Successful POST /chat calls" tone="violet" index="01" />
      <Metric label="Local conversations" value={value(metrics.conversations)} note="Generated browser IDs" tone="rose" index="02" />
      <Metric label="Safe findings" value={value(metrics.safeFindings)} note="Returned by the API" tone="blue" index="03" />
      <Metric label="Audit events captured" value={value(metrics.auditEvents)} note="Present in saved responses" tone="amber" index="04" />
    </section>
    <section className="dashboard-grid" aria-label="Derived local response summaries">
      <ActivityPanel days={days} isReady={isReady} />
      <ActionPanel title="Policy actions" subtitle="Actual response security.action values" items={metrics.policyActions} isReady={isReady} />
      <ActionPanel title="Output actions" subtitle="Actual response security.output_action values" items={metrics.outputActions} isReady={isReady} />
    </section>
    <RecentResponses chats={localData.chats} isReady={isReady} />
  </div>;
}
