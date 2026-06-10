import {
  buildConceptGraphFromProblems,
  findPrerequisiteGaps,
  type ConceptGraph,
  type PrerequisiteGap
} from "./conceptGraph";

export type Problem = {
  id: string;
  statement: string;
  answer: string;
  answerType: "numeric" | "fraction" | "symbolic" | "text" | "multiple_choice" | "manual";
  choices: Array<string | AnswerChoice>;
  distractors?: Distractor[];
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
  taxonomy?: {
    version: "v0";
    layer: "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
    stage: "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
    problemType: string;
    cognitiveTags: string[];
    estimatedTimeSeconds: number;
  };
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
    explanation?: RecommendationExplanation;
    score: number;
    targetConcept?: string;
    targetMastery?: number;
    prerequisiteGap?: string;
    prerequisiteTarget?: string;
  };
};

export type AnswerChoice = {
  label: string;
  value: string;
  text: string;
  distractorId?: string;
};

export type Distractor = {
  id: string;
  choiceLabel: string;
  value: string;
  misconception: string;
  cognitiveTag: string;
  explanation: string;
};

export { checkAnswer, checkProblemAnswer, normalizeAnswer } from "./answer";
export {
  buildConceptGraph,
  buildConceptGraphFromProblems,
  findPrerequisiteGaps,
  getPrerequisiteClosure,
  type ConceptGraph,
  type ConceptNode,
  type PrerequisiteGap
} from "./conceptGraph";

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
  explanation: RecommendationExplanation;
  score: number;
  targetConcept?: string;
  targetMastery?: number;
  prerequisiteGap?: PrerequisiteGap;
};

export type RecommendationExplanation = {
  priority: "prerequisite_gap" | "remediation" | "weak_concept" | "fluency" | "balanced";
  summary: string;
  targetConcept?: string;
  targetMastery?: number;
  layer?: string;
  stage?: string;
  problemType?: string;
  cognitiveTags: string[];
  signals: string[];
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
  prerequisiteGaps: PrerequisiteGap[],
  remediation: boolean
): Recommendation => {
  const attempted = new Set(state.history.map((item) => item.problemId));
  const candidates = problems.filter((problem) => !attempted.has(problem.id));
  const pool = candidates.length > 0 ? candidates : problems;
  const ranked = pool
    .map((problem) => scoreProblem(problem, state, attempted, weakConcepts, fluencyConcepts, prerequisiteGaps, remediation))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const prerequisiteGap = best.matchedPrerequisiteGaps[0] ?? prerequisiteGaps[0];
  const targetConcept =
    prerequisiteGap?.concept ??
    best.matchedWeakConcepts[0] ??
    best.matchedFluencyConcepts[0] ??
    best.matchedPrerequisites[0] ??
    weakConcepts[0] ??
    fluencyConcepts[0];
  const targetMastery = targetConcept ? state.mastery[targetConcept] ?? 0.5 : undefined;

  const explanation = buildRecommendationExplanation(best, targetConcept, targetMastery, prerequisiteGap, remediation);

  return {
    problem: best.problem,
    reason: explanation.summary,
    explanation,
    score: best.score,
    targetConcept,
    targetMastery,
    prerequisiteGap
  };
};

type ScoredProblem = {
  problem: Problem;
  score: number;
  matchedWeakConcepts: string[];
  matchedFluencyConcepts: string[];
  matchedPrerequisites: string[];
  matchedPrerequisiteGaps: PrerequisiteGap[];
  difficultyGap: number;
  averageMastery: number;
};

function scoreProblem(
  problem: Problem,
  state: StudentState,
  attempted: Set<string>,
  weakConcepts: string[],
  fluencyConcepts: string[],
  prerequisiteGaps: PrerequisiteGap[],
  remediation: boolean
): ScoredProblem {
  const mastery = averageMastery(state, problem.concepts);
  const prerequisiteGapConcepts = prerequisiteGaps.map((gap) => gap.concept);
  const matchedFluencyConcepts = problem.concepts.filter((concept) => fluencyConcepts.includes(concept));
  const matchedPrerequisiteGaps = prerequisiteGaps.filter((gap) => problem.concepts.includes(gap.concept));
  const fluencyPractice = matchedFluencyConcepts.length > 0;
  const gapPractice = matchedPrerequisiteGaps.length > 0;
  const idealDifficulty =
    remediation || fluencyPractice || gapPractice
      ? Math.max(1, targetDifficulty(mastery) - 1)
      : targetDifficulty(mastery);
  const difficultyGap = Math.abs(problem.difficulty - idealDifficulty);
  const matchedWeakConcepts = problem.concepts.filter((concept) => weakConcepts.includes(concept));
  const matchedPrerequisites = problem.prerequisiteConcepts.filter((concept) => weakConcepts.includes(concept));
  let score = 0;

  score += matchedWeakConcepts.length * 40;
  score += matchedPrerequisiteGaps.reduce((sum, gap) => sum + 44 + Math.min(20, gap.score), 0);
  score += matchedFluencyConcepts.length * 34;
  score += matchedPrerequisites.filter((concept) => !prerequisiteGapConcepts.includes(concept)).length * 28;
  score += Math.max(0, 20 - difficultyGap * 6);
  score += (1 - mastery) * 18;
  score += attempted.has(problem.id) ? -25 : 8;
  score += problem.isAutoGradable ? 4 : -20;

  if (remediation && matchedPrerequisites.length > 0) score += 18;
  if (remediation && matchedWeakConcepts.length > 0 && problem.difficulty <= idealDifficulty + 1) score += 12;
  if (fluencyPractice && problem.difficulty <= idealDifficulty + 1) score += 16;
  if (gapPractice && problem.difficulty <= idealDifficulty + 1) score += 22;

  return {
    problem,
    score,
    matchedWeakConcepts,
    matchedFluencyConcepts,
    matchedPrerequisites,
    matchedPrerequisiteGaps,
    difficultyGap,
    averageMastery: mastery
  };
}

function buildRecommendationExplanation(
  scored: ScoredProblem,
  targetConcept: string | undefined,
  targetMastery: number | undefined,
  prerequisiteGap: PrerequisiteGap | undefined,
  remediation: boolean
): RecommendationExplanation {
  const taxonomy = scored.problem.taxonomy;
  const context = describeProblemContext(scored.problem);
  const signals = buildRecommendationSignals(scored, targetConcept, targetMastery, prerequisiteGap, remediation);
  const base = {
    targetConcept,
    targetMastery,
    layer: taxonomy?.layer,
    stage: taxonomy?.stage,
    problemType: taxonomy?.problemType,
    cognitiveTags: taxonomy?.cognitiveTags ?? [],
    signals
  };

  if (prerequisiteGap && scored.matchedPrerequisiteGaps.length > 0) {
    return {
      ...base,
      priority: "prerequisite_gap",
      summary: `Prerequisite gap: strengthen ${prerequisiteGap.concept} with a ${context} before continuing ${prerequisiteGap.targetConcept}.`
    };
  }

  if (scored.matchedPrerequisites.length > 0 && remediation) {
    return {
      ...base,
      priority: "remediation",
      summary: `Remediation: review prerequisite ${scored.matchedPrerequisites[0]} through a ${context} before continuing ${targetConcept}.`
    };
  }

  if (scored.matchedWeakConcepts.length > 0) {
    const masteryText = targetMastery === undefined ? "unknown" : targetMastery.toFixed(2);
    return {
      ...base,
      priority: "weak_concept",
      summary: `Targets weak concept ${scored.matchedWeakConcepts[0]} at mastery ${masteryText} using a ${context}.`
    };
  }

  if (scored.matchedFluencyConcepts.length > 0) {
    return {
      ...base,
      priority: "fluency",
      summary: `Fluency: reinforce ${scored.matchedFluencyConcepts[0]} with a ${context} before increasing difficulty.`
    };
  }

  if (targetConcept) {
    return {
      ...base,
      priority: "balanced",
      summary: `Balances practice while monitoring ${targetConcept} with a ${context}.`
    };
  }

  return {
    ...base,
    priority: "balanced",
    summary: `Starts with a balanced, auto-gradable ${context}.`
  };
}

function describeProblemContext(problem: Problem) {
  const taxonomy = problem.taxonomy;
  const layer = taxonomy?.layer ? `${taxonomy.layer} layer` : `difficulty ${problem.difficulty}`;
  const type = taxonomy?.problemType ? taxonomy.problemType.replace(/_/g, " ") : "practice problem";
  const cognitive = taxonomy?.cognitiveTags?.[0]?.replace(/_/g, " ");

  return cognitive ? `${layer} ${type} item focused on ${cognitive}` : `${layer} ${type} item`;
}

function buildRecommendationSignals(
  scored: ScoredProblem,
  targetConcept: string | undefined,
  targetMastery: number | undefined,
  prerequisiteGap: PrerequisiteGap | undefined,
  remediation: boolean
) {
  return [
    targetConcept ? `target=${targetConcept}` : "",
    targetMastery !== undefined ? `mastery=${targetMastery.toFixed(2)}` : "",
    scored.problem.taxonomy?.layer ? `layer=${scored.problem.taxonomy.layer}` : "",
    scored.problem.taxonomy?.problemType ? `type=${scored.problem.taxonomy.problemType}` : "",
    scored.problem.taxonomy?.cognitiveTags?.length ? `cognitive=${scored.problem.taxonomy.cognitiveTags.slice(0, 2).join(",")}` : "",
    prerequisiteGap ? `gap=${prerequisiteGap.concept}->${prerequisiteGap.targetConcept}` : "",
    remediation ? "remediation=true" : "",
    `score=${Math.round(scored.score)}`
  ].filter(Boolean);
}

function buildFallbackRecommendation(
  problem: Problem,
  weakConcepts: string[],
  fluencyConcepts: string[],
  prerequisiteGaps: PrerequisiteGap[],
  remediation: boolean,
  state: StudentState
): Recommendation {
  const prerequisiteGap = prerequisiteGaps[0];
  const targetConcept =
    prerequisiteGap?.concept ??
    weakConcepts.find((concept) => problem.concepts.includes(concept)) ??
    fluencyConcepts.find((concept) => problem.concepts.includes(concept)) ??
    problem.concepts[0];
  const targetMastery = targetConcept ? state.mastery[targetConcept] ?? 0.5 : undefined;
  const scored: ScoredProblem = {
    problem,
    score: 0,
    matchedWeakConcepts: problem.concepts.filter((concept) => weakConcepts.includes(concept)),
    matchedFluencyConcepts: problem.concepts.filter((concept) => fluencyConcepts.includes(concept)),
    matchedPrerequisites: problem.prerequisiteConcepts.filter((concept) => weakConcepts.includes(concept)),
    matchedPrerequisiteGaps: prerequisiteGaps.filter((gap) => problem.concepts.includes(gap.concept)),
    difficultyGap: 0,
    averageMastery: averageMastery(state, problem.concepts)
  };
  const explanation = buildRecommendationExplanation(scored, targetConcept, targetMastery, prerequisiteGap, remediation);

  return {
    problem,
    reason: explanation.summary,
    explanation,
    score: scored.score,
    targetConcept,
    targetMastery,
    prerequisiteGap
  };
}

export class AdaptiveEngine {
  problems: Problem[];
  graph: ConceptGraph;

  constructor(problems: Problem[], graph?: ConceptGraph) {
    this.problems = problems;
    this.graph = graph ?? buildConceptGraphFromProblems(problems);
  }

  run(state: StudentState, attempt: Attempt) {

    // 1. update mastery
    state = updateMastery(state, attempt);

    // 2. detect weak concepts
    const weak = detectWeakConcepts(state.mastery);
    const fluency = detectFluencyConcepts(state);
    const attemptedConcepts = attempt.problem.concepts;
    const prerequisiteGaps = findPrerequisiteGaps([...weak, ...attemptedConcepts], state, this.graph);

    // 3. remediation check
    const remediation = shouldRemediate(state);

    if (this.problems.length === 0) {
      const recommendation = buildFallbackRecommendation(attempt.problem, weak, fluency, prerequisiteGaps, remediation, state);

      return {
        next_problem: {
          ...attempt.problem,
          recommendationMeta: {
            reason: recommendation.reason,
            explanation: recommendation.explanation,
            score: recommendation.score,
            targetConcept: recommendation.targetConcept,
            targetMastery: recommendation.targetMastery,
            prerequisiteGap: recommendation.prerequisiteGap?.concept,
            prerequisiteTarget: recommendation.prerequisiteGap?.targetConcept
          }
        },
        updated_state: state,
        weak_concepts: weak,
        fluency_concepts: fluency,
        prerequisite_gaps: prerequisiteGaps,
        remediation,
        recommendation
      };
    }

    // 4. select problem
    const recommendation = selectNextProblem(state, this.problems, weak, fluency, prerequisiteGaps, remediation);
    const next = {
      ...recommendation.problem,
      recommendationMeta: {
        reason: recommendation.reason,
        explanation: recommendation.explanation,
        score: recommendation.score,
        targetConcept: recommendation.targetConcept,
        targetMastery: recommendation.targetMastery,
        prerequisiteGap: recommendation.prerequisiteGap?.concept,
        prerequisiteTarget: recommendation.prerequisiteGap?.targetConcept
      }
    };

    return {
      next_problem: next,
      updated_state: state,
      weak_concepts: weak,
      fluency_concepts: fluency,
      prerequisite_gaps: prerequisiteGaps,
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
