import type { SimulationLog } from "../dashboard/types";
import { summarizeCognitivePatterns, type CognitivePatternSignal } from "./cognitivePatterns";
import { migrateStudentModel, type AbilityDimension, type DomainReadiness, type ReadinessStatus, type StudentModel } from "./studentModel";

export type ReportStage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";

export type StageReadiness = {
  stage: ReportStage;
  attempts: number;
  accuracy: number;
  status: "Ready" | "Developing" | "Needs Review" | "Not Measured";
  evidence: string;
};

export type ReportConcept = {
  concept: string;
  mastery: number;
  stability?: number;
  attempts?: number;
  wrongCount: number;
};

export type AssessmentReport = {
  version: 1;
  createdAt: string;
  attempts: number;
  accuracy: number;
  placement: {
    stage: ReportStage;
    status: ReadinessStatus;
    evidence: string;
  };
  abilityProfile: Array<{
    dimension: AbilityDimension;
    score: number;
    attempts: number;
    status: ReadinessStatus;
    evidence: string;
  }>;
  domainReadiness: DomainReadiness[];
  stageReadiness: StageReadiness[];
  strongestConcepts: ReportConcept[];
  focusConcepts: ReportConcept[];
  prerequisiteGaps: Array<{
    concept: string;
    targetConcept: string;
    count: number;
    mastery: number;
  }>;
  fluencySignals: string[];
  confidenceSignals: string[];
  cognitivePatterns: CognitivePatternSignal[];
  summaryBullets: string[];
  targetConcepts: string[];
  learningPathIntent: {
    mode: "repair" | "bridge" | "advance" | "transfer";
    targetStage: ReportStage;
    targetConcepts: string[];
    sessionLength: number;
  };
  recommendationTitle: string;
  recommendationReason: string;
  practiceHref: string;
};

const STAGES: ReportStage[] = ["Foundation", "Bridge", "Algebra Readiness", "AMC8 Transfer"];

export function buildAssessmentReport(
  diagnosticLogs: SimulationLog[],
  studentModel: StudentModel | null
): AssessmentReport {
  const migratedModel = migrateStudentModel(studentModel);
  const attempts = diagnosticLogs.length;
  const accuracy = attempts === 0
    ? 0
    : Math.round((diagnosticLogs.filter((log) => log.correct).length / attempts) * 100);
  const stageReadiness = STAGES.map((stage) => summarizeStage(stage, diagnosticLogs));
  const conceptSummaries = summarizeConcepts(diagnosticLogs, migratedModel);
  const focusConcepts = conceptSummaries
    .filter((concept) => concept.mastery < 0.66 || concept.wrongCount > 0 || (concept.stability ?? 1) < 0.58)
    .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
    .slice(0, 5);
  const strongestConcepts = conceptSummaries
    .filter((concept) => concept.mastery >= 0.62 && concept.wrongCount === 0)
    .sort((a, b) => b.mastery - a.mastery || (b.stability ?? 0) - (a.stability ?? 0))
    .slice(0, 4);
  const prerequisiteGaps = summarizePrerequisiteGaps(diagnosticLogs);
  const fluencySignals = summarizeFluencySignals(diagnosticLogs, migratedModel);
  const confidenceSignals = summarizeConfidenceSignals(diagnosticLogs, migratedModel);
  const cognitivePatterns = summarizeCognitivePatterns(diagnosticLogs);
  const targetConcepts = selectTargetConcepts(focusConcepts, prerequisiteGaps, diagnosticLogs);
  const placement = {
    stage: migratedModel.currentPlacement.stage,
    status: migratedModel.currentPlacement.status,
    evidence: migratedModel.currentPlacement.evidence
  };
  const abilityProfile = buildAbilityProfile(migratedModel);
  const domainReadiness = Object.values(migratedModel.domainReadiness).sort((a, b) => a.domain.localeCompare(b.domain));
  const learningPathIntent = buildLearningPathIntent(placement.stage, placement.status, targetConcepts, prerequisiteGaps);
  const recommendationTitle = targetConcepts.length
    ? `Start a focused mini session on ${humanizeConcept(targetConcepts[0])}`
    : "Start a balanced adaptive mini session";
  const recommendationReason = buildRecommendationReason(targetConcepts, focusConcepts, prerequisiteGaps, stageReadiness, placement);
  const summaryBullets = buildSummaryBullets(accuracy, placement, abilityProfile, focusConcepts, prerequisiteGaps, cognitivePatterns);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    attempts,
    accuracy,
    placement,
    abilityProfile,
    domainReadiness,
    stageReadiness,
    strongestConcepts,
    focusConcepts,
    prerequisiteGaps,
    fluencySignals,
    confidenceSignals,
    cognitivePatterns,
    summaryBullets,
    targetConcepts,
    learningPathIntent,
    recommendationTitle,
    recommendationReason,
    practiceHref: buildPracticeHref(learningPathIntent)
  };
}

function buildAbilityProfile(studentModel: StudentModel): AssessmentReport["abilityProfile"] {
  return Object.entries(studentModel.abilityProfile).map(([dimension, state]) => ({
    dimension: dimension as AbilityDimension,
    score: state.score,
    attempts: state.attempts,
    status: readinessFromScore(state.score),
    evidence: state.evidence[0] ?? "No direct evidence yet."
  }));
}

function summarizeStage(stage: ReportStage, logs: SimulationLog[]): StageReadiness {
  const stageLogs = logs.filter((log) => (log.diagnosticStage ?? inferStage(log.concepts)) === stage);
  const attempts = stageLogs.length;

  if (attempts === 0) {
    return {
      stage,
      attempts,
      accuracy: 0,
      status: "Not Measured",
      evidence: "No diagnostic item has been completed for this stage yet."
    };
  }

  const correct = stageLogs.filter((log) => log.correct).length;
  const weakSignals = stageLogs.reduce((sum, log) => sum + log.weakConcepts.length, 0);
  const accuracy = Math.round((correct / attempts) * 100);
  const status = getReadinessStatus(accuracy, weakSignals);

  return {
    stage,
    attempts,
    accuracy,
    status,
    evidence: `${correct}/${attempts} correct with ${weakSignals} weak signal(s).`
  };
}

function summarizeConcepts(logs: SimulationLog[], studentModel: StudentModel | null): ReportConcept[] {
  if (studentModel && Object.keys(studentModel.conceptStates).length > 0) {
    return Object.values(studentModel.conceptStates).map((state) => ({
      concept: state.concept,
      mastery: state.mastery,
      stability: state.stability,
      attempts: state.attempts,
      wrongCount: state.attempts - state.correct
    }));
  }

  const latestMastery = logs.at(-1)?.mastery ?? {};
  const wrongCounts = countWrongConcepts(logs);

  return Object.entries(latestMastery).map(([concept, mastery]) => ({
    concept,
    mastery,
    wrongCount: wrongCounts[concept] ?? 0
  }));
}

function summarizePrerequisiteGaps(logs: SimulationLog[]) {
  const gaps = new Map<string, { concept: string; targetConcept: string; count: number; mastery: number }>();

  logs.forEach((log) => {
    (log.prerequisiteGaps ?? []).forEach((gap) => {
      const key = `${gap.concept}:${gap.targetConcept}`;
      const current = gaps.get(key);

      gaps.set(key, {
        concept: gap.concept,
        targetConcept: gap.targetConcept,
        count: (current?.count ?? 0) + 1,
        mastery: current ? Math.min(current.mastery, gap.mastery) : gap.mastery
      });
    });
  });

  return [...gaps.values()].sort((a, b) => b.count - a.count || a.mastery - b.mastery).slice(0, 4);
}

function summarizeFluencySignals(logs: SimulationLog[], studentModel: StudentModel | null) {
  const signals = new Set<string>();

  logs
    .filter((log) => (log.responseTimeSeconds ?? 0) >= 120)
    .flatMap((log) => log.concepts)
    .forEach((concept) => signals.add(concept));

  Object.values(studentModel?.conceptStates ?? {})
    .filter((state) => state.averageResponseTimeSeconds >= 120)
    .forEach((state) => signals.add(state.concept));

  return [...signals].slice(0, 4);
}

function summarizeConfidenceSignals(logs: SimulationLog[], studentModel: StudentModel | null) {
  const signals = new Set<string>();

  logs
    .filter((log) => (log.confidence ?? 5) <= 2)
    .flatMap((log) => log.concepts)
    .forEach((concept) => signals.add(concept));

  Object.values(studentModel?.conceptStates ?? {})
    .filter((state) => state.averageConfidence > 0 && state.averageConfidence < 3)
    .forEach((state) => signals.add(state.concept));

  return [...signals].slice(0, 4);
}

function selectTargetConcepts(
  focusConcepts: ReportConcept[],
  prerequisiteGaps: AssessmentReport["prerequisiteGaps"],
  logs: SimulationLog[]
) {
  const targets = [
    ...prerequisiteGaps.map((gap) => gap.concept),
    ...focusConcepts.map((concept) => concept.concept),
    ...logs
      .filter((log) => !log.correct)
      .flatMap((log) => log.concepts)
  ];

  return [...new Set(targets)].slice(0, 4);
}

function buildRecommendationReason(
  targetConcepts: string[],
  focusConcepts: ReportConcept[],
  prerequisiteGaps: AssessmentReport["prerequisiteGaps"],
  stageReadiness: StageReadiness[],
  placement: AssessmentReport["placement"]
) {
  if (prerequisiteGaps.length > 0) {
    const gap = prerequisiteGaps[0];
    return `${gap.concept} is blocking ${gap.targetConcept}. Start there before pushing the target concept harder.`;
  }

  if (focusConcepts.length > 0) {
    const focus = focusConcepts[0];
    return `${focus.concept} is the clearest next focus at ${Math.round(focus.mastery * 100)}% mastery.`;
  }

  const developingStage = stageReadiness.find((stage) => stage.status === "Developing" || stage.status === "Needs Review");

  if (developingStage) {
    return `${developingStage.stage} needs another short mixed set before moving forward.`;
  }

  return targetConcepts.length
    ? `Continue with ${targetConcepts[0]} in a short ${placement.stage} mini session.`
    : `The diagnostic places the learner at ${placement.stage}; continue with a short adaptive mini session.`;
}

function buildPracticeHref(intent: AssessmentReport["learningPathIntent"]) {
  const params = new URLSearchParams({
    mode: "plan",
    maxItems: String(intent.sessionLength),
    autoGradableOnly: "true"
  });

  if (intent.targetConcepts.length > 0) {
    params.set("concepts", intent.targetConcepts.join(","));
  }

  return `/practice?${params.toString()}`;
}

function buildLearningPathIntent(
  targetStage: ReportStage,
  status: ReadinessStatus,
  targetConcepts: string[],
  prerequisiteGaps: AssessmentReport["prerequisiteGaps"]
): AssessmentReport["learningPathIntent"] {
  const mode = prerequisiteGaps.length > 0 || status === "Needs Repair"
    ? "repair"
    : targetStage === "Foundation"
      ? "bridge"
      : targetStage === "AMC8 Transfer"
        ? "transfer"
        : "advance";

  return {
    mode,
    targetStage,
    targetConcepts,
    sessionLength: mode === "repair" ? 6 : mode === "transfer" ? 10 : 8
  };
}

function buildSummaryBullets(
  accuracy: number,
  placement: AssessmentReport["placement"],
  abilityProfile: AssessmentReport["abilityProfile"],
  focusConcepts: ReportConcept[],
  prerequisiteGaps: AssessmentReport["prerequisiteGaps"],
  cognitivePatterns: CognitivePatternSignal[]
) {
  const weakestAbility = [...abilityProfile].sort((a, b) => a.score - b.score)[0];

  return [
    `${placement.stage}: ${placement.status}. ${placement.evidence}`,
    `Overall diagnostic accuracy is ${accuracy}%.`,
    weakestAbility ? `${humanizeConcept(weakestAbility.dimension)} is the lowest ability dimension at ${Math.round(weakestAbility.score * 100)}%.` : "",
    prerequisiteGaps[0] ? `${prerequisiteGaps[0].concept} is blocking ${prerequisiteGaps[0].targetConcept}.` : "",
    focusConcepts[0] ? `${focusConcepts[0].concept} is the highest priority focus concept.` : "",
    cognitivePatterns[0] ? `${cognitivePatterns[0].label} is the clearest cognitive pattern signal.` : ""
  ].filter(Boolean);
}

function countWrongConcepts(logs: SimulationLog[]) {
  const counts: Record<string, number> = {};

  logs
    .filter((log) => !log.correct)
    .forEach((log) => {
      log.concepts.forEach((concept) => {
        counts[concept] = (counts[concept] ?? 0) + 1;
      });
    });

  return counts;
}

function getReadinessStatus(accuracy: number, weakSignals: number): StageReadiness["status"] {
  if (accuracy >= 75 && weakSignals <= 1) return "Ready";
  if (accuracy >= 50) return "Developing";
  return "Needs Review";
}

function readinessFromScore(score: number): ReadinessStatus {
  if (score >= 0.72) return "Ready";
  if (score >= 0.55) return "Developing";
  return "Needs Repair";
}

function scoreFocusConcept(concept: ReportConcept) {
  return (
    (1 - concept.mastery) * 1.3 +
    (1 - (concept.stability ?? 0.65)) * 0.7 +
    concept.wrongCount * 0.28
  );
}

function inferStage(concepts: string[]): ReportStage {
  const primary = concepts[0] ?? "";
  if (primary.startsWith("arith_")) return "Foundation";
  if (primary.startsWith("prealg_")) return "Bridge";
  if (primary.startsWith("alg_")) return "Algebra Readiness";
  return "AMC8 Transfer";
}

function humanizeConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
