import logs from "../../data/logs.json";

import DashboardClient from "./ui/DashboardClient";
import type { SimulationLog } from "./types";

const simulationLogs = logs as SimulationLog[];

export default function Dashboard() {
  return <DashboardClient fallbackLogs={simulationLogs} />;
}
