import type { Problem } from "../../../../packages/adaptive-engine";
import type { StudentModel } from "./studentModel";

export type ReviewQueue = {
  dueConcepts: string[];
  problemIds: string[];
  problemCount: number;
  href: string;
  reason: string;
};

export function buildReviewQueue(model: StudentModel | null, problems: Problem[]): ReviewQueue {
  if (!model) {
    return {
      dueConcepts: [],
      problemIds: [],
      problemCount: 0,
      href: "/diagnostic",
      reason: "Complete a diagnostic or practice session to create a review queue."
    };
  }

  const now = new Date().toISOString();
  const dueConcepts = Object.values(model.conceptStates)
    .filter((state) => state.reviewDueAt <= now || state.stability < 0.5 || state.wrongStreak > 0)
    .sort((a, b) => {
      const aScore = reviewPriority(a.reviewDueAt <= now, a.stability, a.wrongStreak);
      const bScore = reviewPriority(b.reviewDueAt <= now, b.stability, b.wrongStreak);
      return bScore - aScore;
    })
    .slice(0, 6)
    .map((state) => state.concept);
  const pool = selectReviewProblems(dueConcepts, problems);
  const href =
    dueConcepts.length > 0
      ? `/practice?mode=review&concepts=${encodeURIComponent(dueConcepts.join(","))}`
      : "/practice";

  return {
    dueConcepts,
    problemIds: pool.map((problem) => problem.id),
    problemCount: pool.length,
    href,
    reason:
      dueConcepts.length > 0
        ? `Review ${dueConcepts.slice(0, 3).join(", ")} before moving further.`
        : "No review is due yet. Continue adaptive practice to build the queue."
  };
}

export function selectReviewProblems(concepts: string[], problems: Problem[]) {
  if (concepts.length === 0) return [];

  return problems
    .filter((problem) => problem.isAutoGradable && problem.concepts.some((concept) => concepts.includes(concept)))
    .sort((a, b) => {
      const aSpecificity = a.concepts.filter((concept) => concepts.includes(concept)).length;
      const bSpecificity = b.concepts.filter((concept) => concepts.includes(concept)).length;
      return bSpecificity - aSpecificity || a.difficulty - b.difficulty;
    })
    .slice(0, 12);
}

function reviewPriority(isDue: boolean, stability: number, wrongStreak: number) {
  return (isDue ? 1 : 0) + (1 - stability) + wrongStreak * 0.4;
}
