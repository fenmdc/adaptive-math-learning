import fs from "fs";

export type SimulationLog = {
  step: number;
  problem: string;
  correct: boolean;
  weakConcepts: string[];
};

export function exportTrajectory(logs: SimulationLog[]) {
  fs.writeFileSync(
    "packages/simulation/output/logs.json",
    JSON.stringify(logs, null, 2)
  );
}
