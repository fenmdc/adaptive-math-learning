"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import problemsData from "../../data/problems.json";
import { AdaptiveEngine, checkAnswer, Problem, StudentState } from "../../../../packages/adaptive-engine";
import { buildLearningPlan } from "../shared/learningPlan";
import { buildReviewQueue, selectReviewProblems } from "../shared/reviewQueue";
import { clearPracticeLogs, createPracticeLog, readPracticeLogs, readStudentModel, writeLearningPlan, writePracticeLogs, writeStudentModel } from "../shared/storage";
import { updateStudentModel, type StudentModel } from "../shared/studentModel";

type AttemptLog = {
  problem: Problem;
  submittedAnswer: string;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts: string[];
  remediation: boolean;
  recommendationReason: string;
  answerReason: string;
  responseTimeSeconds: number;
  confidence: number;
};

const problems = problemsData as Problem[];
const initialState: StudentState = { mastery: {}, history: [] };
const ALL = "all";

type ScopeFilters = {
  mode: "practice" | "review";
  reviewConcepts: string[];
  course: string;
  theme: string;
  chapter: string;
  minDifficulty: number;
  maxDifficulty: number;
  autoGradableOnly: boolean;
};

const defaultScope: ScopeFilters = {
  mode: "practice",
  reviewConcepts: [],
  course: ALL,
  theme: ALL,
  chapter: ALL,
  minDifficulty: 1,
  maxDifficulty: 5,
  autoGradableOnly: true
};

export default function PracticePage() {
  const [studentState, setStudentState] = useState<StudentState>(initialState);
  const [scope, setScope] = useState<ScopeFilters>(() => scopeFromLocation());
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [feedback, setFeedback] = useState<AttemptLog | null>(null);
  const [pendingNextProblem, setPendingNextProblem] = useState<Problem | null>(null);
  const [latestStudentModel, setLatestStudentModel] = useState<StudentModel | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [problemStartedAt, setProblemStartedAt] = useState(() => Date.now());
  const catalog = useMemo(() => buildCatalog(problems), []);
  const scopedProblems = useMemo(() => filterProblems(problems, scope), [scope]);
  const engine = useMemo(() => new AdaptiveEngine(scopedProblems), [scopedProblems]);
  const [currentProblem, setCurrentProblem] = useState<Problem>(scopedProblems[0] ?? problems[0]);

  useEffect(() => {
    setLatestStudentModel(readStudentModel());

    const urlScope = scopeFromLocation();
    if (!scopesEqual(scope, urlScope)) {
      setScope(urlScope);
      restartWithScope(urlScope);
    }
  }, []);

  function restartWithScope(nextScope = scope) {
    const nextProblems = filterProblems(problems, nextScope);

    setStudentState(initialState);
    setCurrentProblem(nextProblems[0] ?? problems[0]);
    setAnswer("");
    setAttempts([]);
    setFeedback(null);
    setPendingNextProblem(null);
    setLatestStudentModel(readStudentModel());
    setConfidence(3);
    setProblemStartedAt(Date.now());
    clearPracticeLogs();
  }

  function updateScope(nextScope: ScopeFilters) {
    setScope(nextScope);
    restartWithScope(nextScope);
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || pendingNextProblem) return;
    if (scopedProblems.length === 0) return;

    const answerCheck = checkAnswer(answer, currentProblem.answer);
    const correct = answerCheck.correct;
    const responseTimeSeconds = secondsSince(problemStartedAt);
    const result = engine.run(studentState, {
      problem: currentProblem,
      correct,
      responseTimeSeconds,
      confidence
    });
    const recommendationReason = result.recommendation.reason;
    const persistedLog = createPracticeLog({
      step: attempts.length,
      problem: currentProblem,
      correct,
      weakConcepts: result.weak_concepts,
      fluencyConcepts: result.fluency_concepts,
      remediation: result.remediation,
      nextProblem: result.next_problem,
      mastery: result.updated_state.mastery,
      recommendationReason,
      recommendationScore: Math.round(result.recommendation.score),
      responseTimeSeconds,
      confidence
    });
    const nextAttempt = {
      problem: currentProblem,
      submittedAnswer: answer,
      correct,
      weakConcepts: result.weak_concepts,
      fluencyConcepts: result.fluency_concepts,
      remediation: result.remediation,
      recommendationReason,
      answerReason: answerCheck.reason,
      responseTimeSeconds,
      confidence
    };

    const nextLogs = [...readPracticeLogs(), persistedLog];
    const nextStudentModel = updateStudentModel(readStudentModel(), {
      problem: currentProblem,
      correct,
      mastery: result.updated_state.mastery,
      responseTimeSeconds,
      confidence
    });
    const nextPlan = buildLearningPlan(nextLogs, problems, nextStudentModel);
    const nextReviewQueue = buildReviewQueue(nextStudentModel, problems);
    const remainingReviewConcepts = scope.mode === "review"
      ? nextReviewQueue.dueConcepts.filter((concept) => scope.reviewConcepts.includes(concept))
      : [];
    const reviewNowComplete = scope.mode === "review" && remainingReviewConcepts.length === 0;

    setStudentState(result.updated_state);
    setAttempts((current) => [nextAttempt, ...current]);
    writePracticeLogs(nextLogs);
    writeStudentModel(nextStudentModel);
    writeLearningPlan(nextPlan);
    setLatestStudentModel(nextStudentModel);
    setFeedback(nextAttempt);
    setPendingNextProblem(reviewNowComplete ? null : result.next_problem);
  }

  function resetSession() {
    restartWithScope();
  }

  function goToNextProblem() {
    if (!pendingNextProblem) return;

    setCurrentProblem(pendingNextProblem);
    setPendingNextProblem(null);
    setFeedback(null);
    setAnswer("");
    setConfidence(3);
    setProblemStartedAt(Date.now());
  }

  const masteryEntries = Object.entries(studentState.mastery).sort((a, b) => a[1] - b[1]);
  const selectedCourse = scope.course === ALL ? undefined : scope.course;
  const selectedTheme = scope.theme === ALL ? undefined : scope.theme;
  const selectedChapter = scope.chapter === ALL ? undefined : scope.chapter;
  const availableThemes = catalog.themes
    .filter((item) => !selectedCourse || item.course === selectedCourse)
    .map((item) => item.theme);
  const availableChapters = catalog.chapters.filter((chapter) => {
    if (selectedCourse && chapter.course !== selectedCourse) return false;
    if (selectedTheme && chapter.theme !== selectedTheme) return false;
    return true;
  });
  const accuracy =
    attempts.length === 0
      ? 0
      : Math.round((attempts.filter((item) => item.correct).length / attempts.length) * 100);
  const reviewQueue = useMemo(
    () => buildReviewQueue(latestStudentModel, problems),
    [latestStudentModel]
  );
  const modelRemainingReviewConcepts = scope.mode === "review"
    ? reviewQueue.dueConcepts.filter((concept) => scope.reviewConcepts.includes(concept))
    : [];
  const remainingReviewConcepts =
    scope.mode === "review" && attempts.length === 0 && modelRemainingReviewConcepts.length === 0
      ? scope.reviewConcepts
      : modelRemainingReviewConcepts;
  const completedReviewConcepts = scope.mode === "review"
    ? scope.reviewConcepts.filter((concept) => !remainingReviewConcepts.includes(concept))
    : [];
  const reviewSessionComplete = scope.mode === "review" && attempts.length > 0 && remainingReviewConcepts.length === 0;

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="masthead">
          <div>
            <p className="eyebrow">Adaptive Math Learning</p>
            <h1 className="page-title">Adaptive Practice</h1>
            <p className="page-subtitle">
              {scope.mode === "review"
                ? "Review due concepts from the student model before moving forward."
                : "Choose Pre-Algebra or AMC8 chapters, then practice from a scoped adaptive problem pool."}
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/diagnostic">
              Diagnostic
            </Link>
            <Link className="button-secondary" href="/">
              Courses
            </Link>
            <Link className="button-secondary" href="/dashboard">
              Dashboard
            </Link>
            <button className="button" onClick={resetSession}>
              Reset
            </button>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Attempts" value={String(attempts.length)} />
          <Metric label="Accuracy" value={`${accuracy}%`} />
          <Metric label="Problem Pool" value={String(scopedProblems.length)} />
        </section>

        <section className="panel full-panel scope-panel">
          <div>
            <p className="eyebrow">{scope.mode === "review" ? "Review Queue" : "Practice Scope"}</p>
            <h2 className="panel-title">
              {scope.mode === "review" ? "Due concept range" : "Course and chapter range"}
            </h2>
            {scope.mode === "review" && (
              <p className="muted">
                {reviewSessionComplete
                  ? "This review set is clear. The student model has moved these concepts into the next review window."
                  : `Reviewing: ${scope.reviewConcepts.length ? scope.reviewConcepts.join(", ") : "student model focus concepts"}`}
              </p>
            )}
          </div>
          {scope.mode === "review" ? (
            <div className="review-scope-actions">
              <div className="tag-row">
                {scope.reviewConcepts.map((concept) => (
                  <span className="tag tag-teal" key={concept}>
                    {concept}
                  </span>
                ))}
              </div>
              <Link className="button-secondary" href="/practice">
                Return to regular practice
              </Link>
            </div>
          ) : (
            <>
              <div className="scope-grid">
                <label className="field-label" htmlFor="scope-course">
                  Course
                  <select
                    className="select-input"
                    id="scope-course"
                    onChange={(event) => updateScope({
                      ...scope,
                      course: event.target.value,
                      mode: "practice",
                      reviewConcepts: [],
                      theme: ALL,
                      chapter: ALL
                    })}
                    value={scope.course}
                  >
                    <option value={ALL}>All courses</option>
                    {catalog.courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-theme">
                  Theme
                  <select
                    className="select-input"
                    id="scope-theme"
                    onChange={(event) => updateScope({
                      ...scope,
                      mode: "practice",
                      reviewConcepts: [],
                      theme: event.target.value,
                      chapter: ALL
                    })}
                    value={scope.theme}
                  >
                    <option value={ALL}>All themes</option>
                    {unique(availableThemes).map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-chapter">
                  Chapter
                  <select
                    className="select-input"
                    id="scope-chapter"
                    onChange={(event) => updateScope({ ...scope, mode: "practice", reviewConcepts: [], chapter: event.target.value })}
                    value={scope.chapter}
                  >
                    <option value={ALL}>All chapters</option>
                    {availableChapters.map((chapter) => (
                      <option key={chapter.chapter} value={chapter.chapter}>
                        {chapter.chapterTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-min-difficulty">
                  Min difficulty
                  <select
                    className="select-input"
                    id="scope-min-difficulty"
                    onChange={(event) => updateScope({
                      ...scope,
                      minDifficulty: Number(event.target.value)
                    })}
                    value={scope.minDifficulty}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-max-difficulty">
                  Max difficulty
                  <select
                    className="select-input"
                    id="scope-max-difficulty"
                    onChange={(event) => updateScope({
                      ...scope,
                      maxDifficulty: Number(event.target.value)
                    })}
                    value={scope.maxDifficulty}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-label" htmlFor="scope-auto-gradable">
                  <input
                    checked={scope.autoGradableOnly}
                    id="scope-auto-gradable"
                    onChange={(event) => updateScope({
                      ...scope,
                      autoGradableOnly: event.target.checked
                    })}
                    type="checkbox"
                  />
                  Auto-gradable only
                </label>
              </div>
              <div className="chapter-strip">
                {availableChapters.slice(0, 8).map((chapter) => (
                  <button
                    className={`chapter-pill ${scope.chapter === chapter.chapter ? "chapter-pill-active" : ""}`}
                    key={chapter.chapter}
                    onClick={() => updateScope({ ...scope, mode: "practice", reviewConcepts: [], chapter: chapter.chapter })}
                  >
                    <span>{chapter.chapterTitle}</span>
                    <strong>{chapter.count}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="content-grid">
          <div className="panel">
            {scopedProblems.length === 0 ? (
              <div className="empty-state">
                <h2 className="panel-title">No problems in this range</h2>
                <p className="muted">
                  Broaden the course, chapter, or difficulty filters to continue.
                </p>
              </div>
            ) : (
              <>
                <div className="tag-row">
                  <span className="tag">
                    {currentProblem.id}
                  </span>
                  <span className="tag tag-gold">
                    Difficulty {currentProblem.difficulty}
                  </span>
                  <span className="tag">
                    {currentProblem.answerType}
                  </span>
                  <span className="tag">
                    {currentProblem.curriculum.course}
                  </span>
                  <span className="tag">
                    {currentProblem.curriculum.chapterTitle}
                  </span>
                  {currentProblem.concepts.map((concept) => (
                    <span className="tag tag-teal" key={concept}>
                      {concept}
                    </span>
                  ))}
                </div>

                <h2 className="problem-text">{currentProblem.statement}</h2>

                <form className="answer-form" onSubmit={submitAnswer}>
                  <input
                    className="answer-input"
                    disabled={Boolean(pendingNextProblem)}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Enter your answer"
                    value={answer}
                  />
                  <label className="confidence-control" htmlFor="practice-confidence">
                    Confidence
                    <select
                      className="select-input"
                      disabled={Boolean(pendingNextProblem)}
                      id="practice-confidence"
                      onChange={(event) => setConfidence(Number(event.target.value))}
                      value={confidence}
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button" disabled={Boolean(pendingNextProblem)} type="submit">
                    Submit
                  </button>
                </form>
              </>
            )}

            {feedback && (
              <div
                className={`feedback ${
                  feedback.correct
                    ? "feedback-success"
                    : "feedback-error"
                }`}
              >
                <div className="feedback-title">
                  {feedback.correct ? "Correct" : "Not yet"}
                </div>
                <div>
                  Your answer: {feedback.submittedAnswer} · Expected: {feedback.problem.answer}
                </div>
                <div>
                  Signal: {feedback.responseTimeSeconds}s · Confidence {feedback.confidence}/5
                </div>
                <div>Check: {feedback.answerReason}</div>
                <div>Solution note: {feedback.problem.solution}</div>
                <div>{feedback.recommendationReason}</div>
                {reviewSessionComplete && (
                  <div className="review-complete-actions">
                    <Link className="button" href="/dashboard">
                      View updated model
                    </Link>
                    <Link className="button-secondary" href="/practice">
                      Continue practice
                    </Link>
                  </div>
                )}
                {pendingNextProblem && (
                  <button className="button feedback-action" onClick={goToNextProblem}>
                    Next problem: {pendingNextProblem.id}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="panel">
            <h2 className="panel-title">Scope and Mastery</h2>
            {scope.mode === "review" && (
              <div className={`review-status ${reviewSessionComplete ? "review-status-complete" : ""}`}>
                <p className="eyebrow">Review Progress</p>
                <h3>{reviewSessionComplete ? "Review complete" : `${remainingReviewConcepts.length} concept(s) still active`}</h3>
                <p>
                  {reviewSessionComplete
                    ? "Correct review work has pushed these concepts out of the due queue."
                    : "Answer review items to update stability, wrong streak, and next review timing."}
                </p>
                <div className="tag-row">
                  {remainingReviewConcepts.map((concept) => (
                    <span className="tag tag-gold" key={concept}>
                      {concept}
                    </span>
                  ))}
                  {completedReviewConcepts.map((concept) => (
                    <span className="tag tag-teal" key={concept}>
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="schema-note">
              <strong>Selected:</strong>{" "}
                {[
                  scope.mode === "review" ? "review" : "",
                  scope.course,
                  scope.theme,
                  scope.chapter,
                  scope.reviewConcepts.join(", ")
                ]
                .filter((item) => item !== ALL)
                .filter(Boolean)
                .join(" / ") || "all available content"}
            </div>
            <div className="schema-note">
              <strong>Prerequisites:</strong>{" "}
              {currentProblem.prerequisiteConcepts.length
                ? currentProblem.prerequisiteConcepts.join(", ")
                : "none tagged"}
            </div>
            <div className="mastery-list">
              {masteryEntries.length === 0 && (
                <p className="muted">Submit an answer to start building a profile.</p>
              )}
              {masteryEntries.map(([concept, score]) => (
                <div className="mastery-row" key={concept}>
                  <div className="mastery-head">
                    <span>{concept}</span>
                    <span>{Math.round(score * 100)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="panel full-panel">
          <h2 className="panel-title">Recent Trajectory</h2>
          <div className="trajectory-list">
            {attempts.length === 0 && (
              <p className="muted">No attempts yet.</p>
            )}
            {attempts.slice(0, 6).map((item, index) => (
              <div className="trajectory-card" key={`${item.problem.id}-${index}`}>
                <div className="trajectory-head">
                  <div><strong>{item.problem.id}</strong></div>
                  <div className={item.correct ? "status-good" : "status-bad"}>
                    {item.correct ? "Correct" : "Wrong"}
                  </div>
                </div>
                <div className="muted">{item.problem.statement}</div>
                <div className="muted">
                  Weak concepts: {item.weakConcepts.length ? item.weakConcepts.join(", ") : "none"}
                </div>
                <div className="muted">
                  Fluency focus: {item.fluencyConcepts.length ? item.fluencyConcepts.join(", ") : "none"}
                </div>
                <div className="muted">
                  Signal: {item.responseTimeSeconds}s · Confidence {item.confidence}/5
                </div>
                {item.remediation && (
                  <div className="status-warn">Remediation triggered</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildCatalog(items: Problem[]) {
  const courses = unique(items.map((problem) => problem.curriculum.course));
  const themes = uniqueBy(
    items.map((problem) => ({
      course: problem.curriculum.course,
      theme: problem.curriculum.theme
    })),
    (item) => `${item.course}:${item.theme}`
  );
  const chapters = uniqueBy(
    items.map((problem) => ({
      course: problem.curriculum.course,
      theme: problem.curriculum.theme,
      chapter: problem.curriculum.chapter,
      chapterTitle: problem.curriculum.chapterTitle,
      sequence: problem.curriculum.sequence,
      count: items.filter((item) => item.curriculum.chapter === problem.curriculum.chapter).length
    })),
    (item) => item.chapter
  ).sort((a, b) => a.course.localeCompare(b.course) || a.sequence - b.sequence);

  return { courses, themes, chapters };
}

function filterProblems(items: Problem[], scope: ScopeFilters) {
  if (scope.mode === "review") {
    const reviewProblems = selectReviewProblems(scope.reviewConcepts, items);
    return reviewProblems.length > 0 ? reviewProblems : items.filter((problem) => problem.isAutoGradable);
  }

  const minDifficulty = Math.min(scope.minDifficulty, scope.maxDifficulty);
  const maxDifficulty = Math.max(scope.minDifficulty, scope.maxDifficulty);

  return items.filter((problem) => {
    if (scope.course !== ALL && problem.curriculum.course !== scope.course) return false;
    if (scope.theme !== ALL && problem.curriculum.theme !== scope.theme) return false;
    if (scope.chapter !== ALL && problem.curriculum.chapter !== scope.chapter) return false;
    if (scope.autoGradableOnly && !problem.isAutoGradable) return false;

    return problem.difficulty >= minDifficulty && problem.difficulty <= maxDifficulty;
  });
}

function scopeFromLocation(): ScopeFilters {
  if (typeof window === "undefined") return defaultScope;

  const searchParams = new URLSearchParams(window.location.search);

  return {
    mode: searchParams.get("mode") === "review" ? "review" : defaultScope.mode,
    reviewConcepts: splitConcepts(searchParams.get("concepts")),
    course: searchParams.get("course") || defaultScope.course,
    theme: searchParams.get("theme") || defaultScope.theme,
    chapter: searchParams.get("chapter") || defaultScope.chapter,
    minDifficulty: toDifficulty(searchParams.get("minDifficulty"), defaultScope.minDifficulty),
    maxDifficulty: toDifficulty(searchParams.get("maxDifficulty"), defaultScope.maxDifficulty),
    autoGradableOnly: searchParams.get("autoGradableOnly") !== "false"
  };
}

function toDifficulty(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : fallback;
}

function splitConcepts(value: string | null) {
  return value ? value.split(",").map((concept) => concept.trim()).filter(Boolean) : [];
}

function scopesEqual(left: ScopeFilters, right: ScopeFilters) {
  return (
    left.course === right.course &&
    left.mode === right.mode &&
    left.reviewConcepts.join(",") === right.reviewConcepts.join(",") &&
    left.theme === right.theme &&
    left.chapter === right.chapter &&
    left.minDifficulty === right.minDifficulty &&
    left.maxDifficulty === right.maxDifficulty &&
    left.autoGradableOnly === right.autoGradableOnly
  );
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function secondsSince(startedAt: number) {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
