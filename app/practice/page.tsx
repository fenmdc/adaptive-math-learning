import { redirect } from "next/navigation";

import { loadLearningSection, type ContentLanguage, type LearningMode } from "@/packages/learning-catalog";
import AppShell from "../ui/AppShell";
import SectionPractice from "../ui/SectionPractice";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string; mode?: string; track?: string; course?: string; theme?: string }>;
}) {
  const query = await searchParams;
  if (!query.course) redirect("/library");
  const language: ContentLanguage = query.language === "zh" ? "zh" : "en";
  const mode: LearningMode = query.mode === "practice" ? "practice" : "learn";
  const section = loadLearningSection({
    language,
    track: query.track,
    course: query.course,
    theme: query.theme,
    limit: 40,
  });

  return (
    <AppShell activeRoute="/library">
      <SectionPractice
        language={language}
        mode={mode}
        problems={section.problems}
        sectionTitle={query.theme || query.course}
        total={section.total}
      />
    </AppShell>
  );
}
