import fs from "fs";

export function exportTrajectory(logs) {
  fs.writeFileSync(
    "packages/simulation/output/logs.json",
    JSON.stringify(logs, null, 2)
  );
}
