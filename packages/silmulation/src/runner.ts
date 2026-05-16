import fs from "fs";

export function runSimulation() {

  const logs = [];

  for (let i = 0; i < 20; i++) {
    logs.push({
      step: i,
      problem: "amc8_p001",
      correct: Math.random() > 0.4,
      weakConcepts: ["arith_ratios"]
    });
  }

  fs.writeFileSync(
    "packages/simulation/output/logs.json",
    JSON.stringify(logs, null, 2)
  );

  console.log("Simulation done → logs.json generated");
}
