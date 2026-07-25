import assert from "node:assert/strict";
import test from "node:test";

import { AdaptiveEngine, type AdaptiveState } from "../packages/adaptive-engine";

const problems = [
  { id: "ratio-1", concepts: ["ratio"] },
  { id: "ratio-2", concepts: ["ratio"] },
  { id: "percent-1", concepts: ["percent"] },
  { id: "percent-2", concepts: ["percent"] },
];

test("correct attempts update mastery and do not repeat the submitted problem", () => {
  const engine = new AdaptiveEngine(problems);
  const state: AdaptiveState = { mastery: { ratio: 0.5, percent: 0.4 }, recentAttempts: [] };
  const result = engine.run(state, { problemId: "ratio-1", concepts: ["ratio"], correct: true });

  assert.equal(result.updated_state.mastery.ratio, 0.58);
  assert.equal(result.next_problem?.id, "percent-1");
  assert.notEqual(result.next_problem?.id, "ratio-1");
});

test("two misses in three attempts trigger a different remediation problem", () => {
  const engine = new AdaptiveEngine(problems);
  let state: AdaptiveState = { mastery: { ratio: 0.5, percent: 0.8 }, recentAttempts: [] };

  state = engine.run(state, { problemId: "ratio-1", concepts: ["ratio"], correct: false }).updated_state;
  state = engine.run(state, { problemId: "percent-1", concepts: ["percent"], correct: true }).updated_state;
  const result = engine.run(state, { problemId: "ratio-1", concepts: ["ratio"], correct: false });

  assert.equal(result.remediation, true);
  assert.equal(result.next_problem?.id, "ratio-2");
  assert.equal(result.updated_state.mastery.ratio, 0.26);
});

test("remediation honors weakest-concept order instead of problem-bank order", () => {
  const engine = new AdaptiveEngine(problems);
  const state: AdaptiveState = {
    mastery: { ratio: 0.58, percent: 0.38 },
    recentAttempts: [
      { problemId: "ratio-1", concepts: ["ratio"], correct: true },
      { problemId: "percent-1", concepts: ["percent"], correct: false },
    ],
  };
  const result = engine.run(state, { problemId: "percent-1", concepts: ["percent"], correct: false });

  assert.equal(result.remediation, true);
  assert.equal(result.weak_concepts[0], "percent");
  assert.equal(result.next_problem?.id, "percent-2");
});
