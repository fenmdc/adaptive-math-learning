export type SessionCompletionStatus = "Ready" | "Developing" | "Needs Repair";

export type SessionCompletionMode = "practice" | "review" | "plan";

export type SessionCompletionReason = "practice-complete" | "review-complete" | "plan-complete";

export type SessionCompletionRecord = {
  accuracy: number;
  averageConfidence: number;
  averageTimeSeconds: number;
  completedAt: string;
  completedTaskKind: "practice" | "review" | "learning-path" | "checkpoint";
  completionReason: SessionCompletionReason;
  correctCount: number;
  course: string;
  focusConcepts: string[];
  id: string;
  language: string;
  mode: SessionCompletionMode;
  nextHref: string;
  nextTitle: string;
  reviewOutcome: "cleared" | "repeat" | "repair";
  sessionGoal: string;
  sessionSource: string;
  sessionTitle: string;
  shouldDelayCheckpoint: boolean;
  shouldRetest: boolean;
  status: SessionCompletionStatus;
  strongConcepts: string[];
  totalCount: number;
  track: string;
};

export type SessionCompletionInput = Omit<SessionCompletionRecord, "completedAt" | "id"> & {
  completedAt?: string;
};

export function createSessionCompletionRecord(input: SessionCompletionInput): SessionCompletionRecord {
  const completedAt = input.completedAt ?? new Date().toISOString();

  return {
    ...input,
    completedAt,
    id: [
      "session",
      input.mode,
      input.completionReason,
      slugify(input.sessionSource),
      slugify(input.sessionTitle),
      completedAt.replace(/\D/g, "").slice(0, 14)
    ].join("-")
  };
}

export function summarizeSessionCompletions(records: SessionCompletionRecord[]) {
  const latest = records[0] ?? null;
  const recent = records.slice(0, 8);
  const totalCount = records.length;
  const readyCount = records.filter((record) => record.status === "Ready").length;
  const repairCount = records.filter((record) => record.status === "Needs Repair").length;
  const averageAccuracy =
    recent.length > 0
      ? Math.round(recent.reduce((sum, record) => sum + record.accuracy, 0) / recent.length)
      : 0;
  const completedByMode = records.reduce<Record<SessionCompletionMode, number>>(
    (counts, record) => {
      counts[record.mode] += 1;
      return counts;
    },
    { practice: 0, review: 0, plan: 0 }
  );

  return {
    averageAccuracy,
    completedByMode,
    latest,
    readyCount,
    repairCount,
    totalCount
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "session";
}
