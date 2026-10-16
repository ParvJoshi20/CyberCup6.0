import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";

const metrics = [
  { label: "Inspected requests", value: "12,842", note: "Across the sample period", icon: "↗", tone: "violet" },
  { label: "Blocked requests", value: "381", note: "Policy blocked", icon: "⊘", tone: "rose" },
  { label: "Redacted findings", value: "742", note: "Sensitive patterns masked", icon: "◈", tone: "blue" },
  { label: "High-severity signals", value: "60", note: "Critical and high", icon: "⚑", tone: "amber" },
];

const activity = [
  { day: "Fri", inspected: 51, blocked: 22 },
  { day: "Sat", inspected: 64, blocked: 29 },
  { day: "Sun", inspected: 58, blocked: 24 },
  { day: "Mon", inspected: 78, blocked: 36 },
  { day: "Tue", inspected: 68, blocked: 30 },
  { day: "Wed", inspected: 88, blocked: 43 },
  { day: "Thu", inspected: 79, blocked: 34 },
];

const categories = [
  { label: "Sensitive data", count: 286, color: "#a78bfa" },
  { label: "Prompt injection", count: 194, color: "#d946ef" },
  { label: "Credential request", count: 138, color: "#60a5fa" },
  { label: "Secret pattern", count: 92, color: "#fbbf24" },
  { label: "Other signals", count: 64, color: "#85859a" },
];

const severity = [
  { label: "Critical", count: 18, color: "#fb7185" },
  { label: "High", count: 42, color: "#d946ef" },
  { label: "Medium", count: 83, color: "#9b78f5" },
  { label: "Low", count: 64, color: "#60a5fa" },
];

const outcomes = [
  { label: "Blocked", count: 381, tone: "danger" },
  { label: "Redacted", count: 742, tone: "warning" },
  { label: "Allowed", count: 11_719, tone: "success" },
];

const events = [
  { id: "DEMO-8F2A", event: "Prompt injection indicator", category: "Prompt injection", severity: "High", outcome: "Blocked", time: "Oct 16 · 10:42" },
  { id: "DEMO-71C4", event: "Sensitive data pattern", category: "Sensitive data", severity: "Medium", outcome: "Redacted", time: "Oct 16 · 10:37" },
  { id: "DEMO-6B19", event: "Credential request signal", category: "Credential request", severity: "High", outcome: "Blocked", time: "Oct 16 · 10:21" },
  { id: "DEMO-42D0", event: "Secret-like pattern", category: "Secret pattern", severity: "Critical", outcome: "Redacted", time: "Oct 16 · 09:58" },
  { id: "DEMO-2A86", event: "Request passed inspection", category: "Policy check", severity: "Low", outcome: "Allowed", time: "Oct 16 · 09:44" },
];

const chart = { left: 42, right: 742, top: 18, bottom: 190 };
const xAt = (index: number) => chart.left + (chart.right - chart.left) * index / (activity.length - 1);
const yAt = (value: number) => chart.bottom - value * (chart.bottom - chart.top) / 100;
const linePath = (key: "inspected" | "blocked") => activity.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(point[key])}`).join(" ");

function ActivityChart() {
  return (
    <div className="activity-chart-wrap">
      <div className="chart-legend" aria-label="Chart series">
        <span><i className="legend-swatch inspected-swatch" />Inspected requests</span>
        <span><i className="legend-swatch blocked-swatch" />Blocked</span>
      </div>
      <svg className="activity-chart" viewBox="0 0 760 240" role="img" aria-label="Illustrative seven day trend of inspected and blocked requests">
        <defs>
          <linearGradient id="inspected-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9b78f5" stopOpacity=".19"/><stop offset="1" stopColor="#9b78f5" stopOpacity="0"/></linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((value) => <g key={value}>
          <line x1={chart.left} x2={chart.right} y1={yAt(value)} y2={yAt(value)} className="chart-gridline" />
          <text x="4" y={yAt(value) + 4} className="chart-axis-label">{value}</text>
        </g>)}
        <path d={`${linePath("inspected")} L${chart.right},${chart.bottom} L${chart.left},${chart.bottom} Z`} fill="url(#inspected-area)" />
        <path d={linePath("inspected")} className="chart-line chart-line-inspected" />
        <path d={linePath("blocked")} className="chart-line chart-line-blocked" />
        {activity.map((point, index) => <g key={point.day}>
          <circle cx={xAt(index)} cy={yAt(point.inspected)} r="3.3" className="chart-point inspected-point" />
          <circle cx={xAt(index)} cy={yAt(point.blocked)} r="3" className="chart-point blocked-point" />
          <text x={xAt(index)} y="220" textAnchor="middle" className="chart-axis-label">{point.day}</text>
        </g>)}
      </svg>
      <div className="chart-footnote">Relative sample volume · illustrative values</div>
    </div>
  );
}

function MetricCard({ item, index }: { item: (typeof metrics)[number]; index: number }) {
  return <Card className={`metric-card metric-${item.tone}`}>
    <div className="metric-topline"><span>{item.label}</span><span className="metric-icon" aria-hidden="true">{item.icon}</span></div>
    <div className="metric-value" aria-label={`${item.value} demo ${item.label.toLowerCase()}`}>{item.value}</div>
    <div className="metric-meta"><span className="metric-indicator" aria-hidden="true" />{item.note}<span className="metric-number">0{index + 1}</span></div>
  </Card>;
}

function CategoryBreakdown() {
  const max = Math.max(...categories.map((item) => item.count));
  return <Card className="dashboard-panel category-panel">
    <PanelHeading title="Finding categories" subtitle="Illustrative sample distribution" />
    <div className="category-list">
      {categories.map((item) => <div className="category-row" key={item.label}>
        <div className="category-label"><span className="category-dot" style={{ background: item.color }} />{item.label}<strong>{item.count}</strong></div>
        <div className="category-track" role="img" aria-label={`${item.label}: ${item.count} demo findings`}><span style={{ width: `${item.count / max * 100}%`, background: item.color }} /></div>
      </div>)}
    </div>
    <div className="panel-caption">All category totals are illustrative demo data.</div>
  </Card>;
}

function SeverityDistribution() {
  const total = severity.reduce((sum, item) => sum + item.count, 0);
  const stops = severity.reduce<{ stops: string[]; end: number }>((distribution, item) => {
    const end = distribution.end + item.count / total * 100;
    return { stops: [...distribution.stops, `${item.color} ${distribution.end}% ${end}%`], end };
  }, { stops: [], end: 0 }).stops.join(", ");

  return <Card className="dashboard-panel severity-panel">
    <PanelHeading title="Severity & outcomes" subtitle="Illustrative request distribution" />
    <div className="distribution-content">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={`Demo severity distribution. ${severity.map((item) => `${item.label}: ${item.count}`).join(", ")}`}>
        <div className="donut-center"><strong>{total}</strong><span>signals</span></div>
      </div>
      <div className="severity-legend">
        {severity.map((item) => <div className="distribution-legend-row" key={item.label}><span className="category-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.count}</strong></div>)}
      </div>
    </div>
    <div className="outcome-list" aria-label="Demo outcomes">
      {outcomes.map((item) => <div className="outcome-item" key={item.label}><StatusIndicator label={item.label} tone={item.tone as "danger" | "warning" | "success"} /><strong>{item.count.toLocaleString()}</strong></div>)}
    </div>
  </Card>;
}

function PanelHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="demo-chip">DEMO DATA</span></div>;
}

function RecentEvents() {
  return <Card className="dashboard-panel events-panel">
    <PanelHeading title="Recent security events" subtitle="Illustrative examples · not backend audit history" />
    <DataTable>
      <thead><tr><th scope="col">Event</th><th scope="col">Category</th><th scope="col">Severity</th><th scope="col">Outcome</th><th scope="col">Time</th></tr></thead>
      <tbody>{events.map((event) => <tr key={event.id}>
        <td><span className="event-name">{event.event}</span><span className="event-id">{event.id}</span></td>
        <td>{event.category}</td>
        <td><span className={`severity-tag severity-${event.severity.toLowerCase()}`}><span className="category-dot" />{event.severity}</span></td>
        <td><span className={`outcome-tag outcome-${event.outcome.toLowerCase()}`}>{event.outcome}</span></td>
        <td className="event-time">{event.time}</td>
      </tr>)}</tbody>
    </DataTable>
    <div className="panel-caption">Sample rows only. No audit history endpoint is connected.</div>
  </Card>;
}

export function DashboardOverview() {
  return <div className="dashboard-page">
    <PageHeading
      eyebrow="OVERVIEW"
      title="Security dashboard"
      description="An illustrative overview of security activity across the sample period."
      action={<StatusIndicator label="DEMO DATA · illustrative only" tone="neutral" />}
    />
    <div className="demo-notice" role="note"><span className="demo-notice-icon" aria-hidden="true">i</span><p><strong>Demonstration data</strong><span>Metrics, charts, and events below are illustrative samples. They are not live telemetry or persistent audit records.</span></p></div>
    <section className="metric-grid" aria-label="Illustrative overview metrics">
      {metrics.map((item, index) => <MetricCard item={item} index={index} key={item.label} />)}
    </section>
    <section className="dashboard-grid dashboard-grid-primary" aria-label="Illustrative activity charts">
      <Card className="dashboard-panel activity-panel"><PanelHeading title="Security activity" subtitle="Request volume · last 7 days"/><ActivityChart /></Card>
      <SeverityDistribution />
    </section>
    <section className="dashboard-grid dashboard-grid-secondary" aria-label="Illustrative findings and events">
      <CategoryBreakdown />
      <RecentEvents />
    </section>
  </div>;
}
