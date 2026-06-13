import type { Problem } from "../../../../packages/adaptive-engine";

export type ExampleExplanation = {
  hint1?: string;
  hint2?: string;
  stepByStep?: string;
  commonMistake?: string;
  whyCorrect?: string;
  variantIdea?: string;
};

export type ExplanationQualityLevel = "complete" | "partial" | "weak" | "missing";

export type ExplanationQuality = {
  level: ExplanationQualityLevel;
  score: number;
  availableSections: string[];
  missingSections: string[];
  issues: string[];
  learnerLabel: string;
  reviewerLabel: string;
};

export type ExplanationReviewItem = {
  id: string;
  href: string;
  statement: string;
  answer: string;
  sourceCollection: string;
  course: string;
  chapter: string;
  chapterTitle: string;
  problemType: string;
  layer: string;
  stage: string;
  cognitiveTags: string[];
  quality: ExplanationQuality;
};

export type ExplanationReviewBatch = {
  id: string;
  title: string;
  sourceCollection: string;
  course: string;
  chapter: string;
  chapterTitle: string;
  problemType: string;
  layer: string;
  stage: string;
  count: number;
  averageScore: number;
  priorityScore: number;
  topIssues: Array<{ issue: string; count: number }>;
  items: ExplanationReviewItem[];
  href: string;
};

export type ExplanationReviewQueue = {
  totalReviewItems: number;
  partialCount: number;
  weakCount: number;
  missingCount: number;
  averageScore: number;
  batches: ExplanationReviewBatch[];
};

const REQUIRED_SECTIONS: Array<keyof ExampleExplanation> = [
  "hint1",
  "hint2",
  "stepByStep",
  "commonMistake",
  "whyCorrect",
  "variantIdea"
];

const SECTION_LABELS: Record<keyof ExampleExplanation, string> = {
  hint1: "First hint",
  hint2: "Second hint",
  stepByStep: "Worked steps",
  commonMistake: "Common mistake",
  whyCorrect: "Why it works",
  variantIdea: "Try next"
};

const PLACEHOLDER_PATTERNS = [
  "compare it with the original amc8 answer key",
  "auto-created distractor placeholder",
  "try a nearby version by changing one number or condition",
  "matches the stored solution"
];

export function assessExplanationQuality(
  explanation: ExampleExplanation | undefined,
  problem?: Problem
): ExplanationQuality {
  if (!explanation) {
    return {
      level: "missing",
      score: 0,
      availableSections: [],
      missingSections: REQUIRED_SECTIONS.map((section) => SECTION_LABELS[section]),
      issues: ["No explanation template is linked to this problem."],
      learnerLabel: "No teaching notes yet",
      reviewerLabel: "Missing"
    };
  }

  const availableSections = REQUIRED_SECTIONS
    .filter((section) => hasUsefulText(explanation[section]))
    .map((section) => SECTION_LABELS[section]);
  const missingSections = REQUIRED_SECTIONS
    .filter((section) => !hasUsefulText(explanation[section]))
    .map((section) => SECTION_LABELS[section]);
  const issues = buildExplanationIssues(explanation, problem);
  const score = scoreExplanation(explanation, issues);
  const level = qualityLevel(score, missingSections.length, issues.length);

  return {
    level,
    score,
    availableSections,
    missingSections,
    issues,
    learnerLabel: learnerLabel(level),
    reviewerLabel: reviewerLabel(level)
  };
}

export function summarizeExplanationQuality(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
) {
  const rows = problems.map((problem) => ({
    problem,
    quality: assessExplanationQuality(explanations[problem.id], problem)
  }));
  const counts = countBy(rows, (row) => row.quality.level);
  const averageScore =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, row) => sum + row.quality.score, 0) / rows.length);
  const weakProblems = rows
    .filter((row) => row.quality.level === "missing" || row.quality.level === "weak")
    .slice(0, 8)
    .map((row) => ({
      id: row.problem.id,
      chapterTitle: row.problem.curriculum.chapterTitle,
      level: row.quality.level,
      issues: row.quality.issues.slice(0, 2)
    }));

  return {
    total: rows.length,
    averageScore,
    counts: {
      complete: counts.complete ?? 0,
      partial: counts.partial ?? 0,
      weak: counts.weak ?? 0,
      missing: counts.missing ?? 0
    },
    weakProblems
  };
}

export function buildExplanationReviewQueue(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
): ExplanationReviewQueue {
  const items = problems
    .map((problem) => ({
      id: problem.id,
      href: `/practice?problemId=${encodeURIComponent(problem.id)}`,
      statement: problem.statement,
      answer: problem.answer,
      sourceCollection: problem.curriculum.sourceCollection,
      course: problem.curriculum.course,
      chapter: problem.curriculum.chapter,
      chapterTitle: problem.curriculum.chapterTitle,
      problemType: problem.taxonomy?.problemType ?? "Unlabeled",
      layer: problem.taxonomy?.layer ?? "Unlabeled",
      stage: problem.taxonomy?.stage ?? "Unlabeled",
      cognitiveTags: problem.taxonomy?.cognitiveTags ?? [],
      quality: assessExplanationQuality(explanations[problem.id], problem)
    }))
    .filter((item) => item.quality.level !== "complete")
    .sort(compareReviewItems);
  const batches = [...groupReviewItems(items).values()]
    .map(toReviewBatch)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.count - a.count || a.title.localeCompare(b.title));
  const averageScore =
    items.length === 0
      ? 0
      : Math.round(items.reduce((sum, item) => sum + item.quality.score, 0) / items.length);

  return {
    totalReviewItems: items.length,
    partialCount: items.filter((item) => item.quality.level === "partial").length,
    weakCount: items.filter((item) => item.quality.level === "weak").length,
    missingCount: items.filter((item) => item.quality.level === "missing").length,
    averageScore,
    batches
  };
}

export function explanationQualityPercent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function groupReviewItems(items: ExplanationReviewItem[]) {
  const groups = new Map<string, ExplanationReviewItem[]>();

  items.forEach((item) => {
    const key = [
      item.sourceCollection,
      item.course,
      item.chapter,
      item.problemType,
      item.layer,
      item.stage
    ].join("::");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return groups;
}

function toReviewBatch(items: ExplanationReviewItem[]): ExplanationReviewBatch {
  const first = items[0];
  const topIssues = topIssueCounts(items);
  const averageScore = Math.round(items.reduce((sum, item) => sum + item.quality.score, 0) / items.length);
  const priorityScore =
    items.length * 8 +
    topIssues.length * 3 +
    items.filter((item) => item.quality.level === "missing").length * 28 +
    items.filter((item) => item.quality.level === "weak").length * 18 +
    items.filter((item) => item.stage === "AMC8 Transfer").length * 3 +
    items.filter((item) => item.layer === "Honors" || item.layer === "AMC8" || item.layer === "AMC8 Stretch").length * 2 +
    Math.max(0, 82 - averageScore);
  const href = reviewBatchHref(first);

  return {
    id: [
      first.sourceCollection,
      first.chapter,
      first.problemType,
      first.layer,
      first.stage
    ].join(":"),
    title: `${first.chapterTitle} · ${formatLabel(first.problemType)}`,
    sourceCollection: first.sourceCollection,
    course: first.course,
    chapter: first.chapter,
    chapterTitle: first.chapterTitle,
    problemType: first.problemType,
    layer: first.layer,
    stage: first.stage,
    count: items.length,
    averageScore,
    priorityScore: Math.round(priorityScore),
    topIssues,
    items: items.slice(0, 6),
    href
  };
}

function reviewBatchHref(item: ExplanationReviewItem) {
  const params = new URLSearchParams({
    course: item.course,
    chapter: item.chapter,
    problemType: item.problemType,
    layer: item.layer,
    stage: item.stage,
    autoGradableOnly: "true"
  });

  return `/practice?${params.toString()}`;
}

function topIssueCounts(items: ExplanationReviewItem[]) {
  const counts = countBy(
    items.flatMap((item) => item.quality.issues),
    (issue) => issue
  );

  return Object.entries(counts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count || a.issue.localeCompare(b.issue))
    .slice(0, 3);
}

function compareReviewItems(left: ExplanationReviewItem, right: ExplanationReviewItem) {
  return (
    levelRank(left.quality.level) - levelRank(right.quality.level) ||
    left.quality.score - right.quality.score ||
    left.sourceCollection.localeCompare(right.sourceCollection) ||
    left.chapter.localeCompare(right.chapter) ||
    left.problemType.localeCompare(right.problemType) ||
    left.id.localeCompare(right.id)
  );
}

function levelRank(level: ExplanationQualityLevel) {
  if (level === "missing") return 0;
  if (level === "weak") return 1;
  if (level === "partial") return 2;
  return 3;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function scoreExplanation(explanation: ExampleExplanation, issues: string[]) {
  let score = 0;

  REQUIRED_SECTIONS.forEach((section) => {
    if (hasUsefulText(explanation[section])) score += section === "stepByStep" ? 28 : 12;
  });

  const stepCount = splitSteps(explanation.stepByStep).length;
  if (stepCount >= 2) score += 8;
  if (stepCount >= 3) score += 6;
  if (hasConceptBridge(explanation)) score += 6;
  if (hasAnswerReference(explanation)) score += 4;
  score -= issues.length * 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildExplanationIssues(explanation: ExampleExplanation, problem?: Problem) {
  const issues: string[] = [];
  const stepText = explanation.stepByStep ?? "";
  const allText = REQUIRED_SECTIONS.map((section) => explanation[section] ?? "").join(" ").toLowerCase();

  if (!hasUsefulText(stepText)) {
    issues.push("Missing worked steps.");
  } else {
    if (wordCount(stepText) < 10) issues.push("Worked steps are very short.");
    if (splitSteps(stepText).length < 2) issues.push("Worked steps are not clearly layered.");
  }

  if (!hasUsefulText(explanation.hint1) || !hasUsefulText(explanation.hint2)) {
    issues.push("Needs two progressive hints.");
  }

  if (!hasUsefulText(explanation.commonMistake)) {
    issues.push("Missing common mistake guidance.");
  }

  if (!hasUsefulText(explanation.whyCorrect)) {
    issues.push("Missing why-it-works explanation.");
  }

  if (!hasUsefulText(explanation.variantIdea)) {
    issues.push("Missing transfer/variant prompt.");
  }

  if (PLACEHOLDER_PATTERNS.some((pattern) => allText.includes(pattern))) {
    issues.push("Contains template-like wording that should be reviewed.");
  }

  if (problem?.answer && !allText.includes(String(problem.answer).toLowerCase())) {
    issues.push("Does not explicitly reference the expected answer.");
  }

  return issues;
}

function qualityLevel(score: number, missingCount: number, issueCount: number): ExplanationQualityLevel {
  if (missingCount >= REQUIRED_SECTIONS.length) return "missing";
  if (score >= 82 && issueCount <= 1) return "complete";
  if (score >= 55) return "partial";
  return "weak";
}

function hasUsefulText(value: string | undefined) {
  return Boolean(value && value.trim().length >= 4);
}

function splitSteps(value: string | undefined) {
  if (!value) return [];

  return value
    .split(/(?:\.\s+|;\s+|\n+| therefore | then | first | next )/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 4);
}

function hasConceptBridge(explanation: ExampleExplanation) {
  const text = `${explanation.hint1 ?? ""} ${explanation.hint2 ?? ""} ${explanation.whyCorrect ?? ""}`.toLowerCase();
  return ["because", "relation", "pattern", "concept", "structure", "model", "why"].some((word) => text.includes(word));
}

function hasAnswerReference(explanation: ExampleExplanation) {
  const text = `${explanation.stepByStep ?? ""} ${explanation.whyCorrect ?? ""}`.toLowerCase();
  return ["answer", "therefore", "equals", "="].some((word) => text.includes(word));
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function learnerLabel(level: ExplanationQualityLevel) {
  if (level === "complete") return "Full teaching note";
  if (level === "partial") return "Good starter explanation";
  if (level === "weak") return "Short explanation";
  return "No explanation yet";
}

function reviewerLabel(level: ExplanationQualityLevel) {
  if (level === "complete") return "Complete";
  if (level === "partial") return "Partial";
  if (level === "weak") return "Needs review";
  return "Missing";
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyFor(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
