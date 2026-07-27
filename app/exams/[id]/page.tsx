import { notFound } from "next/navigation";

import { createMockExamPaper, getMockExamConfig } from "@/packages/mock-exam";
import AppShell from "../../ui/AppShell";
import MockExamRunner from "../../ui/MockExamRunner";

export function generateStaticParams() {
  return ["sat-math", "amc8", "amc10", "amc12"].map((id) => ({ id }));
}

export default async function MockExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = getMockExamConfig(id);
  if (!config) notFound();
  const paper = createMockExamPaper(config);

  return (
    <AppShell activeRoute="/exams">
      <MockExamRunner paper={paper} />
    </AppShell>
  );
}
