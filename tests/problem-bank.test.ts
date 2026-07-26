import assert from "node:assert/strict";
import test from "node:test";

import { generateChoices, loadProblemBank, parseCsv } from "../packages/problem-bank";

test("parseCsv preserves quoted commas", () => {
  const records = parseCsv('id,statement,answer\np1,"Add 1, then 2",3\n');

  assert.deepEqual(records, [{ id: "p1", statement: "Add 1, then 2", answer: "3" }]);
});

test("loadProblemBank exposes every answerable source record", () => {
  const bank = loadProblemBank();

  assert.equal(bank.totalRecords, 50);
  assert.equal(bank.problems.length, 50);
  assert.equal(bank.skippedRecords, 0);
  assert.ok(bank.problems.every((problem) => problem.choices.length === 4));
  assert.ok(bank.problems.every((problem) => new Set(problem.choices).size === 4));
  assert.ok(bank.problems.every((problem) => problem.choices.includes(problem.answer)));
});

test("reviewed problems include actionable learning support", () => {
  const bank = loadProblemBank();
  const reviewed = bank.problems.filter((problem) => problem.reviewStatus === "reviewed");

  assert.deepEqual(
    reviewed.map((problem) => problem.id),
    Array.from({ length: 50 }, (_, index) => `amc8_p${String(index + 1).padStart(3, "0")}`),
  );
  assert.ok(reviewed.every((problem) => problem.statement.length >= 25));
  assert.ok(bank.problems.every((problem) => problem.hint.length >= 20));
  assert.ok(bank.problems.every((problem) => problem.explanation.length >= 30));
  assert.ok(bank.problems.every((problem) => problem.misconceptionFeedback.length >= 20));
  assert.ok(bank.problems.every((problem) => problem.choices.every((choice) => !choice.startsWith("Option "))));
});

test("generated choices are deterministic for numeric and symbolic answers", () => {
  assert.deepEqual(generateChoices("8", "amc8_p001"), generateChoices("8", "amc8_p001"));
  assert.equal(new Set(generateChoices("3/5", "amc8_p006")).size, 4);
  assert.ok(generateChoices("6x", "amc8_p025").includes("6x"));
});
