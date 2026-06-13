import type { Problem, RecommendationExplanation } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { AssessmentReport } from "./assessmentReport";
import { summarizeDiagnosticCalibration } from "./diagnosticCalibration";
import type { LearningPlan } from "./learningPlan";
import type { StudentModel } from "./studentModel";
import { accountScopedKey } from "./accounts";

export const PRACTICE_LOGS_KEY = "adaptive-math-learning.practiceLogs";
export const DIAGNOSTIC_LOGS_KEY = "adaptive-math-learning.diagnosticLogs";
export const LEARNING_PLAN_KEY = "adaptive-math-learning.learningPlan";
export const STUDENT_MODEL_KEY = "adaptive-math-learning.studentModel";
export const ASSESSMENT_REPORT_KEY = "adaptive-math-learning.assessmentReport";

export function createPracticeLog(input: {
  step: number;
  problem: Problem;
  diagnosticSlot?: string;
  diagnosticStage?: string;
  assessmentGoal?: string;
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Problem["distractors"] extends Array<infer T> ? T : never;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts?: string[];
  prerequisiteGaps?: Array<{
    concept: string;
    targetConcept: string;
    depth: number;
    mastery: number;
  }>;
  remediation: boolean;
  nextProblem: Problem;
  mastery: Record<string, number>;
  recommendationReason: string;
  recommendationExplanation?: RecommendationExplanation;
  recommendationScore?: number;
  responseTimeSeconds?: number;
  confidence?: number;
}): SimulationLog {
  return {
    step: input.step,
    problem: input.problem.id,
    statement: input.problem.statement,
    concepts: input.problem.concepts,
    difficulty: input.problem.difficulty,
    taxonomy: input.problem.taxonomy,
    selectedChoiceLabel: input.selectedChoiceLabel,
    selectedChoiceValue: input.selectedChoiceValue,
    selectedDistractor: input.selectedDistractor,
    diagnosticSlot: input.diagnosticSlot,
    diagnosticStage: input.diagnosticStage,
    assessmentGoal: input.assessmentGoal,
    correct: input.correct,
    weakConcepts: input.weakConcepts,
    fluencyConcepts: input.fluencyConcepts,
    prerequisiteGaps: input.prerequisiteGaps,
    remediation: input.remediation,
    nextProblem: input.nextProblem.id,
    mastery: input.mastery,
    recommendationReason: input.recommendationReason,
    recommendationExplanation: input.recommendationExplanation,
    recommendationScore: input.recommendationScore,
    responseTimeSeconds: input.responseTimeSeconds,
    confidence: input.confidence
  };
}

export function readPracticeLogs() {
  return readLogs(PRACTICE_LOGS_KEY);
}

export function readDiagnosticLogs() {
  return readLogs(DIAGNOSTIC_LOGS_KEY);
}

export function readLearningPlan() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(LEARNING_PLAN_KEY));
    return raw ? (JSON.parse(raw) as LearningPlan) : null;
  } catch {
    return null;
  }
}

export function readAssessmentReport() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(ASSESSMENT_REPORT_KEY));
    return raw ? migrateAssessmentReport(JSON.parse(raw) as AssessmentReport) : null;
  } catch {
    return null;
  }
}

export function readStudentModel() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(STUDENT_MODEL_KEY));
    return raw ? (JSON.parse(raw) as StudentModel) : null;
  } catch {
    return null;
  }
}

function readLogs(key: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as SimulationLog[]) : [];
  } catch {
    return [];
  }
}

export function writePracticeLogs(logs: SimulationLog[]) {
  window.localStorage.setItem(storageKey(PRACTICE_LOGS_KEY), JSON.stringify(logs));
}

export function writeDiagnosticLogs(logs: SimulationLog[]) {
  window.localStorage.setItem(storageKey(DIAGNOSTIC_LOGS_KEY), JSON.stringify(logs));
}

export function writeLearningPlan(plan: LearningPlan) {
  window.localStorage.setItem(storageKey(LEARNING_PLAN_KEY), JSON.stringify(plan));
}

export function writeAssessmentReport(report: AssessmentReport) {
  window.localStorage.setItem(storageKey(ASSESSMENT_REPORT_KEY), JSON.stringify(report));
}

export function writeStudentModel(model: StudentModel) {
  window.localStorage.setItem(storageKey(STUDENT_MODEL_KEY), JSON.stringify(model));
}

export function clearPracticeLogs() {
  window.localStorage.removeItem(storageKey(PRACTICE_LOGS_KEY));
}

export function clearDiagnosticLogs() {
  window.localStorage.removeItem(storageKey(DIAGNOSTIC_LOGS_KEY));
  window.localStorage.removeItem(storageKey(LEARNING_PLAN_KEY));
  window.localStorage.removeItem(storageKey(STUDENT_MODEL_KEY));
  window.localStorage.removeItem(storageKey(ASSESSMENT_REPORT_KEY));
}

function storageKey(key: string) {
  return accountScopedKey(key);
}

function migrateAssessmentReport(report: AssessmentReport): AssessmentReport {
  return report.calibration
    ? report
    : {
        ...report,
        calibration: summarizeDiagnosticCalibration(readDiagnosticLogs())
      };
}
