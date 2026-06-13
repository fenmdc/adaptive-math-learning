import type { Problem } from "../../../../packages/adaptive-engine";

export type AbilityDimension = "knowledge" | "skill" | "reasoning" | "fluency" | "transfer";
export type ReadinessStatus = "Ready" | "Developing" | "Needs Repair" | "Not Measured";

export type AbilityDimensionState = {
  score: number;
  attempts: number;
  evidence: string[];
};

export type DomainReadiness = {
  domain: string;
  score: number;
  attempts: number;
  status: ReadinessStatus;
  focusConcepts: string[];
};

export type ConceptState = {
  concept: string;
  mastery: number;
  stability: number;
  knowledge: number;
  skill: number;
  reasoning: number;
  fluency: number;
  transfer: number;
  readiness: ReadinessStatus;
  attempts: number;
  correct: number;
  recentAccuracy: number;
  averageResponseTimeSeconds: number;
  averageConfidence: number;
  wrongStreak: number;
  lastPracticedAt: string;
  reviewDueAt: string;
};

export type StudentModel = {
  version: 2;
  updatedAt: string;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  difficultyComfort: number;
  averageResponseTimeSeconds: number;
  averageConfidence: number;
  abilityProfile: Record<AbilityDimension, AbilityDimensionState>;
  domainReadiness: Record<string, DomainReadiness>;
  currentPlacement: {
    stage: "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
    status: ReadinessStatus;
    evidence: string;
  };
  conceptStates: Record<string, ConceptState>;
  misconceptionCounts: Record<string, number>;
  recommendedReviewConcepts: string[];
  recommendedNextStep: string;
};

export type StudentAttemptInput = {
  problem: Problem;
  correct: boolean;
  mastery: Record<string, number>;
  selectedDistractor?: Problem["distractors"] extends Array<infer T> ? T : never;
  responseTimeSeconds?: number;
  confidence?: number;
  answeredAt?: string;
};

const DEFAULT_MASTERY = 0.5;
const DEFAULT_STABILITY = 0.45;
const DIMENSIONS: AbilityDimension[] = ["knowledge", "skill", "reasoning", "fluency", "transfer"];

export function createEmptyStudentModel(): StudentModel {
  const now = new Date().toISOString();

  return {
    version: 2,
    updatedAt: now,
    totalAttempts: 0,
    totalCorrect: 0,
    overallAccuracy: 0,
    difficultyComfort: 3,
    averageResponseTimeSeconds: 0,
    averageConfidence: 0,
    abilityProfile: createAbilityProfile(),
    domainReadiness: {},
    currentPlacement: {
      stage: "Foundation",
      status: "Not Measured",
      evidence: "No diagnostic or practice evidence has been recorded yet."
    },
    conceptStates: {},
    misconceptionCounts: {},
    recommendedReviewConcepts: [],
    recommendedNextStep: "Start with the diagnostic."
  };
}

export function updateStudentModel(
  currentModel: StudentModel | null,
  input: StudentAttemptInput
): StudentModel {
  const model = migrateStudentModel(currentModel);
  const answeredAt = input.answeredAt ?? new Date().toISOString();
  const totalAttempts = model.totalAttempts + 1;
  const totalCorrect = model.totalCorrect + (input.correct ? 1 : 0);
  const conceptStates = { ...model.conceptStates };
  const misconceptionCounts = { ...model.misconceptionCounts };
  const responseTimeSeconds = sanitizeResponseTime(input.responseTimeSeconds);
  const confidence = sanitizeConfidence(input.confidence);
  const touchedDimensions = inferDimensions(input.problem, responseTimeSeconds);
  const abilityProfile = updateAbilityProfile(model.abilityProfile, input.problem, touchedDimensions, input.correct, responseTimeSeconds, confidence);

  input.problem.concepts.forEach((concept) => {
    const previous = conceptStates[concept] ?? createConceptState(concept, answeredAt);
    const attempts = previous.attempts + 1;
    const correct = previous.correct + (input.correct ? 1 : 0);
    const mastery = input.mastery[concept] ?? previous.mastery ?? DEFAULT_MASTERY;
    const fluencyAdjustment = scoreFluency(responseTimeSeconds, confidence, input.correct);
    const stabilityDelta = input.correct ? 0.08 + fluencyAdjustment : -0.12 + fluencyAdjustment;
    const stability = clamp(previous.stability + stabilityDelta + (mastery - previous.mastery) * 0.2);
    const recentAccuracy = rollingRecentAccuracy(previous.recentAccuracy, input.correct);
    const averageResponseTimeSeconds = rollingAverage(previous.averageResponseTimeSeconds, responseTimeSeconds);
    const averageConfidence = rollingAverage(previous.averageConfidence, confidence);
    const wrongStreak = input.correct ? 0 : previous.wrongStreak + 1;
    const dimensionScores = updateConceptDimensions(previous, touchedDimensions, input.correct, responseTimeSeconds, confidence);

    conceptStates[concept] = {
      concept,
      mastery,
      stability,
      ...dimensionScores,
      readiness: readinessFromScore((mastery + stability + averageDimensionScore(dimensionScores)) / 3),
      attempts,
      correct,
      recentAccuracy,
      averageResponseTimeSeconds,
      averageConfidence,
      wrongStreak,
      lastPracticedAt: answeredAt,
      reviewDueAt: nextReviewDueAt(answeredAt, stability, input.correct)
    };
  });

  if (!input.correct) {
    if (input.selectedDistractor) {
      misconceptionCounts[input.selectedDistractor.misconception] =
        (misconceptionCounts[input.selectedDistractor.misconception] ?? 0) + 1;
    }

    input.problem.misconceptions.forEach((misconception) => {
      misconceptionCounts[misconception] = (misconceptionCounts[misconception] ?? 0) + 1;
    });
  }

  const nextModel: StudentModel = {
    ...model,
    version: 2,
    updatedAt: answeredAt,
    totalAttempts,
    totalCorrect,
    overallAccuracy: totalCorrect / totalAttempts,
    difficultyComfort: updateDifficultyComfort(model.difficultyComfort, input.problem.difficulty, input.correct, confidence),
    averageResponseTimeSeconds: rollingAverage(model.averageResponseTimeSeconds, responseTimeSeconds),
    averageConfidence: rollingAverage(model.averageConfidence, confidence),
    abilityProfile,
    domainReadiness: buildDomainReadiness(conceptStates),
    currentPlacement: inferCurrentPlacement(conceptStates, totalAttempts),
    conceptStates,
    misconceptionCounts,
    recommendedReviewConcepts: selectReviewConcepts(conceptStates, answeredAt),
    recommendedNextStep: buildRecommendedNextStep(conceptStates, abilityProfile)
  };

  return nextModel;
}

export function migrateStudentModel(model: StudentModel | null): StudentModel {
  if (!model) return createEmptyStudentModel();

  const migratedConceptStates = Object.fromEntries(
    Object.entries(model.conceptStates ?? {}).map(([concept, state]) => {
      const dimensions = {
        knowledge: sanitizeScore(state.knowledge, state.mastery),
        skill: sanitizeScore(state.skill, state.mastery),
        reasoning: sanitizeScore(state.reasoning, state.mastery),
        fluency: sanitizeScore(state.fluency, state.stability),
        transfer: sanitizeScore(state.transfer, state.mastery * 0.8 + state.stability * 0.2)
      };

      return [
        concept,
        {
          ...state,
          ...dimensions,
          readiness: state.readiness ?? readinessFromScore((state.mastery + state.stability + averageDimensionScore(dimensions)) / 3)
        }
      ];
    })
  );

  const migrated: StudentModel = {
    ...createEmptyStudentModel(),
    ...model,
    version: 2,
    abilityProfile: migrateAbilityProfile(model.abilityProfile, migratedConceptStates),
    domainReadiness: Object.keys(model.domainReadiness ?? {}).length > 0
      ? model.domainReadiness
      : buildDomainReadiness(migratedConceptStates),
    currentPlacement: model.currentPlacement ?? inferCurrentPlacement(migratedConceptStates, model.totalAttempts ?? 0),
    conceptStates: migratedConceptStates,
    recommendedReviewConcepts: model.recommendedReviewConcepts ?? [],
    recommendedNextStep: model.recommendedNextStep ?? buildRecommendedNextStep(migratedConceptStates, migrateAbilityProfile(model.abilityProfile, migratedConceptStates))
  };

  return migrated;
}

export function summarizeStudentModel(model: StudentModel | null) {
  if (!model) {
    return {
      focusConcepts: [] as ConceptState[],
      secureConcepts: [] as ConceptState[],
      reviewDueConcepts: [] as ConceptState[],
      lowConfidenceConcepts: [] as ConceptState[],
      topMisconceptions: [] as Array<{ misconception: string; count: number }>,
      abilityProfile: createAbilityProfile(),
      domainReadiness: [] as DomainReadiness[],
      currentPlacement: createEmptyStudentModel().currentPlacement
    };
  }

  const migrated = migrateStudentModel(model);
  const states = Object.values(migrated.conceptStates);
  const now = new Date().toISOString();

  return {
    focusConcepts: [...states]
      .filter((state) => state.mastery < 0.62 || state.stability < 0.5 || state.wrongStreak > 0)
      .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
      .slice(0, 4),
    secureConcepts: [...states]
      .filter((state) => state.mastery >= 0.62 && state.stability >= 0.55 && state.wrongStreak === 0)
      .sort((a, b) => b.mastery + b.stability - (a.mastery + a.stability))
      .slice(0, 4),
    reviewDueConcepts: [...states]
      .filter((state) => state.reviewDueAt <= now)
      .sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt))
      .slice(0, 4),
    lowConfidenceConcepts: [...states]
      .filter((state) => state.averageConfidence > 0 && state.averageConfidence < 3)
      .sort((a, b) => a.averageConfidence - b.averageConfidence)
      .slice(0, 4),
    topMisconceptions: Object.entries(model.misconceptionCounts)
      .map(([misconception, count]) => ({ misconception, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
    abilityProfile: migrated.abilityProfile,
    domainReadiness: Object.values(migrated.domainReadiness).sort((a, b) => a.domain.localeCompare(b.domain)),
    currentPlacement: migrated.currentPlacement
  };
}

function createConceptState(concept: string, now: string): ConceptState {
  const dimensions = {
    knowledge: DEFAULT_MASTERY,
    skill: DEFAULT_MASTERY,
    reasoning: DEFAULT_MASTERY,
    fluency: DEFAULT_STABILITY,
    transfer: DEFAULT_MASTERY
  };

  return {
    concept,
    mastery: DEFAULT_MASTERY,
    stability: DEFAULT_STABILITY,
    ...dimensions,
    readiness: "Not Measured",
    attempts: 0,
    correct: 0,
    recentAccuracy: 0.5,
    averageResponseTimeSeconds: 0,
    averageConfidence: 0,
    wrongStreak: 0,
    lastPracticedAt: now,
    reviewDueAt: now
  };
}

function createAbilityProfile(): Record<AbilityDimension, AbilityDimensionState> {
  return Object.fromEntries(
    DIMENSIONS.map((dimension) => [
      dimension,
      {
        score: DEFAULT_MASTERY,
        attempts: 0,
        evidence: [] as string[]
      }
    ])
  ) as Record<AbilityDimension, AbilityDimensionState>;
}

function migrateAbilityProfile(
  profile: StudentModel["abilityProfile"] | undefined,
  conceptStates: Record<string, ConceptState>
) {
  if (profile && DIMENSIONS.every((dimension) => profile[dimension])) return profile;

  const states = Object.values(conceptStates);
  const fallback = createAbilityProfile();
  if (states.length === 0) return fallback;

  DIMENSIONS.forEach((dimension) => {
    fallback[dimension] = {
      score: average(states.map((state) => state[dimension])),
      attempts: states.reduce((sum, state) => sum + state.attempts, 0),
      evidence: [`Derived from ${states.length} concept state(s).`]
    };
  });

  return fallback;
}

function inferDimensions(problem: Problem, responseTimeSeconds: number | undefined): AbilityDimension[] {
  const tags = [
    ...(problem.taxonomy?.cognitiveTags ?? []),
    ...problem.skills,
    ...problem.patterns
  ].join(" ");
  const dimensions = new Set<AbilityDimension>(["knowledge", "skill"]);

  if (/reason|structure|diagram|case|model|proof|transfer|construct|pattern|equation_from_context/.test(tags)) {
    dimensions.add("reasoning");
  }

  if (problem.taxonomy?.stage === "AMC8 Transfer" || problem.curriculum.course === "AMC8" || problem.difficulty >= 4) {
    dimensions.add("transfer");
  }

  if ((responseTimeSeconds ?? 0) > 0 || /fluency|precision|compute|operation/.test(tags)) {
    dimensions.add("fluency");
  }

  return [...dimensions];
}

function updateConceptDimensions(
  previous: ConceptState,
  dimensions: AbilityDimension[],
  correct: boolean,
  responseTimeSeconds: number | undefined,
  confidence: number | undefined
) {
  const next = {
    knowledge: previous.knowledge,
    skill: previous.skill,
    reasoning: previous.reasoning,
    fluency: previous.fluency,
    transfer: previous.transfer
  };
  const delta = dimensionDelta(correct, responseTimeSeconds, confidence);

  dimensions.forEach((dimension) => {
    next[dimension] = clamp(next[dimension] + delta);
  });

  return next;
}

function updateAbilityProfile(
  profile: Record<AbilityDimension, AbilityDimensionState>,
  problem: Problem,
  dimensions: AbilityDimension[],
  correct: boolean,
  responseTimeSeconds: number | undefined,
  confidence: number | undefined
) {
  const next = { ...profile };
  const delta = dimensionDelta(correct, responseTimeSeconds, confidence);

  dimensions.forEach((dimension) => {
    const previous = next[dimension] ?? createAbilityProfile()[dimension];

    next[dimension] = {
      score: clamp(previous.score + delta),
      attempts: previous.attempts + 1,
      evidence: [
        `${problem.id}: ${correct ? "correct" : "missed"} ${problem.taxonomy?.problemType ?? "problem"}`
      ].concat(previous.evidence).slice(0, 5)
    };
  });

  return next;
}

function dimensionDelta(correct: boolean, responseTimeSeconds: number | undefined, confidence: number | undefined) {
  const speed = responseTimeSeconds === undefined ? 0 : responseTimeSeconds <= 60 ? 0.015 : responseTimeSeconds >= 150 ? -0.02 : 0;
  const confidenceBoost = confidence === undefined ? 0 : (confidence - 3) * 0.012;
  return correct ? 0.075 + speed + confidenceBoost : -0.105 + Math.min(0, confidenceBoost);
}

function buildDomainReadiness(conceptStates: Record<string, ConceptState>): Record<string, DomainReadiness> {
  const groups = new Map<string, ConceptState[]>();

  Object.values(conceptStates).forEach((state) => {
    const domain = inferDomainFromConcept(state.concept);
    groups.set(domain, [...(groups.get(domain) ?? []), state]);
  });

  return Object.fromEntries(
    [...groups.entries()].map(([domain, states]) => {
      const score = average(states.map((state) => (state.mastery + state.stability + averageDimensionScore(state)) / 3));

      return [
        domain,
        {
          domain,
          score,
          attempts: states.reduce((sum, state) => sum + state.attempts, 0),
          status: readinessFromScore(score),
          focusConcepts: [...states]
            .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
            .slice(0, 3)
            .map((state) => state.concept)
        }
      ];
    })
  );
}

function inferCurrentPlacement(conceptStates: Record<string, ConceptState>, attempts: number): StudentModel["currentPlacement"] {
  if (attempts === 0) {
    return {
      stage: "Foundation",
      status: "Not Measured",
      evidence: "No diagnostic or practice evidence has been recorded yet."
    };
  }

  const domainReadiness = buildDomainReadiness(conceptStates);
  const foundationScore = domainReadiness.Arithmetic?.score ?? 0.5;
  const bridgeScore = domainReadiness["Pre-Algebra"]?.score ?? foundationScore;
  const algebraScore = domainReadiness.Algebra?.score ?? bridgeScore;
  const amcScore = average([
    domainReadiness.Geometry?.score,
    domainReadiness["Number Theory"]?.score,
    domainReadiness["Counting and Probability"]?.score,
    domainReadiness.Statistics?.score
  ].filter((value): value is number => typeof value === "number"));

  if (foundationScore < 0.58) {
    return { stage: "Foundation", status: readinessFromScore(foundationScore), evidence: "Arithmetic foundations are still the main constraint." };
  }

  if (bridgeScore < 0.62) {
    return { stage: "Bridge", status: readinessFromScore(bridgeScore), evidence: "Pre-Algebra bridge skills need more stable practice." };
  }

  if (algebraScore < 0.62) {
    return { stage: "Algebra Readiness", status: readinessFromScore(algebraScore), evidence: "Algebra readiness is the next active target." };
  }

  return {
    stage: "AMC8 Transfer",
    status: readinessFromScore(amcScore || algebraScore),
    evidence: "Foundation and Algebra readiness are stable enough to emphasize AMC8 transfer."
  };
}

function buildRecommendedNextStep(
  conceptStates: Record<string, ConceptState>,
  abilityProfile: Record<AbilityDimension, AbilityDimensionState>
) {
  const focus = Object.values(conceptStates).sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))[0];
  const weakestDimension = [...DIMENSIONS].sort((a, b) => abilityProfile[a].score - abilityProfile[b].score)[0];

  if (focus) {
    return `Work on ${focus.concept} with emphasis on ${weakestDimension}.`;
  }

  return `Start a diagnostic to measure ${weakestDimension}.`;
}

function rollingRecentAccuracy(previous: number, correct: boolean) {
  return clamp(previous * 0.7 + (correct ? 1 : 0) * 0.3);
}

function rollingAverage(previous: number | undefined, value: number | undefined) {
  if (value === undefined) return previous ?? 0;
  if (!previous) return value;
  return previous * 0.75 + value * 0.25;
}

function updateDifficultyComfort(previous: number, difficulty: number, correct: boolean, confidence?: number) {
  const target = correct ? difficulty + 0.25 : difficulty - 0.35;
  const confidenceAdjustment = confidence === undefined ? 0 : (confidence - 3) * 0.06;
  return clampToRange(previous * 0.82 + (target + confidenceAdjustment) * 0.18, 1, 5);
}

function nextReviewDueAt(answeredAt: string, stability: number, correct: boolean) {
  const baseDays = correct ? 2 + Math.round(stability * 8) : 1;
  const due = new Date(answeredAt);
  due.setDate(due.getDate() + baseDays);
  return due.toISOString();
}

function selectReviewConcepts(conceptStates: Record<string, ConceptState>, now: string) {
  return Object.values(conceptStates)
    .filter((state) => state.reviewDueAt <= now || state.stability < 0.48 || state.wrongStreak > 0)
    .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
    .slice(0, 6)
    .map((state) => state.concept);
}

function scoreFocusConcept(state: ConceptState) {
  const confidencePenalty = state.averageConfidence > 0 ? Math.max(0, (3 - state.averageConfidence) / 3) * 0.35 : 0;
  return (
    (1 - state.mastery) * 1.2 +
    (1 - state.stability) +
    state.wrongStreak * 0.25 +
    (1 - state.recentAccuracy) * 0.6 +
    confidencePenalty
  );
}

function clamp(value: number) {
  return clampToRange(value, 0, 1);
}

function clampToRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeScore(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value) : clamp(fallback);
}

function average(values: number[]) {
  if (values.length === 0) return DEFAULT_MASTERY;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageDimensionScore(state: Pick<ConceptState, AbilityDimension>) {
  return average(DIMENSIONS.map((dimension) => state[dimension]));
}

function readinessFromScore(score: number): ReadinessStatus {
  if (score >= 0.72) return "Ready";
  if (score >= 0.55) return "Developing";
  return "Needs Repair";
}

function inferDomainFromConcept(concept: string) {
  if (concept.startsWith("arith_")) return "Arithmetic";
  if (concept.startsWith("prealg_")) return "Pre-Algebra";
  if (concept.startsWith("alg_")) return "Algebra";
  if (concept.startsWith("geo_")) return "Geometry";
  if (concept.startsWith("nt_")) return "Number Theory";
  if (concept.startsWith("counting_")) return "Counting and Probability";
  if (concept.startsWith("stats_")) return "Statistics";
  return "Mixed";
}

function sanitizeResponseTime(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 3600) : undefined;
}

function sanitizeConfidence(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? clampToRange(Math.round(value), 1, 5) : undefined;
}

function scoreFluency(responseTimeSeconds: number | undefined, confidence: number | undefined, correct: boolean) {
  const confidenceScore = confidence === undefined ? 0 : (confidence - 3) * 0.015;
  const speedScore = responseTimeSeconds === undefined ? 0 : responseTimeSeconds <= 45 ? 0.012 : responseTimeSeconds >= 180 ? -0.018 : 0;

  return correct ? confidenceScore + speedScore : Math.min(0.01, confidenceScore + speedScore);
}
