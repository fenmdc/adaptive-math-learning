import type { SimulationLog } from "../dashboard/types";
import { summarizeCognitivePatterns, type CognitivePatternSignal } from "./cognitivePatterns";
import type { StudentModel } from "./studentModel";

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
  targetConcepts: string[];
  recommendationTitle: string;
  recommendationReason: string;
  practiceHref: string;
};

const STAGES: ReportStage[] = ["Foundation", "Bridge", "Algebra Readiness", "AMC8 Transfer"];

export function buildAssessmentReport(
  diagnosticLogs: SimulationLog[],
  studentModel: StudentModel | null
): AssessmentReport {
  const attempts = diagnosticLogs.length;
  const accuracy = attempts === 0
    ? 0
    : Math.round((diagnosticLogs.filter((log) => log.correct).length / attempts) * 100);
  const stageReadiness = STAGES.map((stage) => summarizeStage(stage, diagnosticLogs));
  const conceptSummaries = summarizeConcepts(diagnosticLogs, studentModel);
  const focusConcepts = conceptSummaries
    .filter((concept) => concept.mastery < 0.66 || concept.wrongCount > 0 || (concept.stability ?? 1) < 0.58)
    .sort((a, b) => scoreFocusConcept(b) - scoreFocusConcept(a))
    .slice(0, 5);
  const strongestConcepts = conceptSummaries
    .filter((concept) => concept.mastery >= 0.62 && concept.wrongCount === 0)
    .sort((a, b) => b.mastery - a.mastery || (b.stability ?? 0) - (a.stability ?? 0))
    .slice(0, 4);
  const prerequisiteGaps = summarizePrerequisiteGaps(diagnosticLogs);
  const fluencySignals = summarizeFluencySignals(diagnosticLogs, studentModel);
  const confidenceSignals = summarizeConfidenceSignals(diagnosticLogs, studentModel);
  const cognitivePatterns = summarizeCognitivePatterns(diagnosticLogs);
  const targetConcepts = selectTargetConcepts(focusConcepts, prerequisiteGaps, diagnosticLogs);
  const recommendationTitle = targetConcepts.length
    ? `Start a focused mini session on ${humanizeConcept(targetConcepts[0])}`
    : "Start a balanced adaptive mini session";
  const recommendationReason = buildRecommendationReason(targetConcepts, focusConcepts, prerequisiteGaps, stageReadiness);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    attempts,
    accuracy,
    stageReadiness,
    strongestConcepts,
    focusConcepts,
    prerequisiteGaps,
    fluencySignals,
    confidenceSignals,
    cognitivePatterns,
    targetConcepts,
    recommendationTitle,
    recommendationReason,
    practiceHref: buildPracticeHref(targetConcepts)
  };
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
  stageReadiness: StageReadiness[]
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
    ? `Continue with ${targetConcepts[0]} in a short adaptive mini session.`
    : "The diagnostic is balanced so far; continue with a short adaptive mini session.";
}

function buildPracticeHref(targetConcepts: string[]) {
  const params = new URLSearchParams({
    mode: "plan",
    maxItems: "8",
    autoGradableOnly: "true"
  });

  if (targetConcepts.length > 0) {
    params.set("concepts", targetConcepts.join(","));
  }

  return `/practice?${params.toString()}`;
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
