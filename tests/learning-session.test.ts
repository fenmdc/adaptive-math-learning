import assert from "node:assert/strict";
import test from "node:test";

import {
  LEARNING_SESSION_STORAGE_KEY,
  clearLearningSession,
  createInitialAdaptiveState,
  createInitialLearningSession,
  loadLearningSession,
  parseLearningSession,
  runLearningAttempt,
  saveLearningSession,
} from "../packages/learning-session";
import { ACCOUNT_LIST_KEY, ACTIVE_ACCOUNT_KEY, accountScopedKey } from "../packages/accounts";
import type { PracticeProblem } from "../packages/problem-bank/types";

const problems: PracticeProblem[] = [
  {
    id: "ratio-1",
    statement: "6 apples cost $4. What do 3 cost?",
    answer: "$2",
    choices: ["$1", "$2", "$3", "$4"],
    difficulty: 2,
    concepts: ["ratio"],
    conceptLabel: "Ratios",
    conceptLabels: { ratio: "Ratios" },
    skills: ["unit_rate"],
    patterns: ["proportional_reasoning"],
    misconceptionFeedback: "Check the order of the ratio before multiplying by the requested amount.",
    hint: "Find the unit rate, then multiply it by the requested number of apples.",
    reviewStatus: "reviewed",
    explanation: "Half the apples cost half as much.",
  },
  {
    id: "percent-1",
    statement: "50% of 10?",
    answer: "5",
    choices: ["2", "4", "5", "10"],
    difficulty: 2,
    concepts: ["percent"],
    conceptLabel: "Percentages",
    conceptLabels: { percent: "Percentages" },
    skills: ["percentage_calculation"],
    patterns: ["direct_conversion"],
    misconceptionFeedback: "Convert the percent to a fraction or decimal before calculating.",
    hint: "Rewrite 50% as one half before multiplying by ten.",
    reviewStatus: "reviewed",
    explanation: "Half of 10 is 5.",
  },
];

test("learning session grades the answer and returns engine state", () => {
  const state = createInitialAdaptiveState(problems);
  const result = runLearningAttempt({ answer: "$2", problem: problems[0], problems, state });

  assert.equal(result.correct, true);
  assert.equal(result.state.mastery.ratio, 0.58);
  assert.equal(result.nextProblemId, "percent-1");
  assert.equal(state.mastery.ratio, 0.5);
});

test("learning session persistence round-trips valid state", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const session = createInitialLearningSession(problems);
  const result = runLearningAttempt({ answer: "$2", problem: problems[0], problems, state: session.adaptiveState });
  const { state, ...storedResult } = result;
  const completed = {
    ...session,
    selected: "$2",
    result: storedResult,
    attempts: 1,
    correctAttempts: 1,
    adaptiveState: state,
  };

  saveLearningSession(storage, completed, "2026-07-25T08:00:00.000Z");
  assert.deepEqual(loadLearningSession(storage, problems), {
    ...completed,
    version: 1,
    updatedAt: "2026-07-25T08:00:00.000Z",
  });
});

test("learning session rejects malformed, stale, and unknown-problem data", () => {
  assert.equal(parseLearningSession("not json", problems), undefined);
  assert.equal(parseLearningSession(JSON.stringify({ version: 0 }), problems), undefined);

  const valid = {
    ...createInitialLearningSession(problems),
    version: 1,
    updatedAt: "2026-07-25T08:00:00.000Z",
  };
  assert.equal(parseLearningSession(JSON.stringify({ ...valid, problemId: "unknown" }), problems), undefined);
  assert.equal(parseLearningSession(JSON.stringify({
    ...valid,
    adaptiveState: { ...valid.adaptiveState, mastery: { ratio: 2, percent: 0.5 } },
  }), problems), undefined);
});

test("reset removes only the adaptive math session key", () => {
  const values = new Map([
    [LEARNING_SESSION_STORAGE_KEY, "session"],
    ["another-project:session", "keep"],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  clearLearningSession(storage);
  assert.equal(values.has(LEARNING_SESSION_STORAGE_KEY), false);
  assert.equal(values.get("another-project:session"), "keep");
});

test("learning sessions are isolated by active account", () => {
  const accounts = [{
    id: "student-a", name: "A", role: "student", level: "AMC8", goal: "Practice", accent: "blue",
    createdAt: "2026-07-25T00:00:00.000Z", lastUsedAt: "2026-07-25T00:00:00.000Z", updatedAt: "2026-07-25T00:00:00.000Z",
  }, {
    id: "student-b", name: "B", role: "student", level: "Pre-Algebra", goal: "Practice", accent: "green",
    createdAt: "2026-07-25T00:00:00.000Z", lastUsedAt: "2026-07-25T00:00:00.000Z", updatedAt: "2026-07-25T00:00:00.000Z",
  }];
  const values = new Map<string, string>([
    [ACCOUNT_LIST_KEY, JSON.stringify(accounts)],
    [ACTIVE_ACCOUNT_KEY, "student-a"],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const session = createInitialLearningSession(problems);

  saveLearningSession(storage, session, "2026-07-25T08:00:00.000Z");
  assert.ok(values.has(accountScopedKey(LEARNING_SESSION_STORAGE_KEY, "student-a")));
  assert.equal(loadLearningSession(storage, problems, "student-b"), undefined);

  values.set(ACTIVE_ACCOUNT_KEY, "student-b");
  saveLearningSession(storage, { ...session, attempts: 1 }, "2026-07-25T09:00:00.000Z");
  assert.equal(loadLearningSession(storage, problems, "student-a")?.attempts, 0);
  assert.equal(loadLearningSession(storage, problems, "student-b")?.attempts, 1);

  clearLearningSession(storage, "student-b");
  assert.ok(values.has(accountScopedKey(LEARNING_SESSION_STORAGE_KEY, "student-a")));
  assert.equal(values.has(accountScopedKey(LEARNING_SESSION_STORAGE_KEY, "student-b")), false);
});

test("storage restrictions fall back without breaking the learning session", () => {
  const restrictedStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };

  assert.equal(loadLearningSession(restrictedStorage, problems), undefined);
  assert.doesNotThrow(() => clearLearningSession(restrictedStorage));
});
