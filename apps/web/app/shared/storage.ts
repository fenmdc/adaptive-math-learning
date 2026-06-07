import type { Problem } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { LearningPlan } from "./learningPlan";
import type { StudentModel } from "./studentModel";

export const PRACTICE_LOGS_KEY = "adaptive-math-learning.practiceLogs";
export const DIAGNOSTIC_LOGS_KEY = "adaptive-math-learning.diagnosticLogs";
export const LEARNING_PLAN_KEY = "adaptive-math-learning.learningPlan";
export const STUDENT_MODEL_KEY = "adaptive-math-learning.studentModel";

export function createPracticeLog(input: {
  step: number;
  problem: Problem;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts?: string[];
  remediation: boolean;
  nextProblem: Problem;
  mastery: Record<string, number>;
  recommendationReason: string;
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
    correct: input.correct,
    weakConcepts: input.weakConcepts,
    fluencyConcepts: input.fluencyConcepts,
    remediation: input.remediation,
    nextProblem: input.nextProblem.id,
    mastery: input.mastery,
    recommendationReason: input.recommendationReason,
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
    const raw = window.localStorage.getItem(LEARNING_PLAN_KEY);
    return raw ? (JSON.parse(raw) as LearningPlan) : null;
  } catch {
    return null;
  }
}

export function readStudentModel() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STUDENT_MODEL_KEY);
    return raw ? (JSON.parse(raw) as StudentModel) : null;
  } catch {
    return null;
  }
}

function readLogs(key: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SimulationLog[]) : [];
  } catch {
    return [];
  }
}

export function writePracticeLogs(logs: SimulationLog[]) {
  window.localStorage.setItem(PRACTICE_LOGS_KEY, JSON.stringify(logs));
}

export function writeDiagnosticLogs(logs: SimulationLog[]) {
  window.localStorage.setItem(DIAGNOSTIC_LOGS_KEY, JSON.stringify(logs));
}

export function writeLearningPlan(plan: LearningPlan) {
  window.localStorage.setItem(LEARNING_PLAN_KEY, JSON.stringify(plan));
}

export function writeStudentModel(model: StudentModel) {
  window.localStorage.setItem(STUDENT_MODEL_KEY, JSON.stringify(model));
}

export function clearPracticeLogs() {
  window.localStorage.removeItem(PRACTICE_LOGS_KEY);
}

export function clearDiagnosticLogs() {
  window.localStorage.removeItem(DIAGNOSTIC_LOGS_KEY);
  window.localStorage.removeItem(LEARNING_PLAN_KEY);
  window.localStorage.removeItem(STUDENT_MODEL_KEY);
}
