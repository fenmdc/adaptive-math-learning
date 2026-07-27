import assert from "node:assert/strict";
import test from "node:test";

import {
  MOCK_EXAMS,
  createMockExamPaper,
  getMockExamConfig,
  scoreMockExam,
} from "../packages/mock-exam";

test("all mock exams produce complete deterministic papers", () => {
  for (const config of MOCK_EXAMS) {
    const first = createMockExamPaper(config, "fixed-seed");
    const second = createMockExamPaper(config, "fixed-seed");

    assert.equal(first.problems.length, config.questionCount);
    assert.deepEqual(first.problems.map((problem) => problem.id), second.problems.map((problem) => problem.id));
    assert.equal(new Set(first.problems.map((problem) => problem.id)).size, config.questionCount);
    assert.ok(first.problems.every((problem) => problem.isAutoGradable !== false));
  }
});

test("SAT paper preserves the 33 plus 11 response-format split", () => {
  const config = getMockExamConfig("sat-math")!;
  const paper = createMockExamPaper(config, "sat-format");

  assert.equal(paper.problems.filter((problem) => problem.answerType === "multiple_choice").length, 33);
  assert.equal(paper.problems.filter((problem) => problem.answerType !== "multiple_choice").length, 11);
});

test("AMC mock papers use only five-choice source questions", () => {
  for (const id of ["amc8", "amc10", "amc12"] as const) {
    const config = getMockExamConfig(id)!;
    const paper = createMockExamPaper(config, `${id}:choices`);
    assert.ok(paper.problems.every((problem) => problem.answerType === "multiple_choice"));
    assert.ok(paper.problems.every((problem) => problem.choices.length === 5));
  }
});

test("exam scoring distinguishes SAT accuracy and AMC blank credit", () => {
  const sat = getMockExamConfig("sat-math")!;
  const satPaper = createMockExamPaper(sat, "sat-score");
  const satAnswers = Object.fromEntries(satPaper.problems.slice(0, 2).map((problem) => [problem.id, problem.answer]));
  assert.deepEqual(scoreMockExam(sat, satPaper.problems, satAnswers), {
    correct: 2, blank: 42, incorrect: 0, points: 2, maxPoints: 44, accuracy: 5,
  });

  const amc10 = getMockExamConfig("amc10")!;
  const amcPaper = createMockExamPaper(amc10, "amc-score");
  const amcAnswers = { [amcPaper.problems[0].id]: amcPaper.problems[0].answer, [amcPaper.problems[1].id]: "wrong" };
  assert.deepEqual(scoreMockExam(amc10, amcPaper.problems, amcAnswers), {
    correct: 1, blank: 23, incorrect: 1, points: 40.5, maxPoints: 150, accuracy: 4,
  });
});
