import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_LIST_KEY,
  ACTIVE_ACCOUNT_KEY,
  GUEST_ACCOUNT_ID,
  accountScopedKey,
  getActiveAccountId,
  readAccounts,
  setActiveAccount,
} from "../packages/accounts";
import { LEGACY_LEARNING_KEYS, readLegacyLearningSummary } from "../packages/accounts/legacy-history";

function memoryStorage(entries: Array<[string, string]> = []) {
  const values = new Map(entries);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const oldAccount = {
  id: "student-old", name: "Old learner", role: "student", level: "AMC8", goal: "Prepare", accent: "blue",
  createdAt: "2026-06-01T00:00:00.000Z", lastUsedAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z",
};

test("existing local accounts are normalized and selected with legacy keys", () => {
  const storage = memoryStorage([
    [ACCOUNT_LIST_KEY, JSON.stringify([oldAccount])],
    [ACTIVE_ACCOUNT_KEY, oldAccount.id],
  ]);

  assert.deepEqual(readAccounts(storage), [oldAccount]);
  assert.equal(getActiveAccountId(storage), oldAccount.id);
  assert.equal(setActiveAccount(storage, oldAccount.id, "2026-07-26T00:00:00.000Z")?.lastUsedAt, "2026-07-26T00:00:00.000Z");
  assert.equal(accountScopedKey("session", oldAccount.id), "adaptive-math-learning.account.student-old.session");
  assert.equal(accountScopedKey("session", GUEST_ACCOUNT_ID), "session");
});

test("invalid active account falls back to guest", () => {
  const storage = memoryStorage([[ACTIVE_ACCOUNT_KEY, "missing"]]);
  assert.equal(getActiveAccountId(storage), GUEST_ACCOUNT_ID);
});

test("legacy learning history is summarized without modifying original entries", () => {
  const practiceKey = accountScopedKey(LEGACY_LEARNING_KEYS.practiceLogs, oldAccount.id);
  const modelKey = accountScopedKey(LEGACY_LEARNING_KEYS.studentModel, oldAccount.id);
  const storage = memoryStorage([
    [practiceKey, JSON.stringify([{ id: 1 }, { id: 2 }])],
    [modelKey, JSON.stringify({ mastery: {} })],
  ]);
  const before = new Map(storage.values);

  assert.deepEqual(readLegacyLearningSummary(storage, oldAccount.id), {
    practiceAttempts: 2,
    diagnosticAttempts: 0,
    sessionCompletions: 0,
    subjectiveReviews: 0,
    hasLearningPlan: false,
    hasStudentModel: true,
    hasAssessmentReport: false,
  });
  assert.deepEqual(storage.values, before);
});
