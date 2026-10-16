import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import styles from "./evaluation-lab.module.css";

export function EvaluationLab() {
  return <div className={styles.page}>
    <PageHeading eyebrow="TESTING / CAPABILITY STATUS" title="Evaluation lab" description="Evaluation results are shown only after a real evaluation has been implemented and executed." action={<StatusIndicator label="NOT AVAILABLE" tone="warning" />} />
    <div className={styles.notice} role="note"><span className={styles.noticeIcon} aria-hidden="true">i</span><p><strong>No evaluation runner or endpoint is implemented.</strong> A chat request is an individual security-pipeline interaction, not an evaluation run. This page therefore has no scenario catalog, scores, or test history to display.</p></div>
    <Card className={styles.catalogPanel}>
      <div className={styles.emptyState}>
        <span aria-hidden="true">◇</span>
        <h3>Evaluation results are unavailable</h3>
        <p>The current backend exposes <code>GET /health</code> and <code>POST /chat</code> only. Neither endpoint runs or stores evaluation cases.</p>
        <div className={styles.detailActions}>
          <Link href="/chat" className={styles.chatLink}>Open Chat Playground <span aria-hidden="true">↗</span></Link>
          <Link href="/settings" className={styles.chatLink}>Manage local data <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </Card>
  </div>;
}
