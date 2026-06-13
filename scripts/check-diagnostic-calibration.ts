import fs from "fs";
import path from "path";
import {
  auditDiagnosticBlueprint,
  initialAssessmentBlueprint,
  selectDiagnosticProblems
} from "../apps/web/app/diagnostic/initialAssessment";
import { DIAGNOSTIC_CALIBRATION_TARGETS } from "../apps/web/app/shared/diagnosticCalibration";
import type { Problem } from "../packages/adaptive-engine";

const PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const problems = JSON.parse(fs.readFileSync(PROBLEMS_PATH, "utf8")) as Problem[];
const selectedItems = selectDiagnosticProblems(initialAssessmentBlueprint, problems);
const audit = auditDiagnosticBlueprint(initialAssessmentBlueprint, problems, selectedItems);

console.log("Diagnostic calibration check");
console.log(`- Slots selected: ${audit.selectedCount}/${audit.slotCount}`);

DIAGNOSTIC_CALIBRATION_TARGETS.forEach((target) => {
  const selected = audit.stageCounts[target.stage] ?? 0;
  const expected = audit.expectedSlotsByStage[target.stage] ?? target.minEvidenceSlots;
  console.log(`- ${target.stage}: ${selected}/${expected} slot(s), minimum evidence ${target.minEvidenceSlots}`);
});

if (audit.missingFallbacks.length > 0) {
  console.error(`Missing diagnostic slots: ${audit.missingFallbacks.join(", ")}`);
  process.exit(1);
}

const thinStages = DIAGNOSTIC_CALIBRATION_TARGETS.filter((target) => {
  const selected = audit.stageCounts[target.stage] ?? 0;
  return selected < target.minEvidenceSlots;
});

if (thinStages.length > 0) {
  console.error(`Insufficient calibration stages: ${thinStages.map((stage) => stage.stage).join(", ")}`);
  process.exit(1);
}

console.log("- Warnings: 0");
console.log("- Errors: 0");
