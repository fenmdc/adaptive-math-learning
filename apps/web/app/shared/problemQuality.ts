import type { AnswerChoice, Problem } from "../../../../packages/adaptive-engine";
import { buildExplanationReviewQueue, summarizeExplanationQuality, type ExampleExplanation } from "./explanationQuality";

export type ProblemQualityAudit = {
  totalProblems: number;
  autoGradable: number;
  multipleChoice: number;
  answerReadyMultipleChoice: number;
  fullDistractorCoverage: number;
  withAssets: number;
  remoteAssets: number;
  conceptCount: number;
  thinConcepts: Array<{ concept: string; count: number; href: string }>;
  chapterCount: number;
  thinChapters: Array<{
    chapter: string;
    chapterTitle: string;
    course: string;
    count: number;
    href: string;
    sourceCollection: string;
  }>;
  sourceCollections: Array<{ key: string; count: number }>;
  courses: Array<{ key: string; count: number }>;
  stages: Array<{ key: string; count: number }>;
  layers: Array<{ key: string; count: number }>;
  explanationQuality: ReturnType<typeof summarizeExplanationQuality>;
  explanationReviewQueue: ReturnType<typeof buildExplanationReviewQueue>;
  readinessScore: number;
  nextQualityMoves: Array<{
    href: string;
    label: string;
    priority: "high" | "medium" | "low";
    reason: string;
    title: string;
  }>;
};

const MIN_CONCEPT_COVERAGE = 5;
const MIN_CHAPTER_COVERAGE = 20;

export function buildProblemQualityAudit(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
): ProblemQualityAudit {
  const multipleChoiceProblems = problems.filter((problem) => problem.answerType === "multiple_choice");
  const explanationQuality = summarizeExplanationQuality(problems, explanations);
  const explanationReviewQueue = buildExplanationReviewQueue(problems, explanations);
  const thinConcepts = buildThinConcepts(problems);
  const thinChapters = buildThinChapters(problems);
  const remoteAssets = countRemoteAssets(problems);
  const fullDistractorCoverage = multipleChoiceProblems.filter(hasFullDistractorCoverage).length;
  const answerReadyMultipleChoice = multipleChoiceProblems.filter(hasCorrectChoice).length;
  const readinessScore = scoreReadiness({
    problems,
    explanationQuality,
    fullDistractorCoverage,
    multipleChoiceProblems,
    remoteAssets,
    thinChapters,
    thinConcepts
  });

  return {
    totalProblems: problems.length,
    autoGradable: problems.filter((problem) => problem.isAutoGradable).length,
    multipleChoice: multipleChoiceProblems.length,
    answerReadyMultipleChoice,
    fullDistractorCoverage,
    withAssets: problems.filter((problem) => (problem.assets ?? []).length > 0).length,
    remoteAssets,
    conceptCount: new Set(problems.flatMap((problem) => problem.concepts)).size,
    thinConcepts,
    chapterCount: new Set(problems.map((problem) => chapterKey(problem))).size,
    thinChapters,
    sourceCollections: countBy(problems, (problem) => problem.curriculum.sourceCollection),
    courses: countBy(problems, (problem) => problem.curriculum.course),
    stages: countBy(problems, (problem) => problem.taxonomy?.stage ?? "Unlabeled"),
    layers: countBy(problems, (problem) => problem.taxonomy?.layer ?? "Unlabeled"),
    explanationQuality,
    explanationReviewQueue,
    readinessScore,
    nextQualityMoves: buildNextQualityMoves(thinConcepts, thinChapters, explanationReviewQueue, remoteAssets)
  };
}

export function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function buildThinConcepts(problems: Problem[]) {
  const counts = new Map<string, number>();

  problems.forEach((problem) => {
    problem.concepts.forEach((concept) => counts.set(concept, (counts.get(concept) ?? 0) + 1));
  });

  return [...counts.entries()]
    .filter(([, count]) => count < MIN_CONCEPT_COVERAGE)
    .map(([concept, count]) => ({
      concept,
      count,
      href: `/practice?mode=plan&concepts=${encodeURIComponent(concept)}&maxItems=8&autoGradableOnly=true`
    }))
    .sort((a, b) => a.count - b.count || a.concept.localeCompare(b.concept));
}

function buildThinChapters(problems: Problem[]) {
  const groups = new Map<string, { count: number; problem: Problem }>();

  problems.forEach((problem) => {
    const key = chapterKey(problem);
    const current = groups.get(key);
    groups.set(key, {
      count: (current?.count ?? 0) + 1,
      problem
    });
  });

  return [...groups.values()]
    .filter((item) => item.count < MIN_CHAPTER_COVERAGE)
    .map((item) => ({
      chapter: item.problem.curriculum.chapter,
      chapterTitle: item.problem.curriculum.chapterTitle,
      course: item.problem.curriculum.course,
      count: item.count,
      href: `/practice?course=${encodeURIComponent(item.problem.curriculum.course)}&chapter=${encodeURIComponent(item.problem.curriculum.chapter)}&autoGradableOnly=true`,
      sourceCollection: item.problem.curriculum.sourceCollection
    }))
    .sort((a, b) => a.count - b.count || a.course.localeCompare(b.course) || a.chapterTitle.localeCompare(b.chapterTitle));
}

function buildNextQualityMoves(
  thinConcepts: ProblemQualityAudit["thinConcepts"],
  thinChapters: ProblemQualityAudit["thinChapters"],
  explanationReviewQueue: ProblemQualityAudit["explanationReviewQueue"],
  remoteAssets: number
) {
  const moves: ProblemQualityAudit["nextQualityMoves"] = [];
  const topBatch = explanationReviewQueue.batches[0];
  const topChapter = thinChapters[0];
  const topConcept = thinConcepts[0];

  if (topBatch) {
    moves.push({
      href: topBatch.href,
      label: `${topBatch.count} item(s)`,
      priority: "high",
      title: `Upgrade ${topBatch.chapterTitle}`,
      reason: `Average explanation quality is ${topBatch.averageScore}/100; most common issue: ${topBatch.topIssues[0]?.issue ?? "partial explanations"}.`
    });
  }

  if (topChapter) {
    moves.push({
      href: topChapter.href,
      label: `${topChapter.count}/${MIN_CHAPTER_COVERAGE}`,
      priority: topChapter.count < 8 ? "high" : "medium",
      title: `Backfill ${topChapter.chapterTitle}`,
      reason: `${topChapter.course} chapter coverage is below the ${MIN_CHAPTER_COVERAGE}-problem floor.`
    });
  }

  if (topConcept) {
    moves.push({
      href: topConcept.href,
      label: `${topConcept.count}/${MIN_CONCEPT_COVERAGE}`,
      priority: topConcept.count <= 2 ? "high" : "medium",
      title: `Add coverage for ${formatLabel(topConcept.concept)}`,
      reason: "Concept-level graph coverage is too thin for reliable adaptive routing."
    });
  }

  if (remoteAssets > 0) {
    moves.push({
      href: "/dashboard",
      label: `${remoteAssets} asset(s)`,
      priority: "medium",
      title: "Localize remaining remote assets",
      reason: "Offline/PWA reliability requires all problem images to be local."
    });
  }

  return moves.slice(0, 4);
}

function scoreReadiness({
  explanationQuality,
  fullDistractorCoverage,
  multipleChoiceProblems,
  problems,
  remoteAssets,
  thinChapters,
  thinConcepts
}: {
  explanationQuality: ReturnType<typeof summarizeExplanationQuality>;
  fullDistractorCoverage: number;
  multipleChoiceProblems: Problem[];
  problems: Problem[];
  remoteAssets: number;
  thinChapters: ProblemQualityAudit["thinChapters"];
  thinConcepts: ProblemQualityAudit["thinConcepts"];
}) {
  const autoGradableRate = percent(problems.filter((problem) => problem.isAutoGradable).length, problems.length);
  const distractorRate = percent(fullDistractorCoverage, multipleChoiceProblems.length);
  const explanationScore = explanationQuality.averageScore;
  const chapterPenalty = Math.min(18, thinChapters.length * 1.2);
  const conceptPenalty = Math.min(10, thinConcepts.length * 2);
  const assetPenalty = remoteAssets > 0 ? 8 : 0;
  const base = Math.round(autoGradableRate * 0.22 + distractorRate * 0.24 + explanationScore * 0.34 + 20);

  return Math.max(0, Math.min(100, Math.round(base - chapterPenalty - conceptPenalty - assetPenalty)));
}

function countRemoteAssets(problems: Problem[]) {
  return problems.reduce(
    (sum, problem) => sum + (problem.assets ?? []).filter((asset) => /^https?:\/\//i.test(asset.url)).length,
    0
  );
}

function hasCorrectChoice(problem: Problem) {
  return normalizeChoices(problem.choices).some((choice) => normalize(choice.value) === normalize(problem.answer));
}

function hasFullDistractorCoverage(problem: Problem) {
  const choices = normalizeChoices(problem.choices);
  const wrongChoices = choices.filter((choice) => normalize(choice.value) !== normalize(problem.answer));
  const distractors = problem.distractors ?? [];

  return wrongChoices.every((choice) =>
    choice.distractorId
      ? distractors.some((distractor) => distractor.id === choice.distractorId)
      : distractors.some((distractor) => distractor.choiceLabel === choice.label)
  );
}

function normalizeChoices(choices: Problem["choices"]): AnswerChoice[] {
  return (choices ?? []).map((choice, index) => {
    if (typeof choice === "string") {
      return {
        label: String.fromCharCode(65 + index),
        value: choice,
        text: choice
      };
    }

    return choice;
  });
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = getKey(item) || "Unlabeled";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function chapterKey(problem: Problem) {
  return `${problem.curriculum.course}::${problem.curriculum.chapter}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function formatLabel(value: string) {
  return value
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
