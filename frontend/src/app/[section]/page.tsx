import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Card } from "@/components/ui/card";
import { SecurityFindings } from "@/components/findings/security-findings";
import { ThreatSignals } from "@/components/threats/threat-signals";
import { AuditTrail } from "@/components/audit/audit-trail";
import { EvaluationLab } from "@/components/evaluations/evaluation-lab";
import { LocalDataSettings } from "@/components/settings/local-data-settings";

const pages: Record<string, { title: string; description: string }> = {
  chat: { title: "Chat playground", description: "Test messages against AegisGate’s security pipeline." },
  findings: { title: "Security findings", description: "Explore security findings from processed requests." },
  threats: { title: "Threat signals", description: "Review security signals and their context." },
  audit: { title: "Audit trail", description: "Review available audit events and request outcomes." },
  evaluations: { title: "Evaluation lab", description: "Explore security evaluation scenarios and results." },
  settings: { title: "Local data", description: "Review and manage records stored in this browser." },
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();

  if (section === "findings") return <SecurityFindings />;
  if (section === "threats") return <ThreatSignals />;
  if (section === "audit") return <AuditTrail />;
  if (section === "evaluations") return <EvaluationLab />;
  if (section === "settings") return <LocalDataSettings />;

  return (
    <>
      <PageHeading eyebrow="WORKSPACE" title={page.title} description={page.description} />
      <Card className="coming-soon">
        <p className="eyebrow">NOT AVAILABLE YET</p>
        <h2>This workspace is planned for a later phase.</h2>
        <p className="muted-copy">This page does not display simulated activity or claim that the feature is operational.</p>
      </Card>
    </>
  );
}
