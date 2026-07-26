import logs from "../../packages/simulation/output/logs.json";
import { loadProblemBank } from "../../packages/problem-bank";

import AppShell from "../ui/AppShell";
import ProgressDashboard from "../ui/ProgressDashboard";

export default function DashboardPage() {
  return (
    <AppShell activeRoute="/dashboard">
      <ProgressDashboard problems={loadProblemBank().problems} simulationLogs={logs} />
    </AppShell>
  );
}
