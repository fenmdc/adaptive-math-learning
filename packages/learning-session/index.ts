import { AdaptiveEngine, type AdaptiveState } from "../adaptive-engine";
import type { PracticeProblem } from "../problem-bank/types";

export type LearningAttemptResult = {
  correct: boolean;
  nextProblemId?: string;
  remediation: boolean;
  state: AdaptiveState;
  weakConcepts: string[];
};

export function createInitialAdaptiveState(problems: PracticeProblem[]): AdaptiveState {
  return {
    mastery: Object.fromEntries([...new Set(problems.flatMap((problem) => problem.concepts))].map((concept) => [concept, 0.5])),
    recentAttempts: [],
  };
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
