import type { Problem } from "../../../../packages/adaptive-engine";
import type { SubjectiveReviewItem } from "./storage";

export type ReviewedSubjectiveFeedback = {
  id: string;
  abilityTags: string[];
  concepts: string[];
  feedback: string;
  href: string;
  mode: string;
  nextAction: string;
  problem: string;
  problemTitle: string;
  reviewedAt: string;
  scoreLabel: string;
  scorePercent: number;
  source: SubjectiveReviewItem["source"];
};

export function buildReviewedSubjectiveFeedback(
  items: SubjectiveReviewItem[],
  problems: Problem[],
  options: { limit?: number } = {}
) {
  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));
  const limit = options.limit ?? 3;

  return items
    .filter((item) => item.status === "reviewed" && item.review)
    .sort((left, right) => (right.review?.reviewedAt ?? "").localeCompare(left.review?.reviewedAt ?? ""))
    .slice(0, limit)
    .map((item) => {
      const problem = problemMap.get(item.problem);
      const scorePercent = normalizeScorePercent(item);
      const targetConcept = item.concepts[0] ?? problem?.primaryConcept ?? "";
      const abilityTags = Object.entries(item.review?.abilitySignals ?? {})
        .sort((left, right) => (left[1] ?? 0) - (right[1] ?? 0))
        .slice(0, 3)
        .map(([dimension, score]) => `${formatDimension(dimension)} ${Math.round((score ?? 0) * 100)}%`);
      const nextAction = item.review?.modelRecommendation || buildFallbackNextAction(item, targetConcept, scorePercent);

      return {
        id: item.id,
        abilityTags,
        concepts: item.concepts,
        feedback: item.review?.feedback ?? "Reviewed.",
        href: buildRepairHref(problem, item, targetConcept),
        mode: item.responseSchema?.mode ?? "constructed_response",
        nextAction,
        problem: item.problem,
        problemTitle: problem?.curriculum.chapterTitle ?? item.problem,
        reviewedAt: item.review?.reviewedAt ?? item.createdAt,
        scoreLabel: `${item.review?.score ?? 0}/${rubricMaxScore(item)} · ${scorePercent}%`,
        scorePercent,
        source: item.source
      } satisfies ReviewedSubjectiveFeedback;
    });
}

export function countPendingSubjectiveReviews(items: SubjectiveReviewItem[]) {
  return items.filter((item) => item.status !== "reviewed").length;
}

function buildFallbackNextAction(item: SubjectiveReviewItem, targetConcept: string, scorePercent: number) {
  const focus = weakestRubricLabel(item) ?? "the first incomplete step";
  const concept = targetConcept ? ` on ${formatConcept(targetConcept)}` : "";

  if (scorePercent >= 85) return `Strong written work. Try a transfer problem${concept}.`;
  if (scorePercent >= 70) return `Solid solution. Repair ${focus}${concept}, then continue.`;
  return `Rework ${focus}${concept} before moving to harder problems.`;
}

function buildRepairHref(problem: Problem | undefined, item: SubjectiveReviewItem, targetConcept: string) {
  const params = new URLSearchParams({
    autoGradableOnly: "true",
    maxItems: "8",
    mode: "plan",
    sessionSource: "subjective-review",
    sessionTitle: `Repair ${formatConcept(targetConcept || item.problem)}`,
    sessionGoal: item.review?.modelRecommendation || item.review?.feedback || "Use reviewed written work to guide the next practice set."
  });

  if (targetConcept) params.set("concepts", targetConcept);
  if (problem?.curriculum.course) params.set("course", problem.curriculum.course);
  if (problem?.locale?.language) params.set("language", problem.locale.language);
  if (problem?.locale?.curriculumSystem) params.set("curriculumSystem", problem.locale.curriculumSystem);
  if (problem?.locale?.displayTrack) params.set("track", problem.locale.displayTrack);

  return `/practice?${params.toString()}`;
}

function normalizeScorePercent(item: SubjectiveReviewItem) {
  if (typeof item.review?.scorePercent === "number") return clamp(Math.round(item.review.scorePercent), 0, 100);

  const maxScore = rubricMaxScore(item);
  if (maxScore <= 0) return 0;

  return clamp(Math.round(((item.review?.score ?? 0) / maxScore) * 100), 0, 100);
}

function rubricMaxScore(item: SubjectiveReviewItem) {
  const rubricScoreMax = item.review?.rubricScores?.reduce((sum, row) => sum + row.maxScore, 0);
  if (rubricScoreMax) return rubricScoreMax;

  return item.responseSchema?.rubric.reduce((sum, row) => sum + row.maxScore, 0) ?? 8;
}

function weakestRubricLabel(item: SubjectiveReviewItem) {
  return item.review?.rubricScores
    ?.filter((row) => row.maxScore > 0)
    .sort((left, right) => left.score / left.maxScore - right.score / right.maxScore)[0]?.label;
}

function formatDimension(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatConcept(value: string) {
  return value
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
