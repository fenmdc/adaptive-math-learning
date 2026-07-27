import assert from "node:assert/strict";
import test from "node:test";

import { generateChoices, loadProblemBank, parseCsv } from "../packages/problem-bank";
import {
  adaptLegacyProblem,
  loadLegacyExplanations,
  loadLegacyProblems,
  queryLegacyProblems,
} from "../packages/problem-bank/legacy";

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

test("legacy snapshot retains all problems and matching explanations", () => {
  const problems = loadLegacyProblems();
  const explanations = loadLegacyExplanations();
  const ids = new Set(problems.map((problem) => problem.id));

  assert.equal(problems.length, 8013);
  assert.equal(ids.size, 8013);
  assert.equal(Object.keys(explanations).length, 8013);
  assert.deepEqual(new Set(Object.keys(explanations)), ids);
  assert.ok(problems.every((problem) => problem.statement && problem.answer && problem.concepts.length));
});

test("legacy pagination and filtering preserve source boundaries", () => {
  const first = queryLegacyProblems({ offset: 0, limit: 3 });
  const second = queryLegacyProblems({ offset: 3, limit: 3 });
  const manual = queryLegacyProblems({ answerType: "manual", limit: 100 });

  assert.equal(first.total, 8013);
  assert.equal(first.problems.length, 3);
  assert.notEqual(first.problems[0].id, second.problems[0].id);
  assert.ok(manual.total > 0);
  assert.ok(manual.problems.every((problem) => problem.isAutoGradable === false));

  const normalized = queryLegacyProblems({ offset: Number.NaN, limit: Number.POSITIVE_INFINITY });
  assert.equal(normalized.offset, 0);
  assert.equal(normalized.limit, 25);
});

test("legacy adapter keeps five choices and never auto-grades manual problems", () => {
  const problems = loadLegacyProblems();
  const fiveChoice = problems.find((problem) => problem.choices?.length === 5)!;
  const manual = problems.find((problem) => problem.answerType === "manual")!;

  assert.equal(adaptLegacyProblem(fiveChoice).choices.length, 5);
  assert.equal(adaptLegacyProblem(manual).isAutoGradable, false);
  assert.equal(adaptLegacyProblem(manual).reviewStatus, "imported");
});
