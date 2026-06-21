import type { Problem } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { ConceptState, StudentModel } from "./studentModel";

export type LearningPlan = {
  version: 2;
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
  todayTasks: LearningPlanTask[];
  weeklyFocus: LearningPlanTask[];
  checkpoint: LearningPlanCheckpoint;
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

export type LearningPlanTask = {
  id: string;
  title: string;
  reason: string;
  href: string;
  cadence: "today" | "this-week";
  estimateMinutes: number;
  kind: "diagnostic" | "practice" | "review" | "written-review" | "checkpoint";
};

export type LearningPlanCheckpoint = {
  title: string;
  reason: string;
  href: string;
  recommendedAfter: string;
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
      version: 2,
      status: "empty",
      mode: "diagnostic",
      title: "Start with the diagnostic",
      reason: "A short diagnostic gives the system enough signal to recommend a focused first practice range.",
      href: "/diagnostic",
      supportingConcepts: [],
      steps: [],
      todayTasks: [
        {
          id: "start-diagnostic",
          title: "Run the initial diagnostic",
          reason: "Create the first placement signal and learning path.",
          href: "/diagnostic",
          cadence: "today",
          estimateMinutes: 20,
          kind: "diagnostic"
        }
      ],
      weeklyFocus: [],
      checkpoint: {
        title: "Diagnostic baseline",
        reason: "Complete the first diagnostic before scheduling review or transfer work.",
        href: "/diagnostic",
        recommendedAfter: "today"
      },
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
      version: 2,
      status: "empty",
      mode: "balanced",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: [],
      steps: [],
      todayTasks: [
        {
          id: "continue-practice",
          title: "Continue adaptive practice",
          reason: "Collect a few more attempts so the system can choose a stable target.",
          href: "/practice",
          cadence: "today",
          estimateMinutes: 15,
          kind: "practice"
        }
      ],
      weeklyFocus: [],
      checkpoint: {
        title: "Generate a learning path",
        reason: "A short practice session will give the planner enough evidence.",
        href: "/practice",
        recommendedAfter: "after one mini session"
      },
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

  const steps = buildPlanSteps(target.concept, supportingConcepts, problems);

  return {
    version: 2,
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
    steps,
    todayTasks: buildTodayTasks(steps),
    weeklyFocus: buildWeeklyFocus(steps, target.concept),
    checkpoint: buildCheckpoint(target.concept, href, "after today's mini session"),
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
      version: 2,
      status: "empty",
      mode: "balanced",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: [],
      steps: [],
      todayTasks: [
        {
          id: "continue-practice",
          title: "Continue adaptive practice",
          reason: "Collect a few more attempts so the system can choose a stable target.",
          href: "/practice",
          cadence: "today",
          estimateMinutes: 15,
          kind: "practice"
        }
      ],
      weeklyFocus: [],
      checkpoint: {
        title: "Generate a learning path",
        reason: "A short practice session will give the planner enough evidence.",
        href: "/practice",
        recommendedAfter: "after one mini session"
      },
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

  const steps = buildPlanSteps(target.concept, supportingConcepts, problems, target.reviewDue);

  return {
    version: 2,
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
    steps,
    todayTasks: buildTodayTasks(steps),
    weeklyFocus: buildWeeklyFocus(steps, target.concept),
    checkpoint: buildCheckpoint(target.concept, href, target.reviewDue ? "after spaced review" : "after today's mini session"),
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

export function migrateLearningPlan(plan: Partial<LearningPlan> | null | undefined): LearningPlan | null {
  if (!plan) return null;

  const status = plan.status ?? "empty";
  const mode = plan.mode ?? "balanced";
  const title = plan.title ?? (status === "ready" ? "Continue adaptive practice" : "Start with the diagnostic");
  const reason = plan.reason ?? "Continue with a short bounded session so the system can refresh the learning path.";
  const href = plan.href ?? (mode === "diagnostic" ? "/diagnostic" : "/practice");
  const steps = plan.steps ?? [];
  const targetConcept = plan.targetConcept;

  return {
    version: 2,
    status,
    mode,
    title,
    reason,
    targetConcept,
    targetMastery: plan.targetMastery,
    course: plan.course,
    theme: plan.theme,
    chapter: plan.chapter,
    chapterTitle: plan.chapterTitle,
    href,
    supportingConcepts: plan.supportingConcepts ?? [],
    steps,
    todayTasks: plan.todayTasks ?? buildFallbackTasks("today", steps, href, title, reason),
    weeklyFocus: plan.weeklyFocus ?? buildFallbackTasks("this-week", steps.slice(1), href, targetConcept ? `Stabilize ${humanizeConcept(targetConcept)}` : "Stabilize current focus", reason),
    checkpoint: plan.checkpoint ?? {
      title: targetConcept ? `Retest ${humanizeConcept(targetConcept)}` : "Run a checkpoint",
      reason: "Use a bounded checkpoint to refresh the recommendation.",
      href,
      recommendedAfter: "after the next mini session"
    },
    successCriteria: plan.successCriteria ?? (targetConcept ? buildSuccessCriteria(targetConcept) : ["Complete one bounded practice session."])
  };
}

function buildFallbackTasks(
  cadence: LearningPlanTask["cadence"],
  steps: LearningPlanStep[],
  href: string,
  title: string,
  reason: string
): LearningPlanTask[] {
  if (steps.length > 0) {
    return steps.slice(0, cadence === "today" ? 2 : 3).map((step) => ({
      id: `${cadence}-${step.id}`,
      title: step.title,
      reason: step.reason,
      href: step.href,
      cadence,
      estimateMinutes: step.sessionLength <= 6 ? 12 : 20,
      kind: step.priority === "review" ? "review" : step.priority === "challenge" ? "checkpoint" : "practice"
    }));
  }

  return [
    {
      id: `${cadence}-continue`,
      title,
      reason,
      href,
      cadence,
      estimateMinutes: cadence === "today" ? 15 : 20,
      kind: href.startsWith("/diagnostic") ? "diagnostic" : "practice"
    }
  ];
}

function buildTodayTasks(steps: LearningPlanStep[]): LearningPlanTask[] {
  return steps.slice(0, 2).map((step, index) => ({
    id: `today-${step.id}`,
    title: step.title,
    reason: step.reason,
    href: step.href,
    cadence: "today",
    estimateMinutes: step.sessionLength <= 6 ? 12 : 18,
    kind: step.priority === "review" ? "review" : "practice"
  }));
}

function buildWeeklyFocus(steps: LearningPlanStep[], targetConcept: string): LearningPlanTask[] {
  const transferStep = steps.find((step) => step.priority === "challenge") ?? steps.at(-1);

  return [
    {
      id: "week-stabilize",
      title: `Stabilize ${humanizeConcept(targetConcept)}`,
      reason: "Repeat the target in a short mixed set after the first repair session.",
      href: steps[1]?.href ?? steps[0]?.href ?? "/practice",
      cadence: "this-week",
      estimateMinutes: 20,
      kind: "practice"
    },
    {
      id: "week-transfer",
      title: transferStep?.title ?? "Try a transfer set",
      reason: transferStep?.reason ?? "Check whether the repair survives a broader problem range.",
      href: transferStep?.href ?? "/practice",
      cadence: "this-week",
      estimateMinutes: 25,
      kind: "checkpoint"
    }
  ];
}

function buildCheckpoint(targetConcept: string, href: string, recommendedAfter: string): LearningPlanCheckpoint {
  return {
    title: `Retest ${humanizeConcept(targetConcept)}`,
    reason: "Use a bounded checkpoint instead of looping indefinitely on the same problem type.",
    href,
    recommendedAfter
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
