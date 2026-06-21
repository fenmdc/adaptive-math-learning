import type { Problem, RecommendationExplanation } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { AssessmentReport } from "./assessmentReport";
import { summarizeDiagnosticCalibration } from "./diagnosticCalibration";
import type { LearningPlan } from "./learningPlan";
import type { AbilityDimension, StudentModel } from "./studentModel";
import { accountScopedKey } from "./accounts";

export const PRACTICE_LOGS_KEY = "adaptive-math-learning.practiceLogs";
export const DIAGNOSTIC_LOGS_KEY = "adaptive-math-learning.diagnosticLogs";
export const LEARNING_PLAN_KEY = "adaptive-math-learning.learningPlan";
export const STUDENT_MODEL_KEY = "adaptive-math-learning.studentModel";
export const ASSESSMENT_REPORT_KEY = "adaptive-math-learning.assessmentReport";
export const SESSION_PREFERENCES_KEY = "adaptive-math-learning.sessionPreferences";
export const SUBJECTIVE_REVIEW_QUEUE_KEY = "adaptive-math-learning.subjectiveReviewQueue";

export type SessionPreferences = {
  diagnosticItemCount: number;
  practiceItemCount: number;
};

export type WorkSubmission = {
  drawingDataUrl?: string;
  uploadedFileName?: string;
  uploadedFileType?: string;
  writtenWork?: string;
};

export type SubjectiveReviewItem = {
  aiSuggestion?: {
    feedback: string;
    scoreEstimate?: number;
    status: "not_requested" | "draft";
  };
  concepts: string[];
  createdAt: string;
  id: string;
  problem: string;
  problemStatement: string;
  review?: {
    abilitySignals?: Partial<Record<AbilityDimension, number>>;
    appliedToStudentModelAt?: string;
    feedback: string;
    rubricScores?: Array<{
      id: string;
      label?: string;
      maxScore: number;
      score: number;
    }>;
    score: number;
    scorePercent?: number;
    modelRecommendation?: string;
    reviewedAt: string;
  };
  responseSchema?: Problem["responseSchema"];
  source: "practice" | "diagnostic";
  status: "pending" | "ai_suggested" | "reviewed";
  submittedAnswer: string;
  taxonomy?: Problem["taxonomy"];
  workSubmission: WorkSubmission;
};

const DEFAULT_SESSION_PREFERENCES: SessionPreferences = {
  diagnosticItemCount: 37,
  practiceItemCount: 10
};

export function createPracticeLog(input: {
  step: number;
  problem: Problem;
  diagnosticSlot?: string;
  diagnosticStage?: string;
  assessmentGoal?: string;
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Problem["distractors"] extends Array<infer T> ? T : never;
  workSubmission?: WorkSubmission;
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
    workSubmission: input.workSubmission,
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

export function readSessionPreferences(): SessionPreferences {
  if (typeof window === "undefined") return DEFAULT_SESSION_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(storageKey(SESSION_PREFERENCES_KEY));
    const parsed = raw ? (JSON.parse(raw) as Partial<SessionPreferences>) : {};

    return normalizeSessionPreferences(parsed);
  } catch {
    return DEFAULT_SESSION_PREFERENCES;
  }
}

export function readSubjectiveReviewQueue(): SubjectiveReviewItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(SUBJECTIVE_REVIEW_QUEUE_KEY));
    const parsed = raw ? (JSON.parse(raw) as SubjectiveReviewItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export function writeSessionPreferences(preferences: Partial<SessionPreferences>) {
  const next = normalizeSessionPreferences({
    ...readSessionPreferences(),
    ...preferences
  });

  window.localStorage.setItem(storageKey(SESSION_PREFERENCES_KEY), JSON.stringify(next));

  return next;
}

export function enqueueSubjectiveReview(item: Omit<SubjectiveReviewItem, "aiSuggestion" | "createdAt" | "id" | "status">) {
  if (typeof window === "undefined") return null;

  const queue = readSubjectiveReviewQueue();
  const reviewItem: SubjectiveReviewItem = {
    ...item,
    aiSuggestion: {
      feedback: "AI review is not connected yet. Use human review for this submission.",
      status: "not_requested"
    },
    createdAt: new Date().toISOString(),
    id: `subjective-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "pending"
  };

  window.localStorage.setItem(storageKey(SUBJECTIVE_REVIEW_QUEUE_KEY), JSON.stringify([reviewItem, ...queue]));

  return reviewItem;
}

export function writeSubjectiveReviewQueue(queue: SubjectiveReviewItem[]) {
  window.localStorage.setItem(storageKey(SUBJECTIVE_REVIEW_QUEUE_KEY), JSON.stringify(queue));
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

function normalizeSessionPreferences(value: Partial<SessionPreferences>): SessionPreferences {
  return {
    diagnosticItemCount: clampInteger(value.diagnosticItemCount, 5, 37, DEFAULT_SESSION_PREFERENCES.diagnosticItemCount),
    practiceItemCount: clampInteger(value.practiceItemCount, 3, 40, DEFAULT_SESSION_PREFERENCES.practiceItemCount)
  };
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function migrateAssessmentReport(report: AssessmentReport): AssessmentReport {
  const migrated = report.calibration
    ? report
    : {
        ...report,
        calibration: summarizeDiagnosticCalibration(readDiagnosticLogs())
      };

  return {
    ...migrated,
    seniorHighReadiness: (migrated.seniorHighReadiness ?? []).map(normalizeSeniorHighSignal)
  };
}

function normalizeSeniorHighSignal(signal: AssessmentReport["seniorHighReadiness"][number]) {
  return {
    ...signal,
    practiceHref: signal.practiceHref ?? "/practice?curriculumSystem=CN&language=zh&track=%E4%B8%AD%E6%96%87%E6%A0%A1%E5%86%85&course=CN%20Senior%20High%20Math&autoGradableOnly=false"
  };
}
