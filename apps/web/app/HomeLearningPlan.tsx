"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import problemsData from "../data/problems.json";
import type { Problem } from "../../../packages/adaptive-engine";
import { buildLearningPlan, type LearningPlan } from "./shared/learningPlan";
import { buildReviewQueue, type ReviewQueue } from "./shared/reviewQueue";
import { readAssessmentReport, readDiagnosticLogs, readLearningPlan, readPracticeLogs, readStudentModel } from "./shared/storage";
import { summarizeStudentModel, type StudentModel } from "./shared/studentModel";
import type { AssessmentReport } from "./shared/assessmentReport";
import type { SimulationLog } from "./dashboard/types";

const problems = problemsData as Problem[];

type HomeState = {
  plan: LearningPlan | null;
  reviewQueue: ReviewQueue | null;
  studentModel: StudentModel | null;
  assessmentReport: AssessmentReport | null;
  practiceLogs: SimulationLog[];
  diagnosticLogs: SimulationLog[];
};

type RecommendedTask = {
  eyebrow: string;
  title: string;
  reason: string;
  href: string;
  action: string;
  tone: "primary" | "review" | "report";
};

export default function HomeLearningPlan() {
  const [homeState, setHomeState] = useState<HomeState>({
    plan: null,
    reviewQueue: null,
    studentModel: null,
    assessmentReport: null,
    practiceLogs: [],
    diagnosticLogs: []
  });

  useEffect(() => {
    const studentModel = readStudentModel();
    const practiceLogs = readPracticeLogs();
    const diagnosticLogs = readDiagnosticLogs();
    const storedPlan = readLearningPlan();
    const generatedPlan =
      studentModel || practiceLogs.length > 0 || diagnosticLogs.length > 0
        ? buildLearningPlan([...diagnosticLogs, ...practiceLogs], problems, studentModel)
        : null;

    setHomeState({
      plan: generatedPlan?.status === "ready" ? generatedPlan : storedPlan,
      reviewQueue: buildReviewQueue(studentModel, problems),
      studentModel,
      assessmentReport: readAssessmentReport(),
      practiceLogs,
      diagnosticLogs
    });
  }, []);

  const summary = useMemo(() => buildHomeSummary(homeState), [homeState]);
  const tasks = useMemo(() => buildRecommendedTasks(homeState), [homeState]);

  return (
    <section className="student-home-grid">
      <div className="panel student-continue-panel">
        <div className="student-continue-copy">
          <p className="eyebrow">Product v0.2 Student Home</p>
          <div className="tag-row">
            <span className="tag">{summary.placement}</span>
            <span className="tag tag-teal">{summary.status}</span>
            {summary.focusConcept && <span className="tag tag-gold">{summary.focusConcept}</span>}
          </div>
          <h2 className="student-continue-title">{summary.title}</h2>
          <p>{summary.reason}</p>
        </div>
        <div className="student-continue-actions">
          <Link className="button" href={summary.primaryHref}>
            {summary.primaryAction}
          </Link>
          <Link className="button-secondary" href="/dashboard">
            View progress
          </Link>
        </div>
      </div>

      <div className="student-progress-panel">
        <ProgressTile label="Recent Attempts" value={String(summary.recentAttempts)} detail={summary.recentAccuracy} />
        <ProgressTile label="Current Streak" value={summary.streakLabel} detail={summary.lastActivity} />
        <ProgressTile label="Review Due" value={String(summary.reviewCount)} detail={summary.reviewDetail} />
        <ProgressTile label="Course Position" value={summary.placement} detail={summary.placementEvidence} />
      </div>

      <div className="panel full-panel recommended-task-panel">
        <div className="recommended-task-head">
          <div>
            <p className="eyebrow">Recommended Tasks</p>
            <h2 className="panel-title">Today&apos;s learning queue</h2>
          </div>
          <Link className="button-secondary" href="/practice">
            Browse practice
          </Link>
        </div>
        <div className="recommended-task-grid">
          {tasks.map((task) => (
            <RecommendedTaskCard key={`${task.eyebrow}-${task.href}`} task={task} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecommendedTaskCard({ task }: { task: RecommendedTask }) {
  return (
    <Link className={`recommended-task-card recommended-task-${task.tone}`} href={task.href}>
      <span>{task.eyebrow}</span>
      <strong>{task.title}</strong>
      <p>{task.reason}</p>
      <em>{task.action}</em>
    </Link>
  );
}

function ProgressTile({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="progress-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function buildHomeSummary(state: HomeState) {
  const modelSummary = summarizeStudentModel(state.studentModel);
  const allLogs = [...state.diagnosticLogs, ...state.practiceLogs];
  const recentLogs = allLogs.slice(-10);
  const recentCorrect = recentLogs.filter((log) => log.correct).length;
  const recentAccuracy =
    recentLogs.length > 0
      ? `${Math.round((recentCorrect / recentLogs.length) * 100)}% recent accuracy`
      : "No recent session yet";
  const lastLog = allLogs.at(-1);
  const focusConcept = state.plan?.targetConcept ?? modelSummary.focusConcepts[0]?.concept ?? state.assessmentReport?.targetConcepts[0];
  const reviewCount = state.reviewQueue?.problemCount ?? 0;
  const hasEvidence = Boolean(state.studentModel && state.studentModel.totalAttempts > 0) || allLogs.length > 0;
  const placement = state.studentModel?.currentPlacement.stage ?? state.assessmentReport?.placement.stage ?? "Foundation";
  const status = state.studentModel?.currentPlacement.status ?? state.assessmentReport?.placement.status ?? "Not Measured";
  const planReady = state.plan?.status === "ready";

  return {
    title: planReady ? state.plan?.title ?? "Continue adaptive practice" : hasEvidence ? "Continue adaptive practice" : "Start with a diagnostic",
    reason: planReady
      ? state.plan?.reason ?? "The next focused mini session is ready."
      : hasEvidence
        ? "You have enough activity to continue with a short adaptive practice session."
        : "A short diagnostic will create your first learning path and baseline report.",
    primaryHref: planReady
      ? withSessionParams(state.plan?.href ?? "/practice", {
          sessionTitle: state.plan?.title ?? "Continue adaptive practice",
          sessionGoal: state.plan?.reason ?? "The next focused mini session is ready.",
          sessionSource: "home",
          returnHref: "/"
        })
      : hasEvidence
        ? withSessionParams("/practice", {
            sessionTitle: "Continue adaptive practice",
            sessionGoal: "Complete a bounded practice set so the model can recommend the next useful action.",
            sessionSource: "home",
            returnHref: "/"
          })
        : "/diagnostic",
    primaryAction: planReady ? "Continue learning" : hasEvidence ? "Continue practice" : "Start diagnostic",
    placement,
    status,
    focusConcept,
    recentAttempts: recentLogs.length,
    recentAccuracy,
    streakLabel: `${countCorrectStreak(allLogs)} correct`,
    lastActivity: lastLog ? `Last: ${lastLog.problem}` : "Start a session to create progress.",
    reviewCount,
    reviewDetail: reviewCount > 0 ? `${state.reviewQueue?.dueConcepts.slice(0, 2).join(", ")} ready` : "No review due yet",
    placementEvidence: state.studentModel?.currentPlacement.evidence ?? state.assessmentReport?.placement.evidence ?? "Placement will update after diagnostic."
  };
}

function buildRecommendedTasks(state: HomeState): RecommendedTask[] {
  const tasks: RecommendedTask[] = [];
  const plan = state.plan;
  const reviewQueue = state.reviewQueue;
  const modelSummary = summarizeStudentModel(state.studentModel);

  if (reviewQueue && reviewQueue.problemCount > 0) {
    tasks.push({
      eyebrow: "Spaced Review",
      title: `Review ${reviewQueue.dueConcepts[0] ?? "due concepts"}`,
      reason: reviewQueue.reason,
      href: withSessionParams(reviewQueue.href, {
        sessionTitle: "Spaced review session",
        sessionGoal: `Stabilize ${reviewQueue.dueConcepts.slice(0, 3).map(formatConcept).join(", ") || "due concepts"} before new work.`,
        sessionSource: "home",
        returnHref: "/"
      }),
      action: `${reviewQueue.problemCount} items ready`,
      tone: "review"
    });
  }

  if (plan?.status === "ready") {
    tasks.push({
      eyebrow: "Next Lesson",
      title: plan.title,
      reason: plan.reason,
      href: withSessionParams(plan.href, {
        sessionTitle: plan.title,
        sessionGoal: plan.reason,
        sessionSource: "home",
        returnHref: "/"
      }),
      action: "Start mini session",
      tone: "primary"
    });
  }

  if (plan?.steps?.length) {
    plan.steps.slice(0, 2).forEach((step) => {
      tasks.push({
        eyebrow: step.priority,
        title: step.title,
        reason: step.reason,
        href: withSessionParams(step.href, {
          sessionTitle: step.title,
          sessionGoal: step.reason,
          sessionSource: "home",
          returnHref: "/"
        }),
        action: `${step.sessionLength} item session`,
        tone: step.priority === "review" || step.priority === "repair" ? "review" : "primary"
      });
    });
  }

  if (tasks.length < 3 && state.assessmentReport) {
    tasks.push({
      eyebrow: "Checkpoint",
      title: state.assessmentReport.recommendationTitle,
      reason: state.assessmentReport.recommendationReason,
      href: withSessionParams(state.assessmentReport.practiceHref, {
        sessionTitle: state.assessmentReport.recommendationTitle,
        sessionGoal: state.assessmentReport.recommendationReason,
        sessionSource: "home",
        returnHref: "/"
      }),
      action: "Use diagnostic target",
      tone: "primary"
    });
  }

  if (tasks.length < 3 && modelSummary.focusConcepts.length > 0) {
    const focus = modelSummary.focusConcepts[0];
    tasks.push({
      eyebrow: "Focus Concept",
      title: `Practice ${formatConcept(focus.concept)}`,
      reason: `${Math.round(focus.mastery * 100)}% mastery and ${Math.round(focus.stability * 100)}% stability.`,
      href: withSessionParams(`/practice?mode=plan&concepts=${encodeURIComponent(focus.concept)}&maxItems=8&autoGradableOnly=true`, {
        sessionTitle: `Stabilize ${formatConcept(focus.concept)}`,
        sessionGoal: `${Math.round(focus.mastery * 100)}% mastery and ${Math.round(focus.stability * 100)}% stability. Confirm the concept with a short adaptive set.`,
        sessionSource: "home",
        returnHref: "/"
      }),
      action: "Stabilize skill",
      tone: "primary"
    });
  }

  tasks.push({
    eyebrow: "Report",
    title: "Open learning dashboard",
    reason: "Review mastery, readiness, cognitive signals, and explanation quality before choosing a broader range.",
    href: "/dashboard",
    action: "View report",
    tone: "report"
  });

  if (tasks.length < 3) {
    tasks.unshift({
      eyebrow: "Baseline",
      title: "Run the initial diagnostic",
      reason: "Create a placement signal and a first personalized learning path.",
      href: "/diagnostic",
      action: "10 question check",
      tone: "primary"
    });
  }

  const expandedTasks = uniqueTasks(tasks);

  if (expandedTasks.length < 3) {
    expandedTasks.push({
      eyebrow: "Practice",
      title: "Browse adaptive practice",
      reason: "Choose a course, chapter, difficulty layer, or cognitive tag to start a self-directed set.",
      href: withSessionParams("/practice", {
        sessionTitle: "Self-directed practice",
        sessionGoal: "Choose a scoped range and complete a short evidence-building session.",
        sessionSource: "home",
        returnHref: "/"
      }),
      action: "Open problem bank",
      tone: "primary"
    });
  }

  return uniqueTasks(expandedTasks).slice(0, 3);
}

function withSessionParams(href: string, session: { sessionGoal: string; sessionSource: string; sessionTitle: string; returnHref: string }) {
  if (!href.startsWith("/practice")) return href;

  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("sessionTitle", session.sessionTitle);
  params.set("sessionGoal", session.sessionGoal);
  params.set("sessionSource", session.sessionSource);
  params.set("returnHref", session.returnHref);

  return `${path}?${params.toString()}`;
}

function uniqueTasks(tasks: RecommendedTask[]) {
  const seen = new Set<string>();

  return tasks.filter((task) => {
    const key = `${task.title}:${task.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countCorrectStreak(logs: SimulationLog[]) {
  let streak = 0;

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (!logs[index].correct) break;
    streak += 1;
  }

  return streak;
}

function formatConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
