import type { Problem } from "../../../../packages/adaptive-engine";

export type ConceptState = {
  concept: string;
  mastery: number;
  stability: number;
  attempts: number;
  correct: number;
  recentAccuracy: number;
  averageResponseTimeSeconds: number;
  averageConfidence: number;
  wrongStreak: number;
  lastPracticedAt: string;
  reviewDueAt: string;
};

export type StudentModel = {
  version: 1;
  updatedAt: string;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  difficultyComfort: number;
  averageResponseTimeSeconds: number;
  averageConfidence: number;
  conceptStates: Record<string, ConceptState>;
  misconceptionCounts: Record<string, number>;
  recommendedReviewConcepts: string[];
};

export type StudentAttemptInput = {
  problem: Problem;
  correct: boolean;
  mastery: Record<string, number>;
  responseTimeSeconds?: number;
  confidence?: number;
  answeredAt?: string;
};

const DEFAULT_MASTERY = 0.5;
const DEFAULT_STABILITY = 0.45;

export function createEmptyStudentModel(): StudentModel {
  const now = new Date().toISOString();

  return {
    version: 1,
    updatedAt: now,
    totalAttempts: 0,
    totalCorrect: 0,
    overallAccuracy: 0,
    difficultyComfort: 3,
    averageResponseTimeSeconds: 0,
    averageConfidence: 0,
    conceptStates: {},
    misconceptionCounts: {},
    recommendedReviewConcepts: []
  };
}

export function updateStudentModel(
  currentModel: StudentModel | null,
  input: StudentAttemptInput
): StudentModel {
  const model = currentModel ?? createEmptyStudentModel();
  const answeredAt = input.answeredAt ?? new Date().toISOString();
  const totalAttempts = model.totalAttempts + 1;
  const totalCorrect = model.totalCorrect + (input.correct ? 1 : 0);
  const conceptStates = { ...model.conceptStates };
  const misconceptionCounts = { ...model.misconceptionCounts };
  const responseTimeSeconds = sanitizeResponseTime(input.responseTimeSeconds);
  const confidence = sanitizeConfidence(input.confidence);

  input.problem.concepts.forEach((concept) => {
    const previous = conceptStates[concept] ?? createConceptState(concept, answeredAt);
    const attempts = previous.attempts + 1;
    const correct = previous.correct + (input.correct ? 1 : 0);
    const mastery = input.mastery[concept] ?? previous.mastery ?? DEFAULT_MASTERY;
    const fluencyAdjustment = scoreFluency(responseTimeSeconds, confidence, input.correct);
    const stabilityDelta = input.correct ? 0.08 + fluencyAdjustment : -0.12 + fluencyAdjustment;
    const stability = clamp(previous.stability + stabilityDelta + (mastery - previous.mastery) * 0.2);
    const recentAccuracy = rollingRecentAccuracy(previous.recentAccuracy, input.correct);
    const averageResponseTimeSeconds = rollingAverage(previous.averageResponseTimeSeconds, responseTimeSeconds);
    const averageConfidence = rollingAverage(previous.averageConfidence, confidence);
    const wrongStreak = input.correct ? 0 : previous.wrongStreak + 1;

    conceptStates[concept] = {
      concept,
      mastery,
      stability,
      attempts,
      correct,
      recentAccuracy,
      averageResponseTimeSeconds,
      averageConfidence,
      wrongStreak,
      lastPracticedAt: answeredAt,
      reviewDueAt: nextReviewDueAt(answeredAt, stability, input.correct)
    };
  });

  if (!input.correct) {
    input.problem.misconceptions.forEach((misconception) => {
      misconceptionCounts[misconception] = (misconceptionCounts[misconception] ?? 0) + 1;
    });
  }

  const nextModel: StudentModel = {
    ...model,
    updatedAt: answeredAt,
    totalAttempts,
    totalCorrect,
    overallAccuracy: totalCorrect / totalAttempts,
    difficultyComfort: updateDifficultyComfort(model.difficultyComfort, input.problem.difficulty, input.correct, confidence),
    averageResponseTimeSeconds: rollingAverage(model.averageResponseTimeSeconds, responseTimeSeconds),
    averageConfidence: rollingAverage(model.averageConfidence, confidence),
    conceptStates,
    misconceptionCounts,
    recommendedReviewConcepts: selectReviewConcepts(conceptStates, answeredAt)
  };

  return nextModel;
}

export function summarizeStudentModel(model: StudentModel | null) {
  if (!model) {
    return {
      focusConcepts: [] as ConceptState[],
      secureConcepts: [] as ConceptState[],
      reviewDueConcepts: [] as ConceptState[],
      lowConfidenceConcepts: [] as ConceptState[],
      topMisconceptions: [] as Array<{ misconception: string; count: number }>
    };
  }

  const states = Object.values(model.conceptStates);
  const now = new Date().toISOString();

  return {
    focusConcepts: [...states]
      .filter((state) => state.mastery < 0.62 || state.stability < 0.5 || state.wrongStreak > 0)
      .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
      .slice(0, 4),
    secureConcepts: [...states]
      .filter((state) => state.mastery >= 0.62 && state.stability >= 0.55 && state.wrongStreak === 0)
      .sort((a, b) => b.mastery + b.stability - (a.mastery + a.stability))
      .slice(0, 4),
    reviewDueConcepts: [...states]
      .filter((state) => state.reviewDueAt <= now)
      .sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt))
      .slice(0, 4),
    lowConfidenceConcepts: [...states]
      .filter((state) => state.averageConfidence > 0 && state.averageConfidence < 3)
      .sort((a, b) => a.averageConfidence - b.averageConfidence)
      .slice(0, 4),
    topMisconceptions: Object.entries(model.misconceptionCounts)
      .map(([misconception, count]) => ({ misconception, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  };
}

function createConceptState(concept: string, now: string): ConceptState {
  return {
    concept,
    mastery: DEFAULT_MASTERY,
    stability: DEFAULT_STABILITY,
    attempts: 0,
    correct: 0,
    recentAccuracy: 0.5,
    averageResponseTimeSeconds: 0,
    averageConfidence: 0,
    wrongStreak: 0,
    lastPracticedAt: now,
    reviewDueAt: now
  };
}

function rollingRecentAccuracy(previous: number, correct: boolean) {
  return clamp(previous * 0.7 + (correct ? 1 : 0) * 0.3);
}

function rollingAverage(previous: number | undefined, value: number | undefined) {
  if (value === undefined) return previous ?? 0;
  if (!previous) return value;
  return previous * 0.75 + value * 0.25;
}

function updateDifficultyComfort(previous: number, difficulty: number, correct: boolean, confidence?: number) {
  const target = correct ? difficulty + 0.25 : difficulty - 0.35;
  const confidenceAdjustment = confidence === undefined ? 0 : (confidence - 3) * 0.06;
  return clampToRange(previous * 0.82 + (target + confidenceAdjustment) * 0.18, 1, 5);
}

function nextReviewDueAt(answeredAt: string, stability: number, correct: boolean) {
  const baseDays = correct ? 2 + Math.round(stability * 8) : 1;
  const due = new Date(answeredAt);
  due.setDate(due.getDate() + baseDays);
  return due.toISOString();
}

function selectReviewConcepts(conceptStates: Record<string, ConceptState>, now: string) {
  return Object.values(conceptStates)
    .filter((state) => state.reviewDueAt <= now || state.stability < 0.48 || state.wrongStreak > 0)
    .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
    .slice(0, 6)
    .map((state) => state.concept);
}

function scoreFocusConcept(state: ConceptState) {
  const confidencePenalty = state.averageConfidence > 0 ? Math.max(0, (3 - state.averageConfidence) / 3) * 0.35 : 0;
  return (
    (1 - state.mastery) * 1.2 +
    (1 - state.stability) +
    state.wrongStreak * 0.25 +
    (1 - state.recentAccuracy) * 0.6 +
    confidencePenalty
  );
}

function clamp(value: number) {
  return clampToRange(value, 0, 1);
}

function clampToRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeResponseTime(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 3600) : undefined;
}

function sanitizeConfidence(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? clampToRange(Math.round(value), 1, 5) : undefined;
}

function scoreFluency(responseTimeSeconds: number | undefined, confidence: number | undefined, correct: boolean) {
  const confidenceScore = confidence === undefined ? 0 : (confidence - 3) * 0.015;
  const speedScore = responseTimeSeconds === undefined ? 0 : responseTimeSeconds <= 45 ? 0.012 : responseTimeSeconds >= 180 ? -0.018 : 0;

  return correct ? confidenceScore + speedScore : Math.min(0.01, confidenceScore + speedScore);
}
