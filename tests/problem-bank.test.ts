import assert from "node:assert/strict";
import test from "node:test";

import { generateChoices, loadProblemBank, parseCsv } from "../packages/problem-bank";
import {
  adaptLegacyProblem,
  loadLegacyExplanations,
  loadLegacyProblems,
  loadProblemBankExplanations,
  loadProblemBankProblems,
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

  assert.equal(first.total, 8295);
  assert.equal(first.problems.length, 3);
  assert.notEqual(first.problems[0].id, second.problems[0].id);
  assert.ok(manual.total > 0);
  assert.ok(manual.problems.every((problem) => problem.isAutoGradable === false));

  const normalized = queryLegacyProblems({ offset: Number.NaN, limit: Number.POSITIVE_INFINITY });
  assert.equal(normalized.offset, 0);
  assert.equal(normalized.limit, 25);
});

test("integrated problem bank appends reviewed supplements without changing the legacy snapshot", () => {
  const legacy = loadLegacyProblems();
  const integrated = loadProblemBankProblems();
  const explanations = loadProblemBankExplanations();
  const supplements = integrated.slice(legacy.length);

  assert.equal(legacy.length, 8013);
  assert.equal(integrated.length, 8295);
  assert.equal(supplements.length, 282);
  assert.equal(new Set(integrated.map((problem) => problem.id)).size, integrated.length);
  assert.ok(supplements.every((problem) => problem.reviewStatus === "reviewed"));
  assert.ok(supplements.every((problem) => problem.isAutoGradable && problem.answerType === "multiple_choice"));
  assert.ok(supplements.every((problem) => explanations[problem.id]?.stepByStep));
  assert.ok(supplements.every((problem) => adaptLegacyProblem(problem).reviewStatus === "reviewed"));

  const englishDiagnostic = supplements.filter((problem) => problem.source === "english_core_diagnostic_v1_original");
  assert.equal(englishDiagnostic.length, 30);
  assert.ok(englishDiagnostic.every((problem) => problem.curriculum?.course === "Pre-Algebra"));
  assert.equal(supplements.filter((problem) => problem.source === "algebra1_remediation_v1_original").length, 30);
  assert.equal(supplements.filter((problem) => problem.source === "amc8_strategy_v1_original").length, 30);
  const chineseJuniorCompanions = supplements.filter((problem) => problem.source === "cn_junior_auto_v1_adaptation");
  assert.equal(chineseJuniorCompanions.length, 24);
  assert.ok(chineseJuniorCompanions.every((problem) => {
    const source = legacy.find((candidate) => candidate.id === problem.sourceProblemId);
    return source?.answerType === "manual"
      && !source.isAutoGradable
      && source.curriculum?.course === "CN Junior High Math"
      && source.curriculum?.theme === problem.curriculum?.theme;
  }));
  const chineseSeniorCompanions = supplements.filter((problem) => problem.source === "cn_senior_auto_v1_adaptation");
  assert.equal(chineseSeniorCompanions.length, 21);
  assert.ok(chineseSeniorCompanions.every((problem) => {
    const source = legacy.find((candidate) => candidate.id === problem.sourceProblemId);
    return source?.answerType === "manual"
      && !source.isAutoGradable
      && source.curriculum?.course === "CN Senior High Math"
      && source.curriculum?.theme === problem.curriculum?.theme;
  }));
  const chineseSeniorAdvancedCompanions = supplements.filter((problem) => problem.source === "cn_senior_advanced_v1_adaptation");
  assert.equal(chineseSeniorAdvancedCompanions.length, 18);
  assert.ok(chineseSeniorAdvancedCompanions.every((problem) => {
    const source = legacy.find((candidate) => candidate.id === problem.sourceProblemId);
    return source?.answerType === "manual"
      && !source.isAutoGradable
      && source.curriculum?.course === "CN Senior High Math"
      && source.curriculum?.theme === problem.curriculum?.theme;
  }));
  const chineseGrade8Companions = supplements.filter((problem) => problem.source === "cn_grade8_auto_v1_adaptation");
  assert.equal(chineseGrade8Companions.length, 24);
  assert.ok(chineseGrade8Companions.every((problem) => {
    const source = legacy.find((candidate) => candidate.id === problem.sourceProblemId);
    return source?.answerType === "manual"
      && !source.isAutoGradable
      && source.curriculum?.course === "CN Junior High Math"
      && source.curriculum?.theme === problem.curriculum?.theme;
  }));
  const chineseGrade9Companions = supplements.filter((problem) => problem.source === "cn_grade9_auto_v1_adaptation");
  assert.equal(chineseGrade9Companions.length, 24);
  assert.ok(chineseGrade9Companions.every((problem) => {
    const source = legacy.find((candidate) => candidate.id === problem.sourceProblemId);
    return source?.answerType === "manual"
      && !source.isAutoGradable
      && source.curriculum?.course === "CN Junior High Math"
      && source.curriculum?.theme === problem.curriculum?.theme;
  }));
  assert.ok(supplements.filter((problem) => problem.source?.startsWith("cn_olympiad")).every((problem) => problem.curriculum?.course === "CN Olympiad Lite"));

  const fourthBatch = supplements.filter((problem) => problem.source === "cn_olympiad_foundations_v4_original");
  const clusterCounts = {
    primeFactor: fourthBatch.filter((problem) => ["nt_primes", "nt_factorization"].includes(problem.primaryConcept ?? "")).length,
    gcdLcm: fourthBatch.filter((problem) => ["nt_gcd", "nt_lcm"].includes(problem.primaryConcept ?? "")).length,
    divisibility: fourthBatch.filter((problem) => problem.primaryConcept === "nt_divisibility").length,
    casework: fourthBatch.filter((problem) => problem.primaryConcept === "counting_casework").length,
    inclusionExclusion: fourthBatch.filter((problem) => problem.primaryConcept === "counting_inclusion_exclusion").length,
    pigeonholeProbability: fourthBatch.filter((problem) => ["counting_pigeonhole", "counting_probability"].includes(problem.primaryConcept ?? "")).length,
    angles: fourthBatch.filter((problem) => problem.primaryConcept === "geo_angles").length,
    similarity: fourthBatch.filter((problem) => problem.primaryConcept === "geo_similarity").length,
    circleArea: fourthBatch.filter((problem) => ["geo_circles", "geo_area"].includes(problem.primaryConcept ?? "")).length,
  };
  assert.deepEqual(clusterCounts, Object.fromEntries(Object.keys(clusterCounts).map((key) => [key, 3])));
});

test("legacy adapter keeps five choices and never auto-grades manual problems", () => {
  const problems = loadLegacyProblems();
  const fiveChoice = problems.find((problem) => problem.choices?.length === 5)!;
  const manual = problems.find((problem) => problem.answerType === "manual")!;

  assert.equal(adaptLegacyProblem(fiveChoice).choices.length, 5);
  assert.equal(adaptLegacyProblem(manual).isAutoGradable, false);
  assert.equal(adaptLegacyProblem(manual).reviewStatus, "imported");
});
