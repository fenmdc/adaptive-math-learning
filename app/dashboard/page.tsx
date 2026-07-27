import logs from "../../packages/simulation/output/logs.json";
import { loadProblemBank } from "../../packages/problem-bank";
import { loadLegacyPracticeProblems } from "../../packages/problem-bank/legacy";

import AppShell from "../ui/AppShell";
import ProgressDashboard from "../ui/ProgressDashboard";

export default function DashboardPage() {
  const starterProblems = loadProblemBank().problems;
  const starterIds = new Set(starterProblems.map((problem) => problem.id));
  return (
    <AppShell activeRoute="/dashboard">
      <ProgressDashboard
        problems={[...starterProblems, ...loadLegacyPracticeProblems().filter((problem) => !starterIds.has(problem.id))]}
        simulationLogs={logs}
      />
    </AppShell>
  );
}
