import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Card } from "@/components/ui/card";

const pages: Record<string, { title: string; description: string }> = {
  chat: { title: "Chat playground", description: "Test messages against AegisGate’s security pipeline." },
  findings: { title: "Security findings", description: "Explore security findings from processed requests." },
  threats: { title: "Threat signals", description: "Review security signals and their context." },
  audit: { title: "Audit trail", description: "Review available audit events and request outcomes." },
  evaluations: { title: "Evaluation lab", description: "Explore security evaluation scenarios and results." },
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();

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
