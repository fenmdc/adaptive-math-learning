import type { SimulationLog } from "../dashboard/types";
import { summarizeCognitivePatterns, type CognitivePatternSignal } from "./cognitivePatterns";
import { summarizeDiagnosticCalibration, type DiagnosticCalibrationSummary } from "./diagnosticCalibration";
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

export type SeniorHighReadinessSignal = {
  id: string;
  label: string;
  courseStage: "Grade 10" | "Grade 11" | "Grade 12";
  attempts: number;
  correct: number;
  accuracy: number;
  status: "Ready" | "Developing" | "Needs Review" | "Not Measured";
  concepts: string[];
  evidence: string;
  nextAction: string;
  practiceHref: string;
};

export type SeniorHighRecommendation = {
  title: string;
  reason: string;
  href: string;
  signalId: string;
  status: SeniorHighReadinessSignal["status"];
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
  seniorHighReadiness: SeniorHighReadinessSignal[];
  seniorHighRecommendation?: SeniorHighRecommendation;
  calibration: DiagnosticCalibrationSummary;
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
const SENIOR_HIGH_SIGNAL_DEFINITIONS: Array<{
  id: string;
  label: string;
  courseStage: SeniorHighReadinessSignal["courseStage"];
  slotIds: string[];
  concepts: string[];
  evidence: string;
  readyAction: string;
  practiceHref: string;
}> = [
  {
    id: "cn-g10-functions",
    label: "高一函数基础",
    courseStage: "Grade 10",
    slotIds: ["cn-g10-function-readiness"],
    concepts: ["alg_functions", "prealg_substitution"],
    evidence: "Function notation and substitution are the first senior-high algebra anchor.",
    readyAction: "Continue with Grade 10 function and graph practice.",
    practiceHref: buildSeniorHighPracticeHref("subjective-v0-cn-g10-functions", "高一：函数概念与性质")
  },
  {
    id: "cn-g10-quadratics",
    label: "高一二次函数",
    courseStage: "Grade 10",
    slotIds: ["cn-g10-quadratic-readiness"],
    concepts: ["alg_quadratics", "alg_functions"],
    evidence: "Quadratic structure connects equation solving, vertex form, and graph interpretation.",
    readyAction: "Move into mixed quadratic function and inequality checkpoints.",
    practiceHref: buildSeniorHighPracticeHref("subjective-v0-cn-g10-quadratics", "高一：二次函数与不等式")
  },
  {
    id: "cn-g11-sequences",
    label: "高二数列",
    courseStage: "Grade 11",
    slotIds: ["cn-g11-sequence-readiness"],
    concepts: ["alg_functions", "arith_natural_numbers"],
    evidence: "Sequences test whether function thinking transfers to discrete indices.",
    readyAction: "Continue with sequence formulas, recursion, and summation.",
    practiceHref: buildSeniorHighPracticeHref("subjective-v0-cn-g11-sequences", "高二：等差等比数列")
  },
  {
    id: "cn-g12-probability",
    label: "高三概率统计",
    courseStage: "Grade 12",
    slotIds: ["cn-g12-probability-transfer"],
    concepts: ["counting_probability", "arith_fractions"],
    evidence: "Probability statistics is a senior transfer signal shared with AMC-style modeling.",
    readyAction: "Continue with probability modeling and statistics interpretation.",
    practiceHref: buildSeniorHighPracticeHref("subjective-v0-cn-g12-probability-statistics", "高三：概率统计综合")
  }
];

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
  const seniorHighReadiness = summarizeSeniorHighReadiness(diagnosticLogs);
  const seniorHighRecommendation = buildSeniorHighRecommendation(seniorHighReadiness);
  const calibration = summarizeDiagnosticCalibration(diagnosticLogs);
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
  const recommendationTitle = seniorHighRecommendation?.title ?? (targetConcepts.length
    ? `Start a focused mini session on ${humanizeConcept(targetConcepts[0])}`
    : "Start a balanced adaptive mini session");
  const recommendationReason = seniorHighRecommendation?.reason ?? buildRecommendationReason(targetConcepts, focusConcepts, prerequisiteGaps, stageReadiness, placement);
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
    seniorHighReadiness,
    seniorHighRecommendation,
    calibration,
    cognitivePatterns,
    summaryBullets,
    targetConcepts,
    learningPathIntent,
    recommendationTitle,
    recommendationReason,
    practiceHref: seniorHighRecommendation?.href ?? buildPracticeHref(learningPathIntent)
  };
}

function summarizeSeniorHighReadiness(logs: SimulationLog[]): SeniorHighReadinessSignal[] {
  return SENIOR_HIGH_SIGNAL_DEFINITIONS.map((definition) => {
    const signalLogs = logs.filter((log) => definition.slotIds.includes(log.diagnosticSlot ?? ""));
    const attempts = signalLogs.length;
    const correct = signalLogs.filter((log) => log.correct).length;
    const accuracy = attempts === 0 ? 0 : Math.round((correct / attempts) * 100);
    const status = attempts === 0 ? "Not Measured" : getReadinessStatus(accuracy, signalLogs.reduce((sum, log) => sum + log.weakConcepts.length, 0));
    const missedConcepts = [
      ...new Set(signalLogs.filter((log) => !log.correct).flatMap((log) => log.concepts))
    ];

    return {
      id: definition.id,
      label: definition.label,
      courseStage: definition.courseStage,
      attempts,
      correct,
      accuracy,
      status,
      concepts: definition.concepts,
      evidence: attempts === 0
        ? "No senior-high diagnostic evidence yet."
        : `${correct}/${attempts} correct. ${definition.evidence}`,
      nextAction: missedConcepts.length > 0
        ? `Review ${missedConcepts.slice(0, 2).map(humanizeConcept).join(", ")} before moving deeper.`
        : attempts === 0
          ? `Run the full diagnostic to measure ${definition.label}.`
          : definition.readyAction,
      practiceHref: definition.practiceHref
    };
  });
}

function buildSeniorHighRecommendation(
  signals: SeniorHighReadinessSignal[]
): SeniorHighRecommendation | undefined {
  const measuredSignals = signals.filter((signal) => signal.attempts > 0);
  const weakSignal = measuredSignals
    .filter((signal) => signal.status === "Needs Review" || signal.status === "Developing")
    .sort((a, b) => readinessPriority(a.status) - readinessPriority(b.status) || a.accuracy - b.accuracy)[0];

  if (weakSignal) {
    return {
      title: `Repair ${weakSignal.label}`,
      reason: `${weakSignal.label} is the clearest senior-high diagnostic follow-up: ${weakSignal.evidence} ${weakSignal.nextAction}`,
      href: withSessionCopy(weakSignal.practiceHref, `修复 ${weakSignal.label}`, weakSignal.nextAction),
      signalId: weakSignal.id,
      status: weakSignal.status
    };
  }

  const readySignal = measuredSignals
    .filter((signal) => signal.status === "Ready")
    .sort((a, b) => courseStagePriority(b.courseStage) - courseStagePriority(a.courseStage))[0];

  if (readySignal) {
    return {
      title: `Continue ${readySignal.label}`,
      reason: `${readySignal.label} looks ready from the diagnostic. ${readySignal.nextAction}`,
      href: withSessionCopy(readySignal.practiceHref, `继续 ${readySignal.label}`, readySignal.nextAction),
      signalId: readySignal.id,
      status: readySignal.status
    };
  }

  return undefined;
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

function buildSeniorHighPracticeHref(chapter: string, chapterTitle: string) {
  const params = new URLSearchParams({
    autoGradableOnly: "false",
    chapter,
    course: "CN Senior High Math",
    curriculumSystem: "CN",
    language: "zh",
    layerStrategy: "balanced",
    maxItems: "8",
    sessionSource: "senior-diagnostic-report",
    sessionGoal: `根据高中 Diagnostic 信号进入 ${chapterTitle} 章节测验。`,
    sessionTitle: `${chapterTitle} · Diagnostic follow-up`,
    track: "中文校内"
  });

  return `/practice?${params.toString()}`;
}

function withSessionCopy(href: string, title: string, goal: string) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);

  params.set("sessionTitle", title);
  params.set("sessionGoal", goal);

  return `${path}?${params.toString()}`;
}

function readinessPriority(status: SeniorHighReadinessSignal["status"]) {
  if (status === "Needs Review") return 0;
  if (status === "Developing") return 1;
  if (status === "Not Measured") return 2;
  return 3;
}

function courseStagePriority(stage: SeniorHighReadinessSignal["courseStage"]) {
  if (stage === "Grade 12") return 3;
  if (stage === "Grade 11") return 2;
  return 1;
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
