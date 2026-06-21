"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import problemsData from "../data/problems.json";
import type { Problem } from "../../../packages/adaptive-engine";
import { buildLearningPlan, type LearningPlan, type LearningPlanTask } from "./shared/learningPlan";
import { buildReviewQueue, type ReviewQueue } from "./shared/reviewQueue";
import { readAssessmentReport, readDiagnosticLogs, readLearningPlan, readPracticeLogs, readSessionCompletions, readStudentModel, readSubjectiveReviewQueue, type SubjectiveReviewItem } from "./shared/storage";
import { summarizeSessionCompletions, type SessionCompletionRecord } from "./shared/sessionAnalytics";
import { summarizeStudentModel, type StudentModel } from "./shared/studentModel";
import { buildReviewedSubjectiveFeedback, countPendingSubjectiveReviews, type ReviewedSubjectiveFeedback } from "./shared/subjectiveFeedback";
import { buildReviewSchedule, type ReviewSchedule } from "./shared/reviewSchedule";
import type { AssessmentReport } from "./shared/assessmentReport";
import type { SimulationLog } from "./dashboard/types";

const problems = problemsData as Problem[];

type HomeState = {
  plan: LearningPlan | null;
  reviewQueue: ReviewQueue | null;
  studentModel: StudentModel | null;
  assessmentReport: AssessmentReport | null;
  practiceLogs: SimulationLog[];
  subjectiveReviews: SubjectiveReviewItem[];
  diagnosticLogs: SimulationLog[];
  sessionCompletions: SessionCompletionRecord[];
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
    subjectiveReviews: [],
    diagnosticLogs: [],
    sessionCompletions: []
  });

  useEffect(() => {
    const studentModel = readStudentModel();
    const practiceLogs = readPracticeLogs();
    const diagnosticLogs = readDiagnosticLogs();
    const sessionCompletions = readSessionCompletions();
    const storedPlan = readLearningPlan();
    const subjectiveReviews = readSubjectiveReviewQueue();
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
      subjectiveReviews,
      diagnosticLogs,
      sessionCompletions
    });
  }, []);

  const summary = useMemo(() => buildHomeSummary(homeState), [homeState]);
  const tasks = useMemo(() => buildRecommendedTasks(homeState), [homeState]);
  const reviewedFeedback = useMemo(
    () => buildReviewedSubjectiveFeedback(homeState.subjectiveReviews, problems, { limit: 2 }),
    [homeState.subjectiveReviews]
  );
  const reviewSchedule = useMemo(
    () => buildReviewSchedule(homeState.studentModel, homeState.subjectiveReviews, problems),
    [homeState.studentModel, homeState.subjectiveReviews]
  );
  const pendingSubjectiveCount = useMemo(
    () => countPendingSubjectiveReviews(homeState.subjectiveReviews),
    [homeState.subjectiveReviews]
  );
  const completionSummary = useMemo(
    () => summarizeSessionCompletions(homeState.sessionCompletions),
    [homeState.sessionCompletions]
  );

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
        <ProgressTile label="Completed Sessions" value={String(completionSummary.totalCount)} detail={`${completionSummary.averageAccuracy}% recent session accuracy`} />
        <ProgressTile label="Review Due" value={String(reviewSchedule.dueTodayCount)} detail={reviewSchedule.nextTitle} />
        <ProgressTile label="Written Feedback" value={String(reviewedFeedback.length)} detail={pendingSubjectiveCount > 0 ? `${pendingSubjectiveCount} pending review` : "Latest reviewed work"} />
      </div>

      {completionSummary.latest && (
        <section className="panel full-panel session-completion-panel">
          <div className="recommended-task-head">
            <div>
              <p className="eyebrow">Session Completion Analytics v1</p>
              <h2 className="panel-title">Latest completed session</h2>
            </div>
            <Link className="button-secondary" href="/dashboard">
              View analytics
            </Link>
          </div>
          <SessionCompletionCard record={completionSummary.latest} />
        </section>
      )}

      {reviewedFeedback.length > 0 && (
        <section className="panel full-panel subjective-feedback-panel">
          <div className="recommended-task-head">
            <div>
              <p className="eyebrow">Reviewed Written Work</p>
              <h2 className="panel-title">Latest feedback and repair task</h2>
            </div>
            <Link className="button-secondary" href="/review">
              Open review queue
            </Link>
          </div>
          <div className="subjective-feedback-grid">
            {reviewedFeedback.map((item) => (
              <SubjectiveFeedbackCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      )}

      {homeState.plan?.status === "ready" && (
        <section className="panel full-panel learning-path-v2-panel">
          <div className="recommended-task-head">
            <div>
              <p className="eyebrow">Learning Path Planner v2</p>
              <h2 className="panel-title">Today, this week, and checkpoint</h2>
            </div>
            <Link className="button-secondary" href="/dashboard">
              Open full plan
            </Link>
          </div>
          <div className="learning-path-v2-grid">
            <LearningPathColumn title="Today" tasks={homeState.plan.todayTasks} />
            <LearningPathColumn title="This week" tasks={homeState.plan.weeklyFocus} />
            <div className="learning-path-checkpoint">
              <span>Checkpoint</span>
              <strong>{homeState.plan.checkpoint.title}</strong>
              <p>{homeState.plan.checkpoint.reason}</p>
              <small>{homeState.plan.checkpoint.recommendedAfter}</small>
              <Link className="button-secondary" href={withSessionParams(homeState.plan.checkpoint.href, {
                sessionTitle: homeState.plan.checkpoint.title,
                sessionGoal: homeState.plan.checkpoint.reason,
                sessionSource: "learning-path-v2",
                returnHref: "/"
              })}>
                Start checkpoint
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="panel full-panel review-calendar-panel">
        <div className="recommended-task-head">
          <div>
            <p className="eyebrow">Review Scheduling v1</p>
            <h2 className="panel-title">Spaced review calendar</h2>
            <p className="muted">
              {reviewSchedule.dueTodayCount} due today · {reviewSchedule.upcomingCount} upcoming · {reviewSchedule.pendingWrittenReviews} written item(s) awaiting review
            </p>
          </div>
          <Link className="button-secondary" href={withSessionParams(reviewSchedule.nextHref, {
            sessionTitle: reviewSchedule.nextTitle,
            sessionGoal: "Start the next due review from the spaced review calendar.",
            sessionSource: "review-schedule",
            returnHref: "/"
          })}>
            Start next review
          </Link>
        </div>
        {reviewSchedule.days.length === 0 ? (
          <p className="muted">No scheduled review is due in the next week. Continue practice to create spaced review signals.</p>
        ) : (
          <div className="review-calendar-grid">
            {reviewSchedule.days.map((day) => (
              <div className="review-calendar-day" key={day.date}>
                <span>{day.label}</span>
                {day.items.slice(0, 3).map((item) => (
                  <Link className={`review-calendar-item review-calendar-${item.status}`} href={withSessionParams(item.href, {
                    sessionTitle: item.title,
                    sessionGoal: item.reason,
                    sessionSource: "review-schedule",
                    returnHref: "/"
                  })} key={item.id}>
                    <strong>{item.title}</strong>
                    <small>{item.estimateMinutes} min · {item.kind}</small>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

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

function LearningPathColumn({ tasks, title }: { tasks: LearningPlanTask[]; title: string }) {
  return (
    <div className="learning-path-column">
      <span>{title}</span>
      {tasks.length === 0 ? (
        <p className="muted">No task scheduled yet.</p>
      ) : (
        tasks.map((task) => (
          <Link
            className="learning-path-task"
            href={withSessionParams(task.href, {
              sessionTitle: task.title,
              sessionGoal: task.reason,
              sessionSource: "learning-path-v2",
              returnHref: "/"
            })}
            key={task.id}
          >
            <strong>{task.title}</strong>
            <p>{task.reason}</p>
            <em>{task.estimateMinutes} min · {task.kind}</em>
          </Link>
        ))
      )}
    </div>
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

function SubjectiveFeedbackCard({ item }: { item: ReviewedSubjectiveFeedback }) {
  return (
    <div className="subjective-feedback-card">
      <div className="tag-row">
        <span className="tag tag-gold">{item.scoreLabel}</span>
        <span className="tag">{item.mode}</span>
        {item.abilityTags.slice(0, 2).map((tag) => (
          <span className="tag tag-teal" key={tag}>{tag}</span>
        ))}
      </div>
      <h3>{item.problemTitle}</h3>
      <p>{item.feedback}</p>
      <p className="muted">{item.nextAction}</p>
      <div className="learning-plan-actions">
        <Link className="button" href={item.href}>
          Start repair practice
        </Link>
        <Link className="button-secondary" href={`/practice?problemId=${encodeURIComponent(item.problem)}&autoGradableOnly=false`}>
          Reopen problem
        </Link>
      </div>
    </div>
  );
}

function SessionCompletionCard({ record }: { record: SessionCompletionRecord }) {
  return (
    <div className="session-completion-card">
      <div>
        <div className="tag-row">
          <span className="tag tag-teal">{record.mode}</span>
          <span className="tag tag-gold">{record.status}</span>
          <span className="tag">{record.totalCount} item(s)</span>
        </div>
        <h3>{record.sessionTitle}</h3>
        <p>{record.sessionGoal}</p>
        <p className="muted">
          {record.accuracy}% accuracy · {record.averageTimeSeconds}s avg · {formatRelativeDate(record.completedAt)}
        </p>
      </div>
      <div className="session-completion-next">
        <strong>{record.nextTitle}</strong>
        <span>{record.reviewOutcome === "cleared" ? "Ready to advance" : record.reviewOutcome === "repeat" ? "Repeat once" : "Repair first"}</span>
        <Link className="button" href={record.nextHref}>
          Continue
        </Link>
      </div>
    </div>
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

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
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
  const subjectiveFeedback = buildReviewedSubjectiveFeedback(state.subjectiveReviews, problems, { limit: 1 })[0];
  const reviewSchedule = buildReviewSchedule(state.studentModel, state.subjectiveReviews, problems);

  if (reviewSchedule.dueTodayCount > 0) {
    tasks.push({
      eyebrow: "Review Calendar",
      title: reviewSchedule.nextTitle,
      reason: `${reviewSchedule.dueTodayCount} review item(s) are due today.`,
      href: withSessionParams(reviewSchedule.nextHref, {
        sessionTitle: reviewSchedule.nextTitle,
        sessionGoal: "Start the next due review from the spaced review calendar.",
        sessionSource: "review-schedule",
        returnHref: "/"
      }),
      action: "Start due review",
      tone: "review"
    });
  }

  if (subjectiveFeedback) {
    tasks.push({
      eyebrow: "Written Feedback",
      title: `Repair ${formatConcept(subjectiveFeedback.concepts[0] ?? subjectiveFeedback.problem)}`,
      reason: subjectiveFeedback.nextAction,
      href: subjectiveFeedback.href,
      action: subjectiveFeedback.scoreLabel,
      tone: "review"
    });
  }

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
