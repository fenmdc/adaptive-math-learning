export type AdaptiveProblem = {
  id: string;
  concepts: string[];
  difficulty?: number;
};

export type Attempt = {
  problemId?: string;
  concepts?: string[];
  correct: boolean;
};

export type AdaptiveState = {
  mastery: Record<string, number>;
  recentAttempts?: Attempt[];
};

function intersects(left: string[], right: string[]) {
  return left.some((item) => right.includes(item));
}

function updateMastery(state: AdaptiveState, attempt: Attempt): AdaptiveState {
  const mastery = { ...state.mastery };
  const concepts = attempt.concepts || [];

  concepts.forEach((concept) => {
    const current = mastery[concept] ?? 0.5;
    const delta = attempt.correct ? 0.08 : -0.12;
    mastery[concept] = Math.max(0, Math.min(1, current + delta));
  });

  return {
    ...state,
    mastery,
    recentAttempts: [...(state.recentAttempts || []), attempt].slice(-8),
  };
}

function detectWeakConcepts(mastery: Record<string, number>) {
  return [...Object.entries(mastery)]
    .filter(([, value]) => value < 0.65)
    .sort((left, right) => left[1] - right[1])
    .map(([concept]) => concept);
}

function shouldRemediate(state: AdaptiveState) {
  const recent = state.recentAttempts || [];
  const lastThree = recent.slice(-3);
  return lastThree.length === 3 && lastThree.filter((attempt) => !attempt.correct).length >= 2;
}

function selectNextProblem(state: AdaptiveState, problems: AdaptiveProblem[], excludedProblemId?: string) {
  const weak = detectWeakConcepts(state.mastery);
  const candidates = problems.filter((problem) => problem.id !== excludedProblemId);

  for (const concept of weak) {
    const match = candidates.find((problem) => problem.concepts.includes(concept));
    if (match) return match;
  }

  return candidates[0] || problems[0];
}

export class AdaptiveEngine {
  problems: AdaptiveProblem[];

  constructor(problems: AdaptiveProblem[]) {
    this.problems = problems;
  }

  run(state: AdaptiveState, attempt: Attempt) {
    const updatedState = updateMastery(state, attempt);
    const weak = detectWeakConcepts(updatedState.mastery);
    const remediation = shouldRemediate(updatedState);
    let next = selectNextProblem(updatedState, this.problems, attempt.problemId);

    if (remediation) {
      next = this.getRemediationProblem(weak, attempt.problemId) || next;
    }

    return {
      next_problem: next,
      updated_state: updatedState,
      weak_concepts: weak,
      remediation,
    };
  }

  getRemediationProblem(weakConcepts: string[], excludedProblemId?: string) {
    for (const concept of weakConcepts) {
      const match = this.problems.find(
        (problem) => problem.id !== excludedProblemId && problem.concepts.includes(concept),
      );
      if (match) return match;
    }
  }
}
