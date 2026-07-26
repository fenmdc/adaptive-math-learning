import { loadProblemBank, parseCsv } from "@/packages/problem-bank";
import fs from "node:fs";
import path from "node:path";
import AppShell from "./ui/AppShell";
import LearningWorkbench from "./ui/LearningWorkbench";

export default function Home() {
  const problemBank = loadProblemBank();
  const conceptCount = parseCsv(
    fs.readFileSync(path.join(process.cwd(), "datasets", "concepts", "concepts.csv"), "utf8"),
  ).length;
  const datasetStats = {
    concepts: conceptCount,
    problems: problemBank.problems.length,
    reviewedProblems: problemBank.problems.filter((problem) => problem.reviewStatus === "reviewed").length,
    sourceRecords: problemBank.totalRecords,
    textbookSources: 5,
  };

  return (
    <AppShell activeRoute="/">
      <LearningWorkbench datasetStats={datasetStats} problems={problemBank.problems} />
    </AppShell>
  );
}
