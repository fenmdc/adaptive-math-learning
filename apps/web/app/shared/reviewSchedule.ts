import type { Problem } from "../../../../packages/adaptive-engine";
import type { StudentModel } from "./studentModel";
import type { SubjectiveReviewItem } from "./storage";

export type ReviewScheduleItem = {
  id: string;
  title: string;
  reason: string;
  href: string;
  dueAt: string;
  daysUntil: number;
  kind: "concept-review" | "written-review" | "checkpoint";
  status: "due" | "today" | "upcoming" | "later";
  concepts: string[];
  estimateMinutes: number;
};

export type ReviewScheduleDay = {
  date: string;
  label: string;
  items: ReviewScheduleItem[];
};

export type ReviewSchedule = {
  generatedAt: string;
  dueTodayCount: number;
  upcomingCount: number;
  pendingWrittenReviews: number;
  reviewedWrittenFollowUps: number;
  nextHref: string;
  nextTitle: string;
  days: ReviewScheduleDay[];
  items: ReviewScheduleItem[];
};

export function buildReviewSchedule(
  model: StudentModel | null,
  subjectiveReviews: SubjectiveReviewItem[],
  problems: Problem[],
  options: { horizonDays?: number; now?: Date } = {}
): ReviewSchedule {
  const now = options.now ?? new Date();
  const horizonDays = options.horizonDays ?? 7;
  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));
  const conceptItems = buildConceptReviewItems(model, now);
  const writtenItems = buildWrittenReviewItems(subjectiveReviews, problemMap, now);
  const items = [...conceptItems, ...writtenItems]
    .filter((item) => item.daysUntil <= horizonDays || item.status === "due" || item.status === "today")
    .sort((left, right) => {
      if (left.daysUntil !== right.daysUntil) return left.daysUntil - right.daysUntil;
      return priority(left) - priority(right);
    });
  const days = buildScheduleDays(items, now, horizonDays);
  const next = items[0];

  return {
    generatedAt: now.toISOString(),
    dueTodayCount: items.filter((item) => item.status === "due" || item.status === "today").length,
    upcomingCount: items.filter((item) => item.status === "upcoming").length,
    pendingWrittenReviews: subjectiveReviews.filter((item) => item.status !== "reviewed").length,
    reviewedWrittenFollowUps: writtenItems.filter((item) => item.kind === "written-review" && item.status !== "later").length,
    nextHref: next?.href ?? "/practice",
    nextTitle: next?.title ?? "Continue adaptive practice",
    days,
    items
  };
}

function buildConceptReviewItems(model: StudentModel | null, now: Date): ReviewScheduleItem[] {
  if (!model) return [];

  return Object.values(model.conceptStates)
    .filter((state) => state.reviewDueAt || state.stability < 0.55 || state.wrongStreak > 0)
    .map((state) => {
      const dueAt = state.reviewDueAt || now.toISOString();
      const daysUntil = daysBetween(now, new Date(dueAt));
      const concepts = [state.concept];
      const params = new URLSearchParams({
        autoGradableOnly: "true",
        concepts: concepts.join(","),
        maxItems: state.wrongStreak > 0 || state.stability < 0.45 ? "8" : "6",
        mode: "review",
        sessionSource: "review-schedule",
        sessionTitle: `Review ${formatConcept(state.concept)}`,
        sessionGoal: buildConceptReason(state)
      });

      return {
        id: `concept-${state.concept}`,
        title: `Review ${formatConcept(state.concept)}`,
        reason: buildConceptReason(state),
        href: `/practice?${params.toString()}`,
        dueAt,
        daysUntil,
        kind: "concept-review" as const,
        status: statusFromDays(daysUntil),
        concepts,
        estimateMinutes: state.wrongStreak > 0 ? 18 : 12
      };
    })
    .filter((item) => item.status !== "later" || item.daysUntil <= 7);
}

function buildWrittenReviewItems(
  items: SubjectiveReviewItem[],
  problemMap: Map<string, Problem>,
  now: Date
): ReviewScheduleItem[] {
  return items
    .map((item) => {
      const problem = problemMap.get(item.problem);
      const concepts = item.concepts.length ? item.concepts : problem?.concepts.slice(0, 1) ?? [];

      if (item.status !== "reviewed") {
        return {
          id: `written-pending-${item.id}`,
          title: "Review written work",
          reason: "A submitted written solution is waiting for rubric feedback before the model can use it.",
          href: "/review",
          dueAt: item.createdAt,
          daysUntil: daysBetween(now, new Date(item.createdAt)),
          kind: "written-review" as const,
          status: "due" as const,
          concepts,
          estimateMinutes: 10
        };
      }

      const reviewedAt = item.review?.reviewedAt ?? item.createdAt;
      const scorePercent = normalizeScorePercent(item);
      const dueAt = addDays(reviewedAt, scorePercent >= 85 ? 7 : scorePercent >= 70 ? 3 : 1);
      const daysUntil = daysBetween(now, new Date(dueAt));
      const targetConcept = concepts[0] ?? item.problem;
      const params = new URLSearchParams({
        autoGradableOnly: "true",
        concepts: targetConcept,
        maxItems: scorePercent >= 85 ? "6" : "8",
        mode: "plan",
        sessionSource: "review-schedule",
        sessionTitle: `Follow up ${formatConcept(targetConcept)}`,
        sessionGoal: item.review?.modelRecommendation || item.review?.feedback || "Use reviewed written work to guide the next repair set."
      });

      if (problem?.curriculum.course) params.set("course", problem.curriculum.course);
      if (problem?.locale?.language) params.set("language", problem.locale.language);
      if (problem?.locale?.curriculumSystem) params.set("curriculumSystem", problem.locale.curriculumSystem);
      if (problem?.locale?.displayTrack) params.set("track", problem.locale.displayTrack);

      return {
        id: `written-reviewed-${item.id}`,
        title: `Follow up ${formatConcept(targetConcept)}`,
        reason: item.review?.modelRecommendation || item.review?.feedback || "Reviewed written work created a follow-up practice signal.",
        href: `/practice?${params.toString()}`,
        dueAt,
        daysUntil,
        kind: "written-review" as const,
        status: statusFromDays(daysUntil),
        concepts,
        estimateMinutes: scorePercent >= 85 ? 12 : 18
      };
    });
}

function buildScheduleDays(items: ReviewScheduleItem[], now: Date, horizonDays: number): ReviewScheduleDay[] {
  return Array.from({ length: horizonDays + 1 }, (_, index) => {
    const date = startOfDay(addDays(now.toISOString(), index));
    const dateKey = date.toISOString().slice(0, 10);
    return {
      date: dateKey,
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      items: items.filter((item) => startOfDay(item.dueAt).toISOString().slice(0, 10) === dateKey)
    };
  }).filter((day) => day.items.length > 0);
}

function buildConceptReason(state: StudentModel["conceptStates"][string]) {
  const signals = [
    `${Math.round(state.mastery * 100)}% mastery`,
    `${Math.round(state.stability * 100)}% stability`,
    state.wrongStreak > 0 ? `${state.wrongStreak} wrong streak` : "",
    state.averageConfidence > 0 ? `${Math.round(state.averageConfidence * 10) / 10}/5 confidence` : ""
  ].filter(Boolean);

  return `Spaced review is scheduled from ${signals.join(", ")}.`;
}

function normalizeScorePercent(item: SubjectiveReviewItem) {
  if (typeof item.review?.scorePercent === "number") return clamp(Math.round(item.review.scorePercent), 0, 100);
  const rubricMax =
    item.review?.rubricScores?.reduce((sum, row) => sum + row.maxScore, 0) ??
    item.responseSchema?.rubric.reduce((sum, row) => sum + row.maxScore, 0) ??
    8;
  return rubricMax > 0 ? clamp(Math.round(((item.review?.score ?? 0) / rubricMax) * 100), 0, 100) : 0;
}

function statusFromDays(daysUntil: number): ReviewScheduleItem["status"] {
  if (daysUntil < 0) return "due";
  if (daysUntil === 0) return "today";
  if (daysUntil <= 7) return "upcoming";
  return "later";
}

function priority(item: ReviewScheduleItem) {
  if (item.status === "due") return 0;
  if (item.status === "today") return 1;
  if (item.kind === "written-review") return 2;
  return 3;
}

function daysBetween(now: Date, due: Date) {
  const nowStart = startOfDay(now);
  const dueStart = startOfDay(due);
  return Math.floor((dueStart.getTime() - nowStart.getTime()) / 86_400_000);
}

function startOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
