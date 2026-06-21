import type { SimulationLog } from "../dashboard/types";
import type { ReviewSchedule } from "./reviewSchedule";
import type { SessionCompletionRecord } from "./sessionAnalytics";
import type { StudentModel } from "./studentModel";

export type LearningLoopConcept = {
  concept: string;
  diagnosticSignals: number;
  practiceSignals: number;
  completionSignals: number;
  latestOutcome: SessionCompletionRecord["reviewOutcome"] | "not-started";
  readiness: "closed" | "progressing" | "stuck" | "unstarted";
  recommendation: string;
};

export type LearningLoopMetrics = {
  activeRepairLoops: number;
  closedLoops: number;
  conceptLoops: LearningLoopConcept[];
  diagnosticCoveragePercent: number;
  followUpDue: number;
  generatedAt: string;
  healthScore: number;
  headline: string;
  practiceCoveragePercent: number;
  readyConversionPercent: number;
  recentSessionCount: number;
  stalledConcepts: string[];
  weeklyCompletedSessions: number;
};

export function buildLearningLoopMetrics(input: {
  diagnosticLogs: SimulationLog[];
  practiceLogs: SimulationLog[];
  reviewSchedule: ReviewSchedule;
  sessionCompletions: SessionCompletionRecord[];
  studentModel: StudentModel | null;
  now?: Date;
}): LearningLoopMetrics {
  const now = input.now ?? new Date();
  const recentCompletions = input.sessionCompletions.filter((record) => daysBetween(record.completedAt, now) <= 7);
  const diagnosticConcepts = countConceptSignals(input.diagnosticLogs);
  const practiceConcepts = countConceptSignals(input.practiceLogs);
  const completionConcepts = countCompletionSignals(input.sessionCompletions);
  const conceptLoops = buildConceptLoops({
    completionConcepts,
    diagnosticConcepts,
    practiceConcepts,
    sessionCompletions: input.sessionCompletions,
    studentModel: input.studentModel
  });
  const closedLoops = conceptLoops.filter((loop) => loop.readiness === "closed").length;
  const activeRepairLoops = conceptLoops.filter((loop) => loop.readiness === "stuck").length;
  const diagnosticCoveragePercent = percent(
    [...diagnosticConcepts.keys()].filter((concept) => practiceConcepts.has(concept)).length,
    diagnosticConcepts.size
  );
  const practiceCoveragePercent = percent(
    [...practiceConcepts.keys()].filter((concept) => completionConcepts.has(concept)).length,
    practiceConcepts.size
  );
  const readyConversionPercent = percent(
    input.sessionCompletions.filter((record) => record.reviewOutcome === "cleared").length,
    input.sessionCompletions.length
  );
  const followUpDue = input.reviewSchedule.items.filter((item) =>
    item.kind === "session-follow-up" && (item.status === "due" || item.status === "today")
  ).length;
  const healthScore = scoreLoopHealth({
    activeRepairLoops,
    diagnosticCoveragePercent,
    followUpDue,
    practiceCoveragePercent,
    readyConversionPercent,
    weeklyCompletedSessions: recentCompletions.length
  });

  return {
    activeRepairLoops,
    closedLoops,
    conceptLoops,
    diagnosticCoveragePercent,
    followUpDue,
    generatedAt: now.toISOString(),
    healthScore,
    headline: buildLoopHeadline(healthScore, recentCompletions.length, activeRepairLoops),
    practiceCoveragePercent,
    readyConversionPercent,
    recentSessionCount: input.sessionCompletions.slice(0, 8).length,
    stalledConcepts: conceptLoops.filter((loop) => loop.readiness === "stuck").slice(0, 4).map((loop) => loop.concept),
    weeklyCompletedSessions: recentCompletions.length
  };
}

function buildConceptLoops(input: {
  completionConcepts: Map<string, number>;
  diagnosticConcepts: Map<string, number>;
  practiceConcepts: Map<string, number>;
  sessionCompletions: SessionCompletionRecord[];
  studentModel: StudentModel | null;
}): LearningLoopConcept[] {
  const concepts = new Set<string>([
    ...input.diagnosticConcepts.keys(),
    ...input.practiceConcepts.keys(),
    ...input.completionConcepts.keys(),
    ...Object.keys(input.studentModel?.conceptStates ?? {})
  ]);

  return [...concepts]
    .map((concept) => {
      const latestOutcome = getLatestOutcome(concept, input.sessionCompletions);
      const state = input.studentModel?.conceptStates[concept];
      const diagnosticSignals = input.diagnosticConcepts.get(concept) ?? 0;
      const practiceSignals = input.practiceConcepts.get(concept) ?? 0;
      const completionSignals = input.completionConcepts.get(concept) ?? 0;
      const readiness = inferLoopReadiness({
        completionSignals,
        diagnosticSignals,
        latestOutcome,
        mastery: state?.mastery ?? 0,
        practiceSignals,
        wrongStreak: state?.wrongStreak ?? 0
      });

      return {
        concept,
        diagnosticSignals,
        practiceSignals,
        completionSignals,
        latestOutcome,
        readiness,
        recommendation: buildLoopRecommendation(readiness, concept)
      };
    })
    .sort(compareConceptLoops)
    .slice(0, 12);
}

function inferLoopReadiness(input: {
  completionSignals: number;
  diagnosticSignals: number;
  latestOutcome: LearningLoopConcept["latestOutcome"];
  mastery: number;
  practiceSignals: number;
  wrongStreak: number;
}): LearningLoopConcept["readiness"] {
  if (input.latestOutcome === "cleared" || (input.mastery >= 0.78 && input.completionSignals > 0 && input.wrongStreak === 0)) {
    return "closed";
  }

  if (input.latestOutcome === "repair" || input.wrongStreak > 0 || (input.diagnosticSignals > 0 && input.practiceSignals === 0)) {
    return "stuck";
  }

  if (input.practiceSignals > 0 || input.completionSignals > 0 || input.latestOutcome === "repeat") {
    return "progressing";
  }

  return "unstarted";
}

function buildLoopRecommendation(readiness: LearningLoopConcept["readiness"], concept: string) {
  const label = formatConcept(concept);

  if (readiness === "closed") return `${label} has enough evidence to move into spaced maintenance.`;
  if (readiness === "progressing") return `${label} is mid-loop; use one confirmation or review follow-up.`;
  if (readiness === "stuck") return `${label} needs a short repair loop before adding difficulty.`;
  return `${label} appeared in the model but has not started a clear loop yet.`;
}

function getLatestOutcome(concept: string, records: SessionCompletionRecord[]): LearningLoopConcept["latestOutcome"] {
  const record = records.find((item) => item.focusConcepts.includes(concept) || item.strongConcepts.includes(concept));
  return record?.reviewOutcome ?? "not-started";
}

function countConceptSignals(logs: SimulationLog[]) {
  const counts = new Map<string, number>();

  logs.forEach((log) => {
    log.concepts.forEach((concept) => counts.set(concept, (counts.get(concept) ?? 0) + 1));
    log.weakConcepts.forEach((concept) => counts.set(concept, (counts.get(concept) ?? 0) + 1));
    log.prerequisiteGaps?.forEach((gap) => counts.set(gap.concept, (counts.get(gap.concept) ?? 0) + 1));
  });

  return counts;
}

function countCompletionSignals(records: SessionCompletionRecord[]) {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    [...record.focusConcepts, ...record.strongConcepts].forEach((concept) => {
      counts.set(concept, (counts.get(concept) ?? 0) + 1);
    });
  });

  return counts;
}

function scoreLoopHealth(input: {
  activeRepairLoops: number;
  diagnosticCoveragePercent: number;
  followUpDue: number;
  practiceCoveragePercent: number;
  readyConversionPercent: number;
  weeklyCompletedSessions: number;
}) {
  const sessionScore = Math.min(30, input.weeklyCompletedSessions * 10);
  const coverageScore = Math.round((input.diagnosticCoveragePercent + input.practiceCoveragePercent) * 0.2);
  const readyScore = Math.round(input.readyConversionPercent * 0.25);
  const penalty = Math.min(25, input.activeRepairLoops * 6 + input.followUpDue * 3);

  return clamp(sessionScore + coverageScore + readyScore - penalty, 0, 100);
}

function buildLoopHeadline(score: number, weeklyCompletedSessions: number, activeRepairLoops: number) {
  if (weeklyCompletedSessions === 0) return "No completed loop this week yet.";
  if (activeRepairLoops > 2) return "Learning loop is active, but several concepts need repair.";
  if (score >= 70) return "Learning loop is healthy and producing ready signals.";
  if (score >= 45) return "Learning loop is moving, but confirmation work is still needed.";
  return "Learning loop has started; focus on closing one repair loop next.";
}

function compareConceptLoops(left: LearningLoopConcept, right: LearningLoopConcept) {
  const rank = { stuck: 0, progressing: 1, unstarted: 2, closed: 3 };
  const leftRank = rank[left.readiness];
  const rightRank = rank[right.readiness];

  if (leftRank !== rightRank) return leftRank - rightRank;
  return (
    right.diagnosticSignals + right.practiceSignals + right.completionSignals -
    (left.diagnosticSignals + left.practiceSignals + left.completionSignals)
  );
}

function daysBetween(value: string, now: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
