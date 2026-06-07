export type Problem = {
  id: string;
  statement: string;
  answer: string;
  answerType: "numeric" | "fraction" | "symbolic" | "text" | "manual";
  choices: string[];
  difficulty: number;
  source: string;
  primaryConcept: string;
  concepts: string[];
  prerequisiteConcepts: string[];
  skills: string[];
  patterns: string[];
  misconceptions: string[];
  isAutoGradable: boolean;
  solution: string;
  curriculum: {
    course: string;
    theme: string;
    chapter: string;
    chapterTitle: string;
    sequence: number;
    sourceCollection: string;
  };
  recommendationMeta?: {
    reason: string;
    score: number;
    targetConcept?: string;
    targetMastery?: number;
  };
};

export { checkAnswer, normalizeAnswer } from "./answer";

export type StudentState = {
  mastery: Record<string, number>;
  history: Array<{
    problemId: string;
    correct: boolean;
    concepts: string[];
    difficulty?: number;
    responseTimeSeconds?: number;
    confidence?: number;
    fluencyNeedsPractice?: boolean;
  }>;
};

export type Attempt = {
  problem: Problem;
  correct: boolean;
  responseTimeSeconds?: number;
  confidence?: number;
};

export type Recommendation = {
  problem: Problem;
  reason: string;
  score: number;
  targetConcept?: string;
  targetMastery?: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const intersects = (left: string[], right: string[]) =>
  left.some((item) => right.includes(item));

const averageMastery = (state: StudentState, concepts: string[]) => {
  if (concepts.length === 0) return 0.5;

  const total = concepts.reduce(
    (sum, concept) => sum + (state.mastery[concept] ?? 0.5),
    0
  );

  return total / concepts.length;
};

const updateMastery = (state: StudentState, attempt: Attempt): StudentState => {
  const mastery = { ...state.mastery };
  const fluencyNeedsPractice = needsFluencyPractice(attempt);
  const delta = attempt.correct ? (fluencyNeedsPractice ? 0.07 : 0.12) : -0.18;

  attempt.problem.concepts.forEach((concept) => {
    mastery[concept] = clamp((mastery[concept] ?? 0.5) + delta);
  });

  return {
    mastery,
    history: [
      ...state.history,
      {
        problemId: attempt.problem.id,
        correct: attempt.correct,
        concepts: attempt.problem.concepts,
        difficulty: attempt.problem.difficulty,
        responseTimeSeconds: attempt.responseTimeSeconds,
        confidence: attempt.confidence,
        fluencyNeedsPractice
      }
    ]
  };
};

const detectWeakConcepts = (mastery: Record<string, number>) =>
  Object.entries(mastery)
    .filter(([, score]) => score < 0.5)
    .sort((a, b) => a[1] - b[1])
    .map(([concept]) => concept);

const shouldRemediate = (state: StudentState) => {
  const recent = state.history.slice(-3);
  if (recent.length < 3) return false;

  const wrongAttempts = recent.filter((item) => !item.correct);
  return wrongAttempts.length >= 2;
};

const detectFluencyConcepts = (state: StudentState) => {
  const counts: Record<string, number> = {};

  state.history
    .filter((item) => item.fluencyNeedsPractice)
    .slice(-4)
    .forEach((item) => {
      item.concepts.forEach((concept) => {
        counts[concept] = (counts[concept] ?? 0) + 1;
      });
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([concept]) => concept);
};

const targetDifficulty = (mastery: number) => {
  if (mastery < 0.35) return 2;
  if (mastery < 0.55) return 3;
  if (mastery < 0.75) return 4;
  return 5;
};

const selectNextProblem = (
  state: StudentState,
  problems: Problem[],
  weakConcepts: string[],
  fluencyConcepts: string[],
  remediation: boolean
): Recommendation => {
  const attempted = new Set(state.history.map((item) => item.problemId));
  const candidates = problems.filter((problem) => !attempted.has(problem.id));
  const pool = candidates.length > 0 ? candidates : problems;
  const ranked = pool
    .map((problem) => scoreProblem(problem, state, attempted, weakConcepts, fluencyConcepts, remediation))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const targetConcept =
    best.matchedWeakConcepts[0] ??
    best.matchedFluencyConcepts[0] ??
    best.matchedPrerequisites[0] ??
    weakConcepts[0] ??
    fluencyConcepts[0];
  const targetMastery = targetConcept ? state.mastery[targetConcept] ?? 0.5 : undefined;

  return {
    problem: best.problem,
    reason: buildRecommendationReason(best, targetConcept, targetMastery, remediation),
    score: best.score,
    targetConcept,
    targetMastery
  };
};

type ScoredProblem = {
  problem: Problem;
  score: number;
  matchedWeakConcepts: string[];
  matchedFluencyConcepts: string[];
  matchedPrerequisites: string[];
  difficultyGap: number;
  averageMastery: number;
};

function scoreProblem(
  problem: Problem,
  state: StudentState,
  attempted: Set<string>,
  weakConcepts: string[],
  fluencyConcepts: string[],
  remediation: boolean
): ScoredProblem {
  const mastery = averageMastery(state, problem.concepts);
  const matchedFluencyConcepts = problem.concepts.filter((concept) => fluencyConcepts.includes(concept));
  const fluencyPractice = matchedFluencyConcepts.length > 0;
  const idealDifficulty =
    remediation || fluencyPractice
      ? Math.max(1, targetDifficulty(mastery) - 1)
      : targetDifficulty(mastery);
  const difficultyGap = Math.abs(problem.difficulty - idealDifficulty);
  const matchedWeakConcepts = problem.concepts.filter((concept) => weakConcepts.includes(concept));
  const matchedPrerequisites = problem.prerequisiteConcepts.filter((concept) => weakConcepts.includes(concept));
  let score = 0;

  score += matchedWeakConcepts.length * 40;
  score += matchedFluencyConcepts.length * 34;
  score += matchedPrerequisites.length * 28;
  score += Math.max(0, 20 - difficultyGap * 6);
  score += (1 - mastery) * 18;
  score += attempted.has(problem.id) ? -25 : 8;
  score += problem.isAutoGradable ? 4 : -20;

  if (remediation && matchedPrerequisites.length > 0) score += 18;
  if (remediation && matchedWeakConcepts.length > 0 && problem.difficulty <= idealDifficulty + 1) score += 12;
  if (fluencyPractice && problem.difficulty <= idealDifficulty + 1) score += 16;

  return {
    problem,
    score,
    matchedWeakConcepts,
    matchedFluencyConcepts,
    matchedPrerequisites,
    difficultyGap,
    averageMastery: mastery
  };
}

function buildRecommendationReason(
  scored: ScoredProblem,
  targetConcept: string | undefined,
  targetMastery: number | undefined,
  remediation: boolean
) {
  if (scored.matchedPrerequisites.length > 0 && remediation) {
    return `Remediation: review prerequisite ${scored.matchedPrerequisites[0]} before continuing ${targetConcept}.`;
  }

  if (scored.matchedWeakConcepts.length > 0) {
    const masteryText = targetMastery === undefined ? "unknown" : targetMastery.toFixed(2);
    return `Targets weak concept ${scored.matchedWeakConcepts[0]} at mastery ${masteryText}.`;
  }

  if (scored.matchedFluencyConcepts.length > 0) {
    return `Fluency: reinforce ${scored.matchedFluencyConcepts[0]} before increasing difficulty.`;
  }

  if (targetConcept) {
    return `Balances practice while monitoring ${targetConcept}.`;
  }

  return "Starts with a balanced, auto-gradable practice problem.";
}

export class AdaptiveEngine {
  problems: Problem[];

  constructor(problems: Problem[]) {
    this.problems = problems;
  }

  run(state: StudentState, attempt: Attempt) {

    // 1. update mastery
    state = updateMastery(state, attempt);

    // 2. detect weak concepts
    const weak = detectWeakConcepts(state.mastery);
    const fluency = detectFluencyConcepts(state);

    // 3. remediation check
    const remediation = shouldRemediate(state);

    // 4. select problem
    const recommendation = selectNextProblem(state, this.problems, weak, fluency, remediation);
    const next = {
      ...recommendation.problem,
      recommendationMeta: {
        reason: recommendation.reason,
        score: recommendation.score,
        targetConcept: recommendation.targetConcept,
        targetMastery: recommendation.targetMastery
      }
    };

    return {
      next_problem: next,
      updated_state: state,
      weak_concepts: weak,
      fluency_concepts: fluency,
      remediation,
      recommendation
    };
  }

  getRemediationProblem(weakConcepts: string[]) {
    return this.problems.find((p) =>
      intersects(p.concepts, weakConcepts)
    ) ?? this.problems[0];
  }
}

function needsFluencyPractice(attempt: Attempt) {
  if (!attempt.correct) return false;

  return isLowConfidence(attempt.confidence) || isSlowResponse(attempt.responseTimeSeconds);
}

function isLowConfidence(confidence: number | undefined) {
  return typeof confidence === "number" && confidence <= 2;
}

function isSlowResponse(responseTimeSeconds: number | undefined) {
  return typeof responseTimeSeconds === "number" && responseTimeSeconds >= 120;
}
