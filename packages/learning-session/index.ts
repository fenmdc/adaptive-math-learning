import { AdaptiveEngine, type AdaptiveState } from "../adaptive-engine";
import type { PracticeProblem } from "../problem-bank/types";

export const LEARNING_SESSION_STORAGE_KEY = "adaptive-math-learning:session:v1";
export const LEARNING_SESSION_SCHEMA_VERSION = 1;

export type LearningAttemptResult = {
  correct: boolean;
  nextProblemId?: string;
  remediation: boolean;
  state: AdaptiveState;
  weakConcepts: string[];
};

export type LearningSessionState = {
  problemId?: string;
  selected?: string;
  hintVisible?: boolean;
  result?: Omit<LearningAttemptResult, "state">;
  attempts: number;
  correctAttempts: number;
  adaptiveState: AdaptiveState;
};

export type StoredLearningSession = LearningSessionState & {
  version: typeof LEARNING_SESSION_SCHEMA_VERSION;
  updatedAt: string;
};

export type LearningSessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function createInitialAdaptiveState(problems: PracticeProblem[]): AdaptiveState {
  return {
    mastery: Object.fromEntries([...new Set(problems.flatMap((problem) => problem.concepts))].map((concept) => [concept, 0.5])),
    recentAttempts: [],
  };
}

export function createInitialLearningSession(problems: PracticeProblem[]): LearningSessionState {
  return {
    problemId: problems[0]?.id,
    attempts: 0,
    correctAttempts: 0,
    adaptiveState: createInitialAdaptiveState(problems),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function parseLearningSession(raw: string, problems: PracticeProblem[]): StoredLearningSession | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(value) || value.version !== LEARNING_SESSION_SCHEMA_VERSION) return undefined;
  if (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt))) return undefined;
  if (!isInteger(value.attempts) || !isInteger(value.correctAttempts) || value.correctAttempts > value.attempts) {
    return undefined;
  }

  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const conceptIds = new Set(problems.flatMap((problem) => problem.concepts));
  if (typeof value.problemId !== "string" || !problemById.has(value.problemId)) return undefined;

  const problem = problemById.get(value.problemId)!;
  if (value.selected !== undefined && (typeof value.selected !== "string" || !problem.choices.includes(value.selected))) {
    return undefined;
  }
  if (value.hintVisible !== undefined && typeof value.hintVisible !== "boolean") return undefined;

  if (!isRecord(value.adaptiveState) || !isRecord(value.adaptiveState.mastery)) return undefined;
  const masteryEntries = Object.entries(value.adaptiveState.mastery);
  if (
    masteryEntries.length !== conceptIds.size
    || masteryEntries.some(([concept, mastery]) => !conceptIds.has(concept) || typeof mastery !== "number" || mastery < 0 || mastery > 1)
  ) {
    return undefined;
  }

  const recentAttempts = value.adaptiveState.recentAttempts;
  if (!Array.isArray(recentAttempts) || recentAttempts.length > 8 || recentAttempts.length > value.attempts) {
    return undefined;
  }
  if (recentAttempts.some((attempt) => {
    if (!isRecord(attempt) || typeof attempt.correct !== "boolean") return true;
    if (typeof attempt.problemId !== "string" || !problemById.has(attempt.problemId)) return true;
    return !Array.isArray(attempt.concepts)
      || attempt.concepts.some((concept) => typeof concept !== "string" || !conceptIds.has(concept));
  })) {
    return undefined;
  }

  if (value.result !== undefined) {
    if (!isRecord(value.result) || value.selected === undefined || typeof value.result.correct !== "boolean") return undefined;
    if (value.result.correct !== (value.selected === problem.answer)) return undefined;
    if (typeof value.result.remediation !== "boolean" || !Array.isArray(value.result.weakConcepts)) return undefined;
    if (value.result.weakConcepts.some((concept) => typeof concept !== "string" || !conceptIds.has(concept))) return undefined;
    if (value.result.nextProblemId !== undefined
      && (typeof value.result.nextProblemId !== "string" || !problemById.has(value.result.nextProblemId))) {
      return undefined;
    }
  }

  return value as StoredLearningSession;
}

export function loadLearningSession(storage: LearningSessionStorage, problems: PracticeProblem[]) {
  try {
    const raw = storage.getItem(LEARNING_SESSION_STORAGE_KEY);
    return raw ? parseLearningSession(raw, problems) : undefined;
  } catch {
    return undefined;
  }
}

export function saveLearningSession(
  storage: LearningSessionStorage,
  session: LearningSessionState,
  updatedAt = new Date().toISOString(),
) {
  const stored: StoredLearningSession = {
    ...session,
    version: LEARNING_SESSION_SCHEMA_VERSION,
    updatedAt,
  };
  storage.setItem(LEARNING_SESSION_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function clearLearningSession(storage: LearningSessionStorage) {
  try {
    storage.removeItem(LEARNING_SESSION_STORAGE_KEY);
  } catch {
    // Clearing browser storage is best-effort; callers still reset in-memory state.
  }
}

export function runLearningAttempt({
  answer,
  problem,
  problems,
  state,
}: {
  answer: string;
  problem: PracticeProblem;
  problems: PracticeProblem[];
  state: AdaptiveState;
}): LearningAttemptResult {
  const correct = answer === problem.answer;
  const engine = new AdaptiveEngine(problems);
  const result = engine.run(state, {
    problemId: problem.id,
    concepts: problem.concepts,
    correct,
  });

  return {
    correct,
    nextProblemId: result.next_problem?.id,
    remediation: result.remediation,
    state: result.updated_state,
    weakConcepts: result.weak_concepts,
  };
}
