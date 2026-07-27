import { loadProblemBank, parseCsv } from "@/packages/problem-bank";
import { getLegacyProblemStats, loadLegacyPracticeProblems } from "@/packages/problem-bank/legacy";
import fs from "node:fs";
import path from "node:path";
import AppShell from "./ui/AppShell";
import LearningWorkbench from "./ui/LearningWorkbench";

export default function Home() {
  const problemBank = loadProblemBank();
  const legacyStats = getLegacyProblemStats();
  const starterIds = new Set(problemBank.problems.map((problem) => problem.id));
  const practiceProblems = [
    ...problemBank.problems,
    ...loadLegacyPracticeProblems().filter((problem) => !starterIds.has(problem.id)),
  ];
  const conceptCount = parseCsv(
    fs.readFileSync(path.join(process.cwd(), "datasets", "concepts", "concepts.csv"), "utf8"),
  ).length;
  const datasetStats = {
    concepts: legacyStats.concepts || conceptCount,
    problems: problemBank.problems.length,
    reviewedProblems: problemBank.problems.filter((problem) => problem.reviewStatus === "reviewed").length,
    sourceRecords: problemBank.totalRecords,
    textbookSources: 5,
    importedProblems: legacyStats.total,
    autoGradableProblems: legacyStats.autoGradable,
    manualReviewProblems: legacyStats.manualReview,
  };

  return (
    <AppShell activeRoute="/">
      <LearningWorkbench datasetStats={datasetStats} problems={practiceProblems} />
    </AppShell>
  );
}
