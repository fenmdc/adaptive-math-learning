import type { SimulationLog } from "../dashboard/types";

export type CalibrationStage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
export type CalibrationConfidence = "High" | "Medium" | "Low";
export type CalibrationStatus = "Calibrated" | "Partial" | "Insufficient";

export type CalibrationStageTarget = {
  stage: CalibrationStage;
  minEvidenceSlots: number;
  readyAccuracy: number;
  developingAccuracy: number;
  purpose: string;
};

export type CalibrationStageEvidence = {
  stage: CalibrationStage;
  expectedSlots: number;
  completedSlots: number;
  accuracy: number;
  lowConfidenceSignals: number;
  slowSignals: number;
  status: CalibrationStatus;
  confidence: CalibrationConfidence;
  evidence: string;
};

export type DiagnosticCalibrationSummary = {
  version: "Diagnostic Calibration v1";
  expectedSlots: number;
  completedSlots: number;
  confidence: CalibrationConfidence;
  stageEvidence: CalibrationStageEvidence[];
  retestRecommendation: string;
  nextCheckpoint: string;
};

export const CALIBRATION_STAGES: CalibrationStage[] = [
  "Foundation",
  "Bridge",
  "Algebra Readiness",
  "AMC8 Transfer"
];

export const DIAGNOSTIC_CALIBRATION_TARGETS: CalibrationStageTarget[] = [
  {
    stage: "Foundation",
    minEvidenceSlots: 5,
    readyAccuracy: 80,
    developingAccuracy: 60,
    purpose: "Check arithmetic prerequisites before interpreting algebra or AMC8 misses."
  },
  {
    stage: "Bridge",
    minEvidenceSlots: 4,
    readyAccuracy: 75,
    developingAccuracy: 50,
    purpose: "Check symbol fluency, expression handling, and translation into algebra."
  },
  {
    stage: "Algebra Readiness",
    minEvidenceSlots: 6,
    readyAccuracy: 70,
    developingAccuracy: 50,
    purpose: "Check whether Pre-Algebra evidence can support Algebra 1 placement."
  },
  {
    stage: "AMC8 Transfer",
    minEvidenceSlots: 7,
    readyAccuracy: 65,
    developingAccuracy: 45,
    purpose: "Check transfer across geometry, number theory, counting, and data contexts."
  }
];

export function buildExpectedSlotsByStage(slots: Array<{ stage: CalibrationStage }>) {
  return CALIBRATION_STAGES.reduce<Record<CalibrationStage, number>>((summary, stage) => {
    summary[stage] = slots.filter((slot) => slot.stage === stage).length;
    return summary;
  }, {
    Foundation: 0,
    Bridge: 0,
    "Algebra Readiness": 0,
    "AMC8 Transfer": 0
  });
}

export function summarizeDiagnosticCalibration(
  logs: SimulationLog[],
  expectedSlotsByStage: Record<CalibrationStage, number> = defaultExpectedSlotsByStage()
): DiagnosticCalibrationSummary {
  const stageEvidence = DIAGNOSTIC_CALIBRATION_TARGETS.map((target) =>
    summarizeStageCalibration(target, logs, expectedSlotsByStage[target.stage] || target.minEvidenceSlots)
  );
  const expectedSlots = stageEvidence.reduce((sum, stage) => sum + stage.expectedSlots, 0);
  const completedSlots = stageEvidence.reduce((sum, stage) => sum + stage.completedSlots, 0);
  const confidence = getOverallConfidence(stageEvidence);

  return {
    version: "Diagnostic Calibration v1",
    expectedSlots,
    completedSlots,
    confidence,
    stageEvidence,
    retestRecommendation: buildRetestRecommendation(confidence, stageEvidence),
    nextCheckpoint: buildNextCheckpoint(confidence, stageEvidence)
  };
}

function summarizeStageCalibration(
  target: CalibrationStageTarget,
  logs: SimulationLog[],
  expectedSlots: number
): CalibrationStageEvidence {
  const stageLogs = logs.filter((log) => inferCalibrationStage(log) === target.stage);
  const completedSlots = stageLogs.length;
  const correct = stageLogs.filter((log) => log.correct).length;
  const accuracy = completedSlots === 0 ? 0 : Math.round((correct / completedSlots) * 100);
  const lowConfidenceSignals = stageLogs.filter((log) => (log.confidence ?? 5) <= 2).length;
  const slowSignals = stageLogs.filter((log) => (log.responseTimeSeconds ?? 0) >= 120).length;
  const evidenceRatio = expectedSlots === 0 ? 1 : completedSlots / expectedSlots;
  const status = getStageStatus(evidenceRatio, lowConfidenceSignals, slowSignals);
  const confidence = getStageConfidence(status, completedSlots, expectedSlots);

  return {
    stage: target.stage,
    expectedSlots,
    completedSlots,
    accuracy,
    lowConfidenceSignals,
    slowSignals,
    status,
    confidence,
    evidence: buildStageEvidence(target, completedSlots, expectedSlots, accuracy, lowConfidenceSignals, slowSignals)
  };
}

function getStageStatus(
  evidenceRatio: number,
  lowConfidenceSignals: number,
  slowSignals: number
): CalibrationStatus {
  if (evidenceRatio >= 1 && lowConfidenceSignals <= 1 && slowSignals <= 2) return "Calibrated";
  if (evidenceRatio >= 0.5) return "Partial";
  return "Insufficient";
}

function getStageConfidence(
  status: CalibrationStatus,
  completedSlots: number,
  expectedSlots: number
): CalibrationConfidence {
  if (completedSlots === 0 || expectedSlots === 0) return "Low";
  if (status === "Calibrated") return "High";
  if (status === "Partial") return "Medium";
  return "Low";
}

function getOverallConfidence(stageEvidence: CalibrationStageEvidence[]): CalibrationConfidence {
  const calibrated = stageEvidence.filter((stage) => stage.status === "Calibrated").length;
  const partial = stageEvidence.filter((stage) => stage.status === "Partial").length;
  const completed = stageEvidence.reduce((sum, stage) => sum + stage.completedSlots, 0);
  const expected = stageEvidence.reduce((sum, stage) => sum + stage.expectedSlots, 0);
  const completionRatio = expected === 0 ? 0 : completed / expected;

  if (completionRatio >= 0.95 && calibrated >= 3) return "High";
  if (completionRatio >= 0.65 && calibrated + partial >= 3) return "Medium";
  return "Low";
}

function buildStageEvidence(
  target: CalibrationStageTarget,
  completedSlots: number,
  expectedSlots: number,
  accuracy: number,
  lowConfidenceSignals: number,
  slowSignals: number
) {
  return `${completedSlots}/${expectedSlots} slot(s), ${accuracy}% accuracy, ${lowConfidenceSignals} low-confidence signal(s), ${slowSignals} slow signal(s). ${target.purpose}`;
}

function buildRetestRecommendation(
  confidence: CalibrationConfidence,
  stageEvidence: CalibrationStageEvidence[]
) {
  if (confidence === "Low") {
    const missingStage = stageEvidence.find((stage) => stage.status === "Insufficient");
    return missingStage
      ? `Retake diagnostic after completing the missing ${missingStage.stage} evidence.`
      : "Retake diagnostic after one focused mini session to improve evidence quality.";
  }

  const weakestStage = [...stageEvidence]
    .filter((stage) => stage.completedSlots > 0)
    .sort((a, b) => a.accuracy - b.accuracy || a.completedSlots - b.completedSlots)[0];

  if (confidence === "Medium") {
    return weakestStage
      ? `Run a short checkpoint after practicing ${weakestStage.stage}.`
      : "Run a short checkpoint after the next mini session.";
  }

  return "Recheck after 2-3 mini sessions or when moving to a new stage.";
}

function buildNextCheckpoint(
  confidence: CalibrationConfidence,
  stageEvidence: CalibrationStageEvidence[]
) {
  const partialStage = stageEvidence.find((stage) => stage.status !== "Calibrated");

  if (partialStage) {
    return `Next checkpoint should target ${partialStage.stage}.`;
  }

  if (confidence === "High") {
    return "Next checkpoint can be a shorter confirmation diagnostic.";
  }

  return "Next checkpoint should repeat the full blueprint.";
}

function inferCalibrationStage(log: SimulationLog): CalibrationStage {
  if (isCalibrationStage(log.diagnosticStage)) return log.diagnosticStage;

  const primary = log.concepts[0] ?? "";
  if (primary.startsWith("arith_")) return "Foundation";
  if (primary.startsWith("prealg_")) return "Bridge";
  if (primary.startsWith("alg_")) return "Algebra Readiness";
  return "AMC8 Transfer";
}

function isCalibrationStage(value: unknown): value is CalibrationStage {
  return typeof value === "string" && CALIBRATION_STAGES.includes(value as CalibrationStage);
}

function defaultExpectedSlotsByStage() {
  return DIAGNOSTIC_CALIBRATION_TARGETS.reduce<Record<CalibrationStage, number>>((summary, target) => {
    summary[target.stage] = target.minEvidenceSlots;
    return summary;
  }, {
    Foundation: 0,
    Bridge: 0,
    "Algebra Readiness": 0,
    "AMC8 Transfer": 0
  });
}
