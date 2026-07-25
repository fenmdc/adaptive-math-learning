import assert from "node:assert/strict";
import test from "node:test";

import { createInitialAdaptiveState, runLearningAttempt } from "../packages/learning-session";
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
