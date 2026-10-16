export function StatusIndicator({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`status-indicator status-${tone}`}><span className="status-dot" />{label}</span>;
}
