import { accountScopedKey, type AccountStorage } from ".";

export const LEGACY_LEARNING_KEYS = {
  practiceLogs: "adaptive-math-learning.practiceLogs",
  diagnosticLogs: "adaptive-math-learning.diagnosticLogs",
  learningPlan: "adaptive-math-learning.learningPlan",
  studentModel: "adaptive-math-learning.studentModel",
  assessmentReport: "adaptive-math-learning.assessmentReport",
  sessionPreferences: "adaptive-math-learning.sessionPreferences",
  subjectiveReviewQueue: "adaptive-math-learning.subjectiveReviewQueue",
  sessionCompletions: "adaptive-math-learning.sessionCompletions",
} as const;

export type LegacyLearningSummary = {
  practiceAttempts: number;
  diagnosticAttempts: number;
  sessionCompletions: number;
  subjectiveReviews: number;
  hasLearningPlan: boolean;
  hasStudentModel: boolean;
  hasAssessmentReport: boolean;
};

function readJson(storage: AccountStorage, key: string, accountId: string) {
  try {
    const raw = storage.getItem(accountScopedKey(key, accountId));
    return raw ? JSON.parse(raw) as unknown : undefined;
  } catch {
    return undefined;
  }
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function hasObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readLegacyLearningSummary(storage: AccountStorage, accountId: string): LegacyLearningSummary {
  return {
    practiceAttempts: arrayCount(readJson(storage, LEGACY_LEARNING_KEYS.practiceLogs, accountId)),
    diagnosticAttempts: arrayCount(readJson(storage, LEGACY_LEARNING_KEYS.diagnosticLogs, accountId)),
    sessionCompletions: arrayCount(readJson(storage, LEGACY_LEARNING_KEYS.sessionCompletions, accountId)),
    subjectiveReviews: arrayCount(readJson(storage, LEGACY_LEARNING_KEYS.subjectiveReviewQueue, accountId)),
    hasLearningPlan: hasObject(readJson(storage, LEGACY_LEARNING_KEYS.learningPlan, accountId)),
    hasStudentModel: hasObject(readJson(storage, LEGACY_LEARNING_KEYS.studentModel, accountId)),
    hasAssessmentReport: hasObject(readJson(storage, LEGACY_LEARNING_KEYS.assessmentReport, accountId)),
  };
}
