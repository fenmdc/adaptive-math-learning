import type { Problem } from "../../../../packages/adaptive-engine";
import type { SimulationLog } from "../dashboard/types";
import type { ConceptState, StudentModel } from "./studentModel";

export type LearningPlan = {
  status: "empty" | "ready";
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
      status: "empty",
      title: "Start with the diagnostic",
      reason: "A short diagnostic gives the system enough signal to recommend a focused first practice range.",
      href: "/diagnostic",
      supportingConcepts: []
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
      status: "empty",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: []
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
    status: "ready",
    title: `Practice ${humanizeConcept(target.concept)}`,
    reason: buildReason(target, chapter?.chapterTitle),
    targetConcept: target.concept,
    targetMastery: target.mastery,
    course: chapter?.course,
    theme: chapter?.theme,
    chapter: chapter?.chapter,
    chapterTitle: chapter?.chapterTitle,
    href,
    supportingConcepts
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
      status: "empty",
      title: "Continue adaptive practice",
      reason: "Complete a few more problems to generate a reliable learning plan.",
      href: "/practice",
      supportingConcepts: []
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
    status: "ready",
    title: `Practice ${humanizeConcept(target.concept)}`,
    reason: buildStudentModelReason(target, chapter?.chapterTitle),
    targetConcept: target.concept,
    targetMastery: target.mastery,
    course: chapter?.course,
    theme: chapter?.theme,
    chapter: chapter?.chapter,
    chapterTitle: chapter?.chapterTitle,
    href,
    supportingConcepts
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

function humanizeConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
