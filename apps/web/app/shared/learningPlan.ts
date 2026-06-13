import type { Problem } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { ConceptState, StudentModel } from "./studentModel";

export type LearningPlan = {
  version: 1;
  status: "empty" | "ready";
  mode: "diagnostic" | "repair" | "bridge" | "advance" | "transfer" | "balanced";
  title: string;
  reason: string;
  targetConcept?: string;
  targetMastery?: number;
  course?: string;
  theme?: string;
  chapter?: string;
  chapterTitle?: string;
  href: string;
  supportingConcepts: string[];
  steps: LearningPlanStep[];
  successCriteria: string[];
};

export type LearningPlanStep = {
  id: string;
  title: string;
  reason: string;
  href: string;
  targetConcepts: string[];
  stage: "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
  sessionLength: number;
  priority: "repair" | "practice" | "review" | "challenge";
};

export function buildLearningPlan(
  logs: SimulationLog[],
  problems: Problem[],
  studentModel?: StudentModel | null
): LearningPlan {
  if (studentModel && Object.keys(studentModel.conceptStates).length > 0) {
    return buildLearningPlanFromStudentModel(studentModel, problems);
  }

  if (logs.length === 0) {
    return {
      version: 1,
      status: "empty",
      mode: "diagnostic",
      title: "Start with the diagnostic",
      reason: "A short diagnostic gives the system enough signal to recommend a focused first practice range.",
      href: "/diagnostic",
      supportingConcepts: [],
      steps: [],
      successCriteria: ["Complete the initial diagnostic."]
    };
  }

  const latestMastery = logs.at(-1)?.mastery ?? {};
  const weakCounts = countWeakConcepts(logs);
  const wrongConceptCounts = countWrongConcepts(logs);
  const candidates = Object.entries(latestMastery)
    .map(([concept, mastery]) => ({
      concept,
      mastery,
      weakCount: weakCounts[concept] ?? 0,
      wrongCount: wrongConceptCounts[concept] ?? 0,
      score: (1 - mastery) * 100 + (weakCounts[concept] ?? 0) * 12 + (wrongConceptCounts[concept] ?? 0) * 18
    }))
    .sort((a, b) => b.score - a.score);

  const target =
    candidates.find((candidate) => candidate.mastery < 0.62 || candidate.weakCount > 0 || candidate.wrongCount > 0) ??
    candidates[0];

  if (!target) {
    return {
      version: 1,
      status: "empty",
      mode: "balanced",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: [],
      steps: [],
      successCriteria: ["Complete at least one short adaptive practice session."]
    };
  }

  const chapter = selectChapterForConcept(target.concept, problems);
  const href = chapter
    ? `/practice?course=${encodeURIComponent(chapter.course)}&theme=${encodeURIComponent(chapter.theme)}&chapter=${encodeURIComponent(chapter.chapter)}`
    : `/practice`;
  const supportingConcepts = candidates
    .filter((candidate) => candidate.concept !== target.concept)
    .slice(0, 3)
    .map((candidate) => candidate.concept);

  return {
    version: 1,
    status: "ready",
    mode: inferPlanMode(target.concept, target.mastery, target.wrongCount, target.weakCount),
    title: `Practice ${humanizeConcept(target.concept)}`,
    reason: buildReason(target, chapter?.chapterTitle),
    targetConcept: target.concept,
    targetMastery: target.mastery,
    course: chapter?.course,
    theme: chapter?.theme,
    chapter: chapter?.chapter,
    chapterTitle: chapter?.chapterTitle,
    href,
    supportingConcepts,
    steps: buildPlanSteps(target.concept, supportingConcepts, problems),
    successCriteria: buildSuccessCriteria(target.concept)
  };
}

function buildLearningPlanFromStudentModel(studentModel: StudentModel, problems: Problem[]): LearningPlan {
  const candidates = Object.values(studentModel.conceptStates)
    .map((state) => ({
      concept: state.concept,
      mastery: state.mastery,
      weakCount: state.wrongStreak,
      wrongCount: state.attempts - state.correct,
      stability: state.stability,
      recentAccuracy: state.recentAccuracy,
      averageConfidence: state.averageConfidence,
      averageResponseTimeSeconds: state.averageResponseTimeSeconds,
      reviewDue: state.reviewDueAt <= new Date().toISOString(),
      score: scoreStudentConcept(state)
    }))
    .sort((a, b) => b.score - a.score);
  const target =
    candidates.find((candidate) => candidate.mastery < 0.68 || candidate.stability < 0.6 || candidate.reviewDue) ??
    candidates.find((candidate) => candidate.averageConfidence > 0 && candidate.averageConfidence < 3) ??
    candidates[0];

  if (!target) {
    return {
      version: 1,
      status: "empty",
      mode: "balanced",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: [],
      steps: [],
      successCriteria: ["Complete at least one short adaptive practice session."]
    };
  }

  const chapter = selectChapterForConcept(target.concept, problems);
  const href = chapter
    ? `/practice?course=${encodeURIComponent(chapter.course)}&theme=${encodeURIComponent(chapter.theme)}&chapter=${encodeURIComponent(chapter.chapter)}`
    : `/practice`;
  const supportingConcepts = candidates
    .filter((candidate) => candidate.concept !== target.concept)
    .slice(0, 3)
    .map((candidate) => candidate.concept);

  return {
    version: 1,
    status: "ready",
    mode: inferPlanMode(target.concept, target.mastery, target.wrongCount, target.weakCount, target.stability),
    title: `Practice ${humanizeConcept(target.concept)}`,
    reason: buildStudentModelReason(target, chapter?.chapterTitle),
    targetConcept: target.concept,
    targetMastery: target.mastery,
    course: chapter?.course,
    theme: chapter?.theme,
    chapter: chapter?.chapter,
    chapterTitle: chapter?.chapterTitle,
    href,
    supportingConcepts,
    steps: buildPlanSteps(target.concept, supportingConcepts, problems, target.reviewDue),
    successCriteria: buildSuccessCriteria(target.concept, target.stability)
  };
}

function buildPlanSteps(
  targetConcept: string,
  supportingConcepts: string[],
  problems: Problem[],
  reviewDue = false
): LearningPlanStep[] {
  const targets = [targetConcept, ...supportingConcepts].filter(Boolean);
  const repairConcept = targets[0];
  const bridgeConcept = targets[1] ?? targetConcept;
  const challengeConcept = targets[2] ?? targetConcept;

  return [
    buildPlanStep({
      id: "repair-foundation",
      concept: repairConcept,
      problems,
      priority: reviewDue ? "review" : "repair",
      stage: inferStageForConcept(repairConcept),
      sessionLength: 6,
      title: reviewDue ? `Review ${humanizeConcept(repairConcept)}` : `Repair ${humanizeConcept(repairConcept)}`,
      reason: reviewDue
        ? "This concept is due for spaced review before adding new difficulty."
        : "Start with the clearest current constraint before moving forward."
    }),
    buildPlanStep({
      id: "bridge-practice",
      concept: bridgeConcept,
      problems,
      priority: "practice",
      stage: inferStageForConcept(bridgeConcept),
      sessionLength: 8,
      title: `Stabilize ${humanizeConcept(bridgeConcept)}`,
      reason: "Use a short mixed set to confirm the repair transfers into adjacent skills."
    }),
    buildPlanStep({
      id: "transfer-challenge",
      concept: challengeConcept,
      problems,
      priority: "challenge",
      stage: "AMC8 Transfer",
      sessionLength: 10,
      title: `Transfer through AMC8 problems`,
      reason: "Finish by checking whether the concept survives non-routine AMC8-style wording."
    })
  ];
}

function buildPlanStep(input: {
  id: string;
  concept: string;
  problems: Problem[];
  priority: LearningPlanStep["priority"];
  stage: LearningPlanStep["stage"];
  sessionLength: number;
  title: string;
  reason: string;
}): LearningPlanStep {
  const chapter = selectChapterForConcept(input.concept, input.problems);
  const params = new URLSearchParams({
    mode: "plan",
    concepts: input.concept,
    maxItems: String(input.sessionLength),
    autoGradableOnly: "true"
  });

  if (chapter) {
    params.set("course", chapter.course);
    params.set("chapter", chapter.chapter);
  }

  return {
    id: input.id,
    title: input.title,
    reason: input.reason,
    href: `/practice?${params.toString()}`,
    targetConcepts: [input.concept],
    stage: input.stage,
    sessionLength: input.sessionLength,
    priority: input.priority
  };
}

function selectChapterForConcept(concept: string, problems: Problem[]) {
  const matchingProblems = problems.filter((problem) => problem.concepts.includes(concept));
  if (matchingProblems.length === 0) return undefined;

  const groups = new Map<string, { problem: Problem; count: number; autoGradable: number; sequence: number }>();

  matchingProblems.forEach((problem) => {
    const key = problem.curriculum.chapter;
    const current = groups.get(key);

    groups.set(key, {
      problem,
      count: (current?.count ?? 0) + 1,
      autoGradable: (current?.autoGradable ?? 0) + (problem.isAutoGradable ? 1 : 0),
      sequence: problem.curriculum.sequence
    });
  });

  const selected = [...groups.values()].sort((a, b) => {
    const aMixed = a.problem.curriculum.chapter.includes("mixed") ? 1 : 0;
    const bMixed = b.problem.curriculum.chapter.includes("mixed") ? 1 : 0;

    return aMixed - bMixed || b.autoGradable - a.autoGradable || b.count - a.count || a.sequence - b.sequence;
  })[0];

  if (!selected) return undefined;

  return selected.problem.curriculum;
}

function countWeakConcepts(logs: SimulationLog[]) {
  const counts: Record<string, number> = {};

  logs.forEach((log) => {
    log.weakConcepts.forEach((concept) => {
      counts[concept] = (counts[concept] ?? 0) + 1;
    });
  });

  return counts;
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

function buildReason(
  target: { concept: string; mastery: number; weakCount: number; wrongCount: number },
  chapterTitle: string | undefined
) {
  const masteryText = `${Math.round(target.mastery * 100)}% mastery`;
  const signals = [
    target.wrongCount > 0 ? `${target.wrongCount} wrong attempt(s)` : "",
    target.weakCount > 0 ? `${target.weakCount} weak signal(s)` : ""
  ].filter(Boolean);
  const chapterText = chapterTitle ? ` The best next range is ${chapterTitle}.` : "";

  return `${humanizeConcept(target.concept)} is the strongest current focus: ${masteryText}${
    signals.length ? ` with ${signals.join(" and ")}` : ""
  }.${chapterText}`;
}

function buildStudentModelReason(
  target: {
    concept: string;
    mastery: number;
    stability: number;
    recentAccuracy: number;
    averageConfidence: number;
    averageResponseTimeSeconds: number;
    wrongCount: number;
    reviewDue: boolean;
  },
  chapterTitle: string | undefined
) {
  const signals = [
    `${Math.round(target.mastery * 100)}% mastery`,
    `${Math.round(target.stability * 100)}% stability`,
    `${Math.round(target.recentAccuracy * 100)}% recent accuracy`,
    target.averageConfidence > 0 ? `${Math.round(target.averageConfidence * 10) / 10}/5 confidence` : "",
    target.averageResponseTimeSeconds > 0 ? `${Math.round(target.averageResponseTimeSeconds)}s average response` : "",
    target.reviewDue ? "review is due" : "",
    target.wrongCount > 0 ? `${target.wrongCount} wrong attempt(s)` : ""
  ].filter(Boolean);
  const chapterText = chapterTitle ? ` The best next range is ${chapterTitle}.` : "";

  return `${humanizeConcept(target.concept)} is the strongest current focus based on the student model: ${signals.join(
    ", "
  )}.${chapterText}`;
}

function scoreStudentConcept(state: ConceptState) {
  const reviewDueBoost = state.reviewDueAt <= new Date().toISOString() ? 0.55 : 0;
  const confidenceBoost = state.averageConfidence > 0 ? Math.max(0, (3 - state.averageConfidence) / 3) * 0.45 : 0;
  const responseTimeBoost = state.averageResponseTimeSeconds >= 120 ? 0.28 : 0;
  return (
    (1 - state.mastery) * 1.3 +
    (1 - state.stability) * 1.1 +
    (1 - state.recentAccuracy) * 0.8 +
    state.wrongStreak * 0.3 +
    reviewDueBoost +
    confidenceBoost +
    responseTimeBoost
  );
}

function inferPlanMode(
  concept: string,
  mastery: number,
  wrongCount: number,
  weakCount: number,
  stability = 0.6
): LearningPlan["mode"] {
  if (mastery < 0.55 || wrongCount > 0 || weakCount > 0 || stability < 0.5) return "repair";
  if (concept.startsWith("arith_") || concept.startsWith("prealg_")) return "bridge";
  if (concept.startsWith("alg_")) return "advance";
  if (concept.startsWith("geo_") || concept.startsWith("nt_") || concept.startsWith("counting_") || concept.startsWith("stats_")) return "transfer";
  return "balanced";
}

function inferStageForConcept(concept: string): LearningPlanStep["stage"] {
  if (concept.startsWith("arith_")) return "Foundation";
  if (concept.startsWith("prealg_")) return "Bridge";
  if (concept.startsWith("alg_")) return "Algebra Readiness";
  return "AMC8 Transfer";
}

function buildSuccessCriteria(concept: string, stability = 0.6) {
  return [
    `Reach at least 70% accuracy on ${concept}.`,
    stability < 0.6 ? "Repeat the concept after a short delay to improve stability." : "Maintain stable performance in a mixed set.",
    "Complete one AMC8 Transfer item without triggering a prerequisite gap."
  ];
}

function humanizeConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
