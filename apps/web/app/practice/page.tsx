"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import conceptsData from "../../data/concepts.json";
import explanationsData from "../../data/exampleExplanations.json";
import problemsData from "../../data/problems.json";
import { AdaptiveEngine, buildConceptGraph, checkProblemAnswer, Problem, StudentState, type AnswerChoice, type ConceptNode, type PrerequisiteGap, type RecommendationContext, type RecommendationExplanation } from "../../../../packages/adaptive-engine";
import { buildLearningPlan } from "../shared/learningPlan";
import { assessExplanationQuality, summarizeExplanationQuality, type ExampleExplanation } from "../shared/explanationQuality";
import { buildReviewQueue, selectReviewProblems } from "../shared/reviewQueue";
import { clearPracticeLogs, createPracticeLog, readPracticeLogs, readStudentModel, writeLearningPlan, writePracticeLogs, writeStudentModel } from "../shared/storage";
import { updateStudentModel, type StudentModel } from "../shared/studentModel";

type AttemptLog = {
  problem: Problem;
  submittedAnswer: string;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts: string[];
  prerequisiteGaps: PrerequisiteGap[];
  remediation: boolean;
  recommendationReason: string;
  recommendationExplanation?: RecommendationExplanation;
  answerReason: string;
  responseTimeSeconds: number;
  confidence: number;
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Problem["distractors"] extends Array<infer T> ? T : never;
  explanation?: ExampleExplanation;
};

type PracticeSessionReport = {
  status: "Ready" | "Developing" | "Needs Repair";
  title: string;
  summary: string;
  accuracy: number;
  correctCount: number;
  totalCount: number;
  averageTimeSeconds: number;
  averageConfidence: number;
  focusConcepts: string[];
  strongConcepts: string[];
  nextTitle: string;
  nextReason: string;
  nextHref: string;
  secondaryTitle: string;
  secondaryHref: string;
};

const problems = problemsData as Problem[];
const explanations = explanationsData as Record<string, ExampleExplanation>;
const conceptGraph = buildConceptGraph(conceptsData as ConceptNode[]);
const initialState: StudentState = { mastery: {}, history: [] };
const ALL = "all";
const DEFAULT_PRACTICE_SESSION_LENGTH = 10;

type ScopeFilters = {
  mode: "practice" | "review" | "plan";
  problemId: string;
  sessionTitle: string;
  sessionGoal: string;
  sessionSource: string;
  returnHref: string;
  reviewConcepts: string[];
  planConcepts: string[];
  maxItems: number;
  course: string;
  theme: string;
  chapter: string;
  minDifficulty: number;
  maxDifficulty: number;
  taxonomyLayer: string;
  taxonomyStage: string;
  problemType: string;
  cognitiveTag: string;
  autoGradableOnly: boolean;
};

const defaultScope: ScopeFilters = {
  mode: "practice",
  problemId: "",
  sessionTitle: "",
  sessionGoal: "",
  sessionSource: "",
  returnHref: "",
  reviewConcepts: [],
  planConcepts: [],
  maxItems: 0,
  course: ALL,
  theme: ALL,
  chapter: ALL,
  minDifficulty: 1,
  maxDifficulty: 5,
  taxonomyLayer: ALL,
  taxonomyStage: ALL,
  problemType: ALL,
  cognitiveTag: ALL,
  autoGradableOnly: true
};

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticeLoading />}>
      <PracticeClient />
    </Suspense>
  );
}

function PracticeClient() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const urlScope = useMemo(() => scopeFromSearchParams(searchParams), [searchKey]);
  const [studentState, setStudentState] = useState<StudentState>(initialState);
  const [scope, setScope] = useState<ScopeFilters>(urlScope);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [feedback, setFeedback] = useState<AttemptLog | null>(null);
  const [pendingNextProblem, setPendingNextProblem] = useState<Problem | null>(null);
  const [latestStudentModel, setLatestStudentModel] = useState<StudentModel | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [showRecentTrajectory, setShowRecentTrajectory] = useState(false);
  const [problemStartedAt, setProblemStartedAt] = useState(() => Date.now());
  const catalog = useMemo(() => buildCatalog(problems), []);
  const taxonomyBaseProblems = useMemo(() => filterTaxonomyBaseProblems(problems, scope), [scope]);
  const qualityStats = useMemo(() => buildQualityStats(taxonomyBaseProblems), [taxonomyBaseProblems]);
  const scopedProblems = useMemo(() => filterProblems(problems, scope), [scope]);
  const engine = useMemo(() => new AdaptiveEngine(scopedProblems, conceptGraph), [scopedProblems]);
  const [currentProblem, setCurrentProblem] = useState<Problem>(scopedProblems[0] ?? problems[0]);

  useEffect(() => {
    setLatestStudentModel(readStudentModel());
  }, []);

  useEffect(() => {
    if (!scopesEqual(scope, urlScope)) {
      setScope(urlScope);
      restartWithScope(urlScope);
    }
  }, [urlScope]);

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

    const answerCheck = checkProblemAnswer({
      submitted: answer,
      expected: currentProblem.answer,
      choices: currentProblem.choices,
      distractors: currentProblem.distractors
    });
    const correct = answerCheck.correct;
    const explanation = getExplanation(currentProblem);
    const responseTimeSeconds = secondsSince(problemStartedAt);
    const currentStudentModel = readStudentModel();
    const currentLearningPlan = buildLearningPlan(readPracticeLogs(), problems, currentStudentModel);
    const recommendationContext = buildRecommendationContext(currentStudentModel, currentLearningPlan, scope);
    const result = engine.run(studentState, {
      problem: currentProblem,
      correct,
      responseTimeSeconds,
      confidence,
      recommendationContext
    });
    const recommendationReason = result.recommendation.reason;
    const persistedLog = createPracticeLog({
      step: attempts.length,
      problem: currentProblem,
      selectedChoiceLabel: answerCheck.selectedChoiceLabel,
      selectedChoiceValue: answerCheck.selectedChoiceValue,
      selectedDistractor: answerCheck.selectedDistractor,
      correct,
      weakConcepts: result.weak_concepts,
      fluencyConcepts: result.fluency_concepts,
      prerequisiteGaps: simplifyPrerequisiteGaps(result.prerequisite_gaps),
      remediation: result.remediation,
      nextProblem: result.next_problem,
      mastery: result.updated_state.mastery,
      recommendationReason,
      recommendationExplanation: result.recommendation.explanation,
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
      prerequisiteGaps: result.prerequisite_gaps,
      remediation: result.remediation,
      recommendationReason,
      recommendationExplanation: result.recommendation.explanation,
      answerReason: answerCheck.reason,
      responseTimeSeconds,
      confidence,
      selectedChoiceLabel: answerCheck.selectedChoiceLabel,
      selectedChoiceValue: answerCheck.selectedChoiceValue,
      selectedDistractor: answerCheck.selectedDistractor,
      explanation
    };

    const nextLogs = [...readPracticeLogs(), persistedLog];
    const nextStudentModel = updateStudentModel(currentStudentModel, {
      problem: currentProblem,
      correct,
      mastery: result.updated_state.mastery,
      selectedDistractor: answerCheck.selectedDistractor,
      responseTimeSeconds,
      confidence
    });
    const nextPlan = buildLearningPlan(nextLogs, problems, nextStudentModel);
    const nextReviewQueue = buildReviewQueue(nextStudentModel, problems);
    const remainingReviewConcepts = scope.mode === "review"
      ? nextReviewQueue.dueConcepts.filter((concept) => scope.reviewConcepts.includes(concept))
      : [];
    const reviewNowComplete = scope.mode === "review" && remainingReviewConcepts.length === 0;
    const planNowComplete = scope.mode === "plan" && scope.maxItems > 0 && attempts.length + 1 >= scope.maxItems;
    const practiceNowComplete = scope.mode === "practice" && attempts.length + 1 >= getPracticeSessionTarget(scopedProblems.length);
    const sessionNowComplete = reviewNowComplete || planNowComplete || practiceNowComplete;

    setStudentState(result.updated_state);
    setAttempts((current) => [nextAttempt, ...current]);
    writePracticeLogs(nextLogs);
    writeStudentModel(nextStudentModel);
    writeLearningPlan(nextPlan);
    setLatestStudentModel(nextStudentModel);
    setFeedback(nextAttempt);
    setPendingNextProblem(sessionNowComplete ? null : result.next_problem);
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
  const availableLayers = qualityStats.layers.map((item) => item.key);
  const availableStages = qualityStats.stages.map((item) => item.key);
  const availableProblemTypes = qualityStats.problemTypes.map((item) => item.key);
  const availableCognitiveTags = qualityStats.cognitiveTags.map((item) => item.key);
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
  const planSessionComplete = scope.mode === "plan" && scope.maxItems > 0 && attempts.length >= scope.maxItems;
  const practiceSessionTarget = getPracticeSessionTarget(scopedProblems.length);
  const practiceSessionComplete = scope.mode === "practice" && attempts.length >= practiceSessionTarget;
  const sessionComplete = reviewSessionComplete || planSessionComplete || practiceSessionComplete;
  const sessionReport = useMemo(
    () => buildPracticeSessionReport(attempts, scope, latestStudentModel),
    [attempts, scope, latestStudentModel]
  );
  const sessionOverview = useMemo(
    () => buildSessionOverview(scope, {
      attempts: attempts.length,
      poolSize: scopedProblems.length,
      practiceTarget: practiceSessionTarget,
      remainingReviewConcepts: remainingReviewConcepts.length
    }),
    [attempts.length, practiceSessionTarget, remainingReviewConcepts.length, scope, scopedProblems.length]
  );

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
                : scope.mode === "plan"
                  ? "Work through a focused mini session generated from the latest diagnostic report."
                : "Choose Pre-Algebra or AMC8 chapters, then practice from a scoped adaptive problem pool."}
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/login">
              Login
            </Link>
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
          <Metric
            label={scope.mode === "practice" ? "Session Target" : "Problem Pool"}
            value={scope.mode === "practice" ? `${Math.min(attempts.length, practiceSessionTarget)}/${practiceSessionTarget}` : String(scopedProblems.length)}
          />
        </section>

        {sessionComplete && sessionReport && (
          <PracticeSessionSummary report={sessionReport} resetSession={resetSession} returnHref={scope.returnHref} />
        )}

        <SessionFlowPanel
          overview={sessionOverview}
          resetSession={resetSession}
          returnHref={scope.returnHref}
          sessionComplete={sessionComplete}
        />

        <section className="panel full-panel scope-panel">
          <div>
            <p className="eyebrow">
              {scope.mode === "review" ? "Review Queue" : scope.mode === "plan" ? "Diagnostic Handoff" : "Practice Scope"}
            </p>
            <h2 className="panel-title">
              {scope.mode === "review"
                ? "Due concept range"
                : scope.mode === "plan"
                  ? "Personalized mini session"
                  : "Course and chapter range"}
            </h2>
            {scope.mode === "review" && (
              <p className="muted">
                {reviewSessionComplete
                  ? "This review set is clear. The student model has moved these concepts into the next review window."
                  : `Reviewing: ${scope.reviewConcepts.length ? scope.reviewConcepts.join(", ") : "student model focus concepts"}`}
              </p>
            )}
            {scope.mode === "plan" && (
              <p className="muted">
                {planSessionComplete
                  ? "This personalized mini session is complete. Check the dashboard for the updated report and next recommendation."
                  : `Targeting: ${scope.planConcepts.length ? scope.planConcepts.join(", ") : "balanced diagnostic follow-up"}`}
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
          ) : scope.mode === "plan" ? (
            <div className="review-scope-actions">
              <div className="tag-row">
                {scope.planConcepts.map((concept) => (
                  <span className="tag tag-teal" key={concept}>
                    {concept}
                  </span>
                ))}
                {scope.maxItems > 0 && <span className="tag tag-gold">{Math.min(attempts.length, scope.maxItems)}/{scope.maxItems}</span>}
              </div>
              <div className="learning-plan-actions">
                <Link className="button-secondary" href="/dashboard">
                  Open dashboard
                </Link>
                <Link className="button-secondary" href="/practice">
                  Switch to regular practice
                </Link>
              </div>
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
                      chapter: ALL,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      cognitiveTag: ALL
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
                      chapter: ALL,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      cognitiveTag: ALL
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
                    onChange={(event) => updateScope({
                      ...scope,
                      mode: "practice",
                      reviewConcepts: [],
                      chapter: event.target.value,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      cognitiveTag: ALL
                    })}
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
                <label className="field-label" htmlFor="scope-taxonomy-layer">
                  Difficulty layer
                  <select
                    className="select-input"
                    id="scope-taxonomy-layer"
                    onChange={(event) => updateScope({ ...scope, taxonomyLayer: event.target.value })}
                    value={scope.taxonomyLayer}
                  >
                    <option value={ALL}>All layers</option>
                    {availableLayers.map((layer) => (
                      <option key={layer} value={layer}>
                        {layer}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-taxonomy-stage">
                  Adaptive stage
                  <select
                    className="select-input"
                    id="scope-taxonomy-stage"
                    onChange={(event) => updateScope({ ...scope, taxonomyStage: event.target.value })}
                    value={scope.taxonomyStage}
                  >
                    <option value={ALL}>All stages</option>
                    {availableStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-problem-type">
                  Problem type
                  <select
                    className="select-input"
                    id="scope-problem-type"
                    onChange={(event) => updateScope({ ...scope, problemType: event.target.value })}
                    value={scope.problemType}
                  >
                    <option value={ALL}>All types</option>
                    {availableProblemTypes.map((problemType) => (
                      <option key={problemType} value={problemType}>
                        {formatTaxonomyLabel(problemType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-cognitive-tag">
                  Cognitive tag
                  <select
                    className="select-input"
                    id="scope-cognitive-tag"
                    onChange={(event) => updateScope({ ...scope, cognitiveTag: event.target.value })}
                    value={scope.cognitiveTag}
                  >
                    <option value={ALL}>All cognitive tags</option>
                    {availableCognitiveTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {formatTaxonomyLabel(tag)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <QualityStatsPanel
                activeCount={scopedProblems.length}
                stats={qualityStats}
              />
              <div className="chapter-strip">
                {availableChapters.slice(0, 8).map((chapter) => (
                  <button
                    className={`chapter-pill ${scope.chapter === chapter.chapter ? "chapter-pill-active" : ""}`}
                    key={chapter.chapter}
                    onClick={() => updateScope({
                      ...scope,
                      mode: "practice",
                      reviewConcepts: [],
                      chapter: chapter.chapter,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      cognitiveTag: ALL
                    })}
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
            ) : sessionComplete ? (
              <div className="empty-state">
                <p className="eyebrow">Mini Session Complete</p>
                <h2 className="panel-title">Review the feedback before choosing the next step</h2>
                <p className="muted">
                  This practice set has ended, so the app will stop recommending more problems from the same loop.
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
                  {currentProblem.taxonomy && (
                    <>
                      <span className="tag tag-gold">
                        {currentProblem.taxonomy.layer}
                      </span>
                      <span className="tag">
                        {currentProblem.taxonomy.problemType}
                      </span>
                    </>
                  )}
                  {currentProblem.concepts.map((concept) => (
                    <span className="tag tag-teal" key={concept}>
                      {concept}
                    </span>
                  ))}
                </div>

                <h2 className="problem-text">{currentProblem.statement}</h2>
                <ProblemAssets problem={currentProblem} />

                <form className="answer-form" onSubmit={submitAnswer}>
                  {isMultipleChoice(currentProblem) && (
                    <div className="choice-grid">
                      {normalizeChoices(currentProblem.choices).map((choice) => (
                        <button
                          className={`choice-button ${answer === choice.label ? "choice-button-selected" : ""}`}
                          disabled={Boolean(pendingNextProblem) || sessionComplete}
                          key={choice.label}
                          onClick={() => setAnswer(choice.label)}
                          type="button"
                        >
                          <strong>{choice.label}</strong>
                          <span>{choice.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    className="answer-input"
                    disabled={Boolean(pendingNextProblem) || sessionComplete}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={isMultipleChoice(currentProblem) ? "Choose an option or type A-E" : "Enter your answer"}
                    value={answer}
                  />
                  <label className="confidence-control" htmlFor="practice-confidence">
                    Confidence
                    <select
                      className="select-input"
                      disabled={Boolean(pendingNextProblem) || sessionComplete}
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
                  <button className="button" disabled={Boolean(pendingNextProblem) || sessionComplete} type="submit">
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
                {feedback.selectedChoiceLabel && (
                  <div>
                    Selected choice: {feedback.selectedChoiceLabel} · {feedback.selectedChoiceValue}
                  </div>
                )}
                {feedback.selectedDistractor && (
                  <div>
                    Distractor signal: {feedback.selectedDistractor.misconception} · {feedback.selectedDistractor.cognitiveTag}
                  </div>
                )}
                <div>
                  Signal: {feedback.responseTimeSeconds}s · Confidence {feedback.confidence}/5
                </div>
                {feedback.prerequisiteGaps.length > 0 && (
                  <div>
                    Gap: {feedback.prerequisiteGaps[0].concept} before {feedback.prerequisiteGaps[0].targetConcept}
                  </div>
                )}
                <div>Check: {feedback.answerReason}</div>
                <LearningNotes
                  correct={feedback.correct}
                  distractorExplanation={feedback.selectedDistractor?.explanation}
                  explanation={feedback.explanation}
                  problem={feedback.problem}
                  solution={feedback.problem.solution}
                />
                <div>{feedback.recommendationReason}</div>
                {feedback.recommendationExplanation && (
                  <div>
                    Recommendation v1.5: {[
                      feedback.recommendationExplanation.nextAction,
                      feedback.recommendationExplanation.abilityTarget,
                      feedback.recommendationExplanation.pathMode,
                      feedback.recommendationExplanation.pathStep
                    ].filter(Boolean).join(" · ")}
                  </div>
                )}
                {feedback.problem.taxonomy && (
                  <div>
                    Taxonomy: {feedback.problem.taxonomy.layer} · {feedback.problem.taxonomy.problemType} · {feedback.problem.taxonomy.cognitiveTags.slice(0, 2).join(", ")}
                  </div>
                )}
                {reviewSessionComplete && (
                  <div className="review-complete-actions">
                    {scope.returnHref && (
                      <Link className="button" href={scope.returnHref}>
                        Back to Student Home
                      </Link>
                    )}
                    <Link className="button" href="/dashboard">
                      View updated model
                    </Link>
                    <Link className="button-secondary" href="/practice">
                      Continue practice
                    </Link>
                  </div>
                )}
                {planSessionComplete && (
                  <div className="review-complete-actions">
                    {scope.returnHref && (
                      <Link className="button" href={scope.returnHref}>
                        Back to Student Home
                      </Link>
                    )}
                    <Link className="button" href="/dashboard">
                      View updated report
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
            {scope.mode === "plan" && (
              <div className={`review-status ${planSessionComplete ? "review-status-complete" : ""}`}>
                <p className="eyebrow">Mini Session</p>
                <h3>{planSessionComplete ? "Plan complete" : `${Math.max((scope.maxItems || 0) - attempts.length, 0)} item(s) remaining`}</h3>
                <p>
                  {planSessionComplete
                    ? "The student model has new evidence from the diagnostic follow-up."
                    : "This set is scoped to the diagnostic report target concepts."}
                </p>
              </div>
            )}
            <div className="schema-note">
              <strong>Selected:</strong>{" "}
                {[
                  scope.mode === "review" ? "review" : "",
                  scope.mode === "plan" ? "plan" : "",
                  scope.course,
                  scope.theme,
                  scope.chapter,
                  scope.taxonomyLayer,
                  scope.taxonomyStage,
                  scope.problemType,
                  scope.cognitiveTag,
                  scope.reviewConcepts.join(", "),
                  scope.planConcepts.join(", ")
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
          <div className="collapsible-panel-head">
            <div>
              <h2 className="panel-title compact-title">Recent Trajectory</h2>
              <p className="muted">
                {attempts.length
                  ? `${attempts.length} attempts in this session · showing latest first`
                  : "No attempts yet."}
              </p>
            </div>
            <button
              className="button-secondary compact-toggle"
              onClick={() => setShowRecentTrajectory((current) => !current)}
              type="button"
            >
              {showRecentTrajectory ? "Collapse" : "Show details"}
            </button>
          </div>

          {!showRecentTrajectory && attempts[0] && (
            <div className="trajectory-summary-card">
              <div className="trajectory-head">
                <div><strong>{attempts[0].problem.id}</strong></div>
                <div className={attempts[0].correct ? "status-good" : "status-bad"}>
                  {attempts[0].correct ? "Correct" : "Wrong"}
                </div>
              </div>
              <p className="muted">{attempts[0].problem.statement}</p>
              <p className="muted">
                Weak concepts: {attempts[0].weakConcepts.length ? attempts[0].weakConcepts.join(", ") : "none"}
              </p>
            </div>
          )}

          {showRecentTrajectory && (
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
                    Prerequisite gaps: {item.prerequisiteGaps.length
                      ? item.prerequisiteGaps.slice(0, 2).map((gap) => `${gap.concept} -> ${gap.targetConcept}`).join(", ")
                      : "none"}
                  </div>
                  <div className="muted">
                    Signal: {item.responseTimeSeconds}s · Confidence {item.confidence}/5
                  </div>
                  {item.remediation && (
                    <div className="status-warn">Remediation triggered</div>
                  )}
                  {item.recommendationExplanation && (
                    <div className="muted">
                      Recommendation v1.5: {[
                        item.recommendationExplanation.nextAction,
                        item.recommendationExplanation.abilityTarget,
                        item.recommendationExplanation.pathMode
                      ].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PracticeLoading() {
  return (
    <main className="app-shell">
      <div className="app-container">
        <section className="panel">
          <p className="eyebrow">Adaptive Math Learning</p>
          <h1 className="page-title">Loading Practice</h1>
          <p className="page-subtitle">Preparing the selected practice range.</p>
        </section>
      </div>
    </main>
  );
}

type SessionOverview = {
  eyebrow: string;
  title: string;
  goal: string;
  source: string;
  progressLabel: string;
  progressPercent: number;
  targetLabel: string;
  poolLabel: string;
  nextCheckpoint: string;
};

function SessionFlowPanel({
  overview,
  resetSession,
  returnHref,
  sessionComplete
}: {
  overview: SessionOverview;
  resetSession: () => void;
  returnHref: string;
  sessionComplete: boolean;
}) {
  return (
    <section className={`panel full-panel session-flow-panel ${sessionComplete ? "session-flow-complete" : ""}`}>
      <div className="session-flow-main">
        <div>
          <p className="eyebrow">{overview.eyebrow}</p>
          <h2 className="panel-title">{overview.title}</h2>
          <p className="session-flow-goal">{overview.goal}</p>
        </div>
        <div className="session-flow-actions">
          {returnHref && (
            <Link className="button-secondary" href={returnHref}>
              Student Home
            </Link>
          )}
          <Link className="button-secondary" href="/dashboard">
            Dashboard
          </Link>
          <button className="button-secondary" onClick={resetSession}>
            Restart session
          </button>
        </div>
      </div>
      <div className="session-flow-progress" aria-label={overview.progressLabel}>
        <div className="session-flow-progress-head">
          <strong>{overview.progressLabel}</strong>
          <span>{overview.progressPercent}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${overview.progressPercent}%` }} />
        </div>
      </div>
      <div className="session-flow-grid">
        <SessionFlowStat label="Target" value={overview.targetLabel} />
        <SessionFlowStat label="Pool" value={overview.poolLabel} />
        <SessionFlowStat label="Source" value={overview.source} />
        <SessionFlowStat label="Checkpoint" value={overview.nextCheckpoint} />
      </div>
    </section>
  );
}

function SessionFlowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="session-flow-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PracticeSessionSummary({
  report,
  resetSession,
  returnHref
}: {
  report: PracticeSessionReport;
  resetSession: () => void;
  returnHref: string;
}) {
  return (
    <section className={`panel full-panel session-summary session-summary-${statusClass(report.status)}`}>
      <div className="summary-header">
        <div>
          <p className="eyebrow">Practice Feedback</p>
          <h2 className="panel-title">{report.title}</h2>
        </div>
        <div className="summary-score">{report.accuracy}%</div>
      </div>
      <p className="summary-recommendation">{report.summary}</p>

      <div className="graph-stat-grid">
        <SessionStat label="Correct" value={`${report.correctCount}/${report.totalCount}`} />
        <SessionStat label="Average Time" value={`${report.averageTimeSeconds}s`} />
        <SessionStat label="Confidence" value={`${report.averageConfidence}/5`} />
        <SessionStat label="Status" value={report.status} />
      </div>

      <div className="summary-grid">
        <div>
          <h3 className="summary-list-title">Focus before moving on</h3>
          <div className="summary-list">
            {report.focusConcepts.length === 0 && <p className="muted">No urgent focus concept was detected in this mini session.</p>}
            {report.focusConcepts.map((concept) => (
              <div className="summary-item summary-item-focus" key={concept}>
                <div>
                  <strong>{formatTaxonomyLabel(concept)}</strong>
                  <div className="muted">Use a short repair or transfer set next.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="summary-list-title">Ready signals</h3>
          <div className="summary-list">
            {report.strongConcepts.length === 0 && <p className="muted">Complete one more stable set to confirm strengths.</p>}
            {report.strongConcepts.map((concept) => (
              <div className="summary-item summary-item-secure" key={concept}>
                <div>
                  <strong>{formatTaxonomyLabel(concept)}</strong>
                  <div className="muted">Answered accurately in this session.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="next-step-panel">
        <div>
          <p className="eyebrow">Recommended Next Step</p>
          <h3>{report.nextTitle}</h3>
          <p>{report.nextReason}</p>
        </div>
        <div className="learning-plan-actions">
          <Link className="button" href={report.nextHref}>
            Start next step
          </Link>
          {returnHref && (
            <Link className="button-secondary" href={returnHref}>
              Back to Student Home
            </Link>
          )}
          <Link className="button-secondary" href={report.secondaryHref}>
            {report.secondaryTitle}
          </Link>
          <button className="button-secondary" onClick={resetSession}>
            Repeat this range
          </button>
        </div>
      </div>
    </section>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="graph-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProblemAssets({ problem }: { problem: Problem }) {
  const promptAssets = (problem.assets ?? []).filter((asset) => asset.type === "image" && asset.role !== "solution");
  if (promptAssets.length === 0) return null;

  return (
    <div className="problem-assets">
      {promptAssets.map((asset) => (
        <img
          alt={asset.alt}
          className="problem-asset-image"
          key={`${asset.role}-${asset.url}`}
          loading="lazy"
          src={asset.url}
        />
      ))}
    </div>
  );
}

function isMultipleChoice(problem: Problem) {
  return problem.answerType === "multiple_choice" && problem.choices.length > 0;
}

function normalizeChoices(choices: Problem["choices"]): AnswerChoice[] {
  return choices.map((choice, index) => {
    if (typeof choice !== "string") return choice;
    const label = String.fromCharCode(65 + index);

    return {
      label,
      value: choice,
      text: choice
    };
  });
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
  if (scope.problemId) {
    const exactProblem = items.find((problem) => problem.id === scope.problemId);
    if (exactProblem && !(scope.autoGradableOnly && !exactProblem.isAutoGradable)) return [exactProblem];
  }

  if (scope.mode === "review") {
    const reviewProblems = selectReviewProblems(scope.reviewConcepts, items);
    return reviewProblems.length > 0 ? reviewProblems : items.filter((problem) => problem.isAutoGradable);
  }

  if (scope.mode === "plan") {
    const eligibleProblems = items.filter((problem) => !(scope.autoGradableOnly && !problem.isAutoGradable));
    const conceptProblems = eligibleProblems
      .filter((problem) => {
        if (scope.planConcepts.length === 0) return true;

        return problem.concepts.some((concept) => scope.planConcepts.includes(concept));
      })
      .sort((a, b) => {
        const aMatch = a.concepts.filter((concept) => scope.planConcepts.includes(concept)).length;
        const bMatch = b.concepts.filter((concept) => scope.planConcepts.includes(concept)).length;

        return (
          layerRank(a.taxonomy?.layer) - layerRank(b.taxonomy?.layer) ||
          bMatch - aMatch ||
          a.difficulty - b.difficulty ||
          a.id.localeCompare(b.id)
        );
      });
    const prerequisiteFallback = eligibleProblems.filter((problem) =>
      problem.prerequisiteConcepts.some((concept) => scope.planConcepts.includes(concept))
    );
    const fallbackProblems = conceptProblems.length > 0
      ? conceptProblems
      : prerequisiteFallback.length > 0
        ? prerequisiteFallback
        : eligibleProblems;

    return fallbackProblems.slice(0, scope.maxItems || fallbackProblems.length);
  }

  const minDifficulty = Math.min(scope.minDifficulty, scope.maxDifficulty);
  const maxDifficulty = Math.max(scope.minDifficulty, scope.maxDifficulty);

  return items.filter((problem) => {
    if (scope.course !== ALL && problem.curriculum.course !== scope.course) return false;
    if (scope.theme !== ALL && problem.curriculum.theme !== scope.theme) return false;
    if (scope.chapter !== ALL && problem.curriculum.chapter !== scope.chapter) return false;
    if (scope.autoGradableOnly && !problem.isAutoGradable) return false;
    if (scope.taxonomyLayer !== ALL && problem.taxonomy?.layer !== scope.taxonomyLayer) return false;
    if (scope.taxonomyStage !== ALL && problem.taxonomy?.stage !== scope.taxonomyStage) return false;
    if (scope.problemType !== ALL && problem.taxonomy?.problemType !== scope.problemType) return false;
    if (scope.cognitiveTag !== ALL && !problem.taxonomy?.cognitiveTags?.includes(scope.cognitiveTag)) return false;

    return problem.difficulty >= minDifficulty && problem.difficulty <= maxDifficulty;
  });
}

function filterTaxonomyBaseProblems(items: Problem[], scope: ScopeFilters) {
  return items.filter((problem) => {
    if (scope.course !== ALL && problem.curriculum.course !== scope.course) return false;
    if (scope.theme !== ALL && problem.curriculum.theme !== scope.theme) return false;
    if (scope.chapter !== ALL && problem.curriculum.chapter !== scope.chapter) return false;
    if (scope.autoGradableOnly && !problem.isAutoGradable) return false;

    return true;
  });
}

function getPracticeSessionTarget(poolSize: number) {
  if (poolSize <= 0) return DEFAULT_PRACTICE_SESSION_LENGTH;
  return Math.min(DEFAULT_PRACTICE_SESSION_LENGTH, poolSize);
}

function buildSessionOverview(
  scope: ScopeFilters,
  stats: { attempts: number; poolSize: number; practiceTarget: number; remainingReviewConcepts: number }
): SessionOverview {
  const target = getSessionTarget(scope, stats);
  const progressPercent = target > 0 ? Math.min(100, Math.round((stats.attempts / target) * 100)) : 0;
  const title = scope.sessionTitle || getDefaultSessionTitle(scope);
  const goal = scope.sessionGoal || getDefaultSessionGoal(scope);
  const targetLabel = scope.mode === "review"
    ? `${Math.max(stats.remainingReviewConcepts, 0)} active concept(s)`
    : `${Math.min(stats.attempts, target)}/${target} item(s)`;
  const poolLabel = `${stats.poolSize} auto-gradable item(s)`;
  const nextCheckpoint = stats.attempts >= target
    ? "Session feedback ready"
    : `${Math.max(target - stats.attempts, 0)} item(s) to feedback`;

  return {
    eyebrow: scope.mode === "review" ? "Session Flow v1 Review" : scope.mode === "plan" ? "Session Flow v1 Mini Session" : "Session Flow v1 Practice",
    title,
    goal,
    source: formatSessionSource(scope.sessionSource),
    progressLabel: `${Math.min(stats.attempts, target)}/${target} complete`,
    progressPercent,
    targetLabel,
    poolLabel,
    nextCheckpoint
  };
}

function getSessionTarget(
  scope: ScopeFilters,
  stats: { practiceTarget: number; remainingReviewConcepts: number }
) {
  if (scope.mode === "plan" && scope.maxItems > 0) return scope.maxItems;
  if (scope.mode === "review") return Math.max(scope.reviewConcepts.length, stats.remainingReviewConcepts, 1);
  return stats.practiceTarget;
}

function getDefaultSessionTitle(scope: ScopeFilters) {
  if (scope.mode === "review") return "Review due concepts";
  if (scope.mode === "plan") return "Focused mini session";
  if (scope.chapter !== ALL) return `Practice ${scope.chapter}`;
  if (scope.course !== ALL) return `Practice ${scope.course}`;
  return "Adaptive practice session";
}

function getDefaultSessionGoal(scope: ScopeFilters) {
  if (scope.mode === "review") {
    return `Clear the active review set: ${scope.reviewConcepts.length ? scope.reviewConcepts.map(formatTaxonomyLabel).join(", ") : "student model focus concepts"}.`;
  }

  if (scope.mode === "plan") {
    return `Gather evidence for ${scope.planConcepts.length ? scope.planConcepts.map(formatTaxonomyLabel).join(", ") : "the current diagnostic target"} and stop for feedback.`;
  }

  return "Complete a bounded practice set so the model can recommend a next action instead of looping indefinitely.";
}

function formatSessionSource(source: string) {
  if (source === "home") return "Student Home";
  if (source === "dashboard") return "Dashboard";
  if (source === "diagnostic") return "Diagnostic";
  if (source === "manual") return "Manual scope";
  return "Practice";
}

function buildPracticeSessionReport(
  attempts: AttemptLog[],
  scope: ScopeFilters,
  studentModel: StudentModel | null
): PracticeSessionReport | null {
  if (attempts.length === 0) return null;

  const chronological = [...attempts].reverse();
  const correctCount = chronological.filter((attempt) => attempt.correct).length;
  const accuracy = Math.round((correctCount / chronological.length) * 100);
  const averageTimeSeconds = Math.round(
    chronological.reduce((sum, attempt) => sum + attempt.responseTimeSeconds, 0) / chronological.length
  );
  const averageConfidence = Math.round(
    (chronological.reduce((sum, attempt) => sum + attempt.confidence, 0) / chronological.length) * 10
  ) / 10;
  const focusConcepts = summarizeFocusConcepts(chronological);
  const strongConcepts = summarizeStrongConcepts(chronological, focusConcepts);
  const status = getPracticeStatus(accuracy, focusConcepts.length, averageConfidence);
  const nextStep = buildNextPracticeStep(status, focusConcepts, scope, studentModel);

  return {
    status,
    title: getPracticeTitle(status, scope),
    summary: buildPracticeSummary(status, accuracy, chronological.length, focusConcepts, averageTimeSeconds, averageConfidence),
    accuracy,
    correctCount,
    totalCount: chronological.length,
    averageTimeSeconds,
    averageConfidence,
    focusConcepts,
    strongConcepts,
    ...nextStep
  };
}

function summarizeFocusConcepts(attempts: AttemptLog[]) {
  const scores = new Map<string, number>();

  attempts.forEach((attempt) => {
    const wrongWeight = attempt.correct ? 0 : 3;
    const confidenceWeight = attempt.confidence <= 2 ? 1 : 0;
    const fluencyWeight = attempt.responseTimeSeconds >= 120 ? 1 : 0;

    attempt.problem.concepts.forEach((concept) => {
      scores.set(concept, (scores.get(concept) ?? 0) + wrongWeight + confidenceWeight + fluencyWeight);
    });

    attempt.weakConcepts.forEach((concept) => {
      scores.set(concept, (scores.get(concept) ?? 0) + 2);
    });

    attempt.prerequisiteGaps.forEach((gap) => {
      scores.set(gap.concept, (scores.get(gap.concept) ?? 0) + 4);
    });

    // Distractor cognitive tags are useful evidence, but next-step URLs need concept ids.
  });

  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([concept]) => concept);
}

function summarizeStrongConcepts(attempts: AttemptLog[], focusConcepts: string[]) {
  const correctCounts = new Map<string, number>();
  const wrongConcepts = new Set<string>();

  attempts.forEach((attempt) => {
    attempt.problem.concepts.forEach((concept) => {
      if (attempt.correct) {
        correctCounts.set(concept, (correctCounts.get(concept) ?? 0) + 1);
      } else {
        wrongConcepts.add(concept);
      }
    });
  });

  return [...correctCounts.entries()]
    .filter(([concept, count]) => count > 0 && !wrongConcepts.has(concept) && !focusConcepts.includes(concept))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([concept]) => concept);
}

function getPracticeStatus(
  accuracy: number,
  focusConceptCount: number,
  averageConfidence: number
): PracticeSessionReport["status"] {
  if (accuracy >= 80 && focusConceptCount <= 2 && averageConfidence >= 3) return "Ready";
  if (accuracy >= 60) return "Developing";
  return "Needs Repair";
}

function getPracticeTitle(status: PracticeSessionReport["status"], scope: ScopeFilters) {
  if (scope.mode === "plan") {
    if (status === "Ready") return "Mini session complete: ready to extend";
    if (status === "Developing") return "Mini session complete: one more focused set";
    return "Mini session complete: repair the prerequisite gap";
  }

  if (scope.mode === "review") {
    if (status === "Ready") return "Review complete: concepts stabilized";
    if (status === "Developing") return "Review complete: keep the target warm";
    return "Review complete: schedule a repair set";
  }

  if (status === "Ready") return "Practice complete: ready for the next stage";
  if (status === "Developing") return "Practice complete: developing but not automatic yet";
  return "Practice complete: repair before moving forward";
}

function buildPracticeSummary(
  status: PracticeSessionReport["status"],
  accuracy: number,
  totalCount: number,
  focusConcepts: string[],
  averageTimeSeconds: number,
  averageConfidence: number
) {
  const focusText = focusConcepts.length ? ` Main focus: ${focusConcepts.slice(0, 2).map(formatTaxonomyLabel).join(", ")}.` : "";
  const signalText = `You completed ${totalCount} item(s) with ${accuracy}% accuracy, ${averageTimeSeconds}s average response time, and ${averageConfidence}/5 average confidence.`;

  if (status === "Ready") {
    return `${signalText} This is strong enough to move into a transfer or next-stage set.${focusText}`;
  }

  if (status === "Developing") {
    return `${signalText} The model sees usable progress, but the skill is not stable enough to keep looping indefinitely.${focusText}`;
  }

  return `${signalText} The best next move is a shorter repair set before raising difficulty.${focusText}`;
}

function buildNextPracticeStep(
  status: PracticeSessionReport["status"],
  focusConcepts: string[],
  scope: ScopeFilters,
  studentModel: StudentModel | null
): Pick<PracticeSessionReport, "nextTitle" | "nextReason" | "nextHref" | "secondaryTitle" | "secondaryHref"> {
  if (status === "Needs Repair" && focusConcepts.length > 0) {
    return {
      nextTitle: `Repair ${formatTaxonomyLabel(focusConcepts[0])}`,
      nextReason: "Accuracy or confidence was low enough that a short targeted repair set is more useful than adding harder problems.",
      nextHref: buildPlanHref(focusConcepts.slice(0, 3), 6),
      secondaryTitle: "Retake diagnostic",
      secondaryHref: "/diagnostic"
    };
  }

  const reviewQueue = buildReviewQueue(studentModel, problems);
  if (reviewQueue.dueConcepts.length > 0 && status !== "Ready") {
    return {
      nextTitle: "Review due concepts",
      nextReason: reviewQueue.reason,
      nextHref: reviewQueue.href,
      secondaryTitle: "Open dashboard",
      secondaryHref: "/dashboard"
    };
  }

  if (status === "Ready") {
    const transferHref = buildTransferHref(scope, focusConcepts);

    return {
      nextTitle: getTransferTitle(scope),
      nextReason: "This session is stable enough to stop the loop and move into a broader or higher-transfer range.",
      nextHref: transferHref,
      secondaryTitle: "Open dashboard",
      secondaryHref: "/dashboard"
    };
  }

  if (focusConcepts.length > 0) {
    return {
      nextTitle: `Confirm ${formatTaxonomyLabel(focusConcepts[0])}`,
      nextReason: "The session showed progress, but one focused confirmation set will give the model a cleaner signal.",
      nextHref: buildPlanHref(focusConcepts.slice(0, 3), 8),
      secondaryTitle: "Open dashboard",
      secondaryHref: "/dashboard"
    };
  }

  return {
    nextTitle: "Run a diagnostic checkpoint",
    nextReason: "The session is mixed enough that a short assessment will choose the next range more reliably than another loop.",
    nextHref: "/diagnostic",
    secondaryTitle: "Open dashboard",
    secondaryHref: "/dashboard"
  };
}

function buildPlanHref(concepts: string[], maxItems: number) {
  const params = new URLSearchParams({
    mode: "plan",
    maxItems: String(maxItems),
    autoGradableOnly: "true"
  });

  if (concepts.length > 0) params.set("concepts", concepts.join(","));

  return `/practice?${params.toString()}`;
}

function buildRecommendationContext(
  studentModel: StudentModel | null,
  learningPlan: ReturnType<typeof buildLearningPlan> | null,
  scope: ScopeFilters
): RecommendationContext {
  const targetConcepts =
    scope.mode === "review"
      ? scope.reviewConcepts
      : scope.mode === "plan"
        ? scope.planConcepts
        : [];

  return {
    abilityProfile: studentModel?.abilityProfile,
    conceptStates: studentModel?.conceptStates,
    recommendedReviewConcepts: studentModel?.recommendedReviewConcepts,
    currentPlacement: studentModel?.currentPlacement,
    learningPlan: learningPlan && learningPlan.status === "ready"
      ? {
          mode: learningPlan.mode,
          targetConcept: learningPlan.targetConcept,
          targetMastery: learningPlan.targetMastery,
          supportingConcepts: learningPlan.supportingConcepts,
          steps: learningPlan.steps.map((step) => ({
            id: step.id,
            title: step.title,
            targetConcepts: step.targetConcepts,
            stage: step.stage,
            priority: step.priority
          }))
        }
      : null,
    scope: {
      mode: scope.mode,
      targetConcepts,
      stage: scope.taxonomyStage === ALL ? undefined : scope.taxonomyStage,
      layer: scope.taxonomyLayer === ALL ? undefined : scope.taxonomyLayer,
      problemType: scope.problemType === ALL ? undefined : scope.problemType,
      cognitiveTag: scope.cognitiveTag === ALL ? undefined : scope.cognitiveTag
    }
  };
}

function buildTransferHref(scope: ScopeFilters, focusConcepts: string[]) {
  if (scope.course === "Pre-Algebra") {
    return "/practice?course=AMC8&stage=AMC8%20Transfer&autoGradableOnly=true";
  }

  if (scope.taxonomyStage === "Algebra Readiness" || scope.course === "Algebra 1") {
    return "/diagnostic";
  }

  if (focusConcepts.length > 0) {
    return buildPlanHref(focusConcepts.slice(0, 3), 8);
  }

  return "/practice?stage=AMC8%20Transfer&autoGradableOnly=true";
}

function getTransferTitle(scope: ScopeFilters) {
  if (scope.course === "Pre-Algebra") return "Try AMC8 transfer";
  if (scope.taxonomyStage === "Algebra Readiness" || scope.course === "Algebra 1") return "Run a diagnostic checkpoint";
  return "Move to a transfer set";
}

function statusClass(status: PracticeSessionReport["status"]) {
  if (status === "Ready") return "ready";
  if (status === "Developing") return "developing";
  return "repair";
}

function buildQualityStats(items: Problem[]) {
  const explanationQuality = summarizeExplanationQuality(items, explanations);

  return {
    total: items.length,
    explanationQuality,
    layers: countTaxonomy(items, (problem) => problem.taxonomy?.layer, ["Foundation", "Standard", "Honors", "AMC8", "AMC8 Stretch"]),
    stages: countTaxonomy(items, (problem) => problem.taxonomy?.stage, ["Foundation", "Bridge", "Algebra Readiness", "AMC8 Transfer"]),
    problemTypes: countTaxonomy(items, (problem) => problem.taxonomy?.problemType),
    cognitiveTags: countTaxonomy(items, (problem) => problem.taxonomy?.cognitiveTags ?? [])
  };
}

function countTaxonomy(
  items: Problem[],
  keyFor: (problem: Problem) => string | string[] | undefined,
  preferredOrder: string[] = []
) {
  const counts = new Map<string, number>();

  items.forEach((problem) => {
    const value = keyFor(problem);
    const values = Array.isArray(value) ? value : value ? [value] : [];
    values.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  });

  const preferred = preferredOrder
    .filter((key) => counts.has(key))
    .map((key) => ({ key, count: counts.get(key) ?? 0 }));
  const remaining = [...counts.entries()]
    .filter(([key]) => !preferredOrder.includes(key))
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return [...preferred, ...remaining];
}

function layerRank(layer: string | undefined) {
  if (layer === "Foundation") return 0;
  if (layer === "Standard") return 1;
  if (layer === "Honors") return 2;
  if (layer === "AMC8") return 3;
  if (layer === "AMC8 Stretch") return 4;
  return 5;
}

function scopeFromSearchParams(searchParams: { get: (key: string) => string | null }): ScopeFilters {
  return {
    mode: getMode(searchParams.get("mode")),
    problemId: searchParams.get("problemId") || defaultScope.problemId,
    sessionTitle: cleanSessionText(searchParams.get("sessionTitle")),
    sessionGoal: cleanSessionText(searchParams.get("sessionGoal")),
    sessionSource: cleanSessionText(searchParams.get("sessionSource")),
    returnHref: safeReturnHref(searchParams.get("returnHref")),
    reviewConcepts: searchParams.get("mode") === "review" ? splitConcepts(searchParams.get("concepts")) : [],
    planConcepts: searchParams.get("mode") === "plan" ? splitConcepts(searchParams.get("concepts")) : [],
    maxItems: toMaxItems(searchParams.get("maxItems")),
    course: searchParams.get("course") || defaultScope.course,
    theme: searchParams.get("theme") || defaultScope.theme,
    chapter: searchParams.get("chapter") || defaultScope.chapter,
    minDifficulty: toDifficulty(searchParams.get("minDifficulty"), defaultScope.minDifficulty),
    maxDifficulty: toDifficulty(searchParams.get("maxDifficulty"), defaultScope.maxDifficulty),
    taxonomyLayer: searchParams.get("layer") || defaultScope.taxonomyLayer,
    taxonomyStage: searchParams.get("stage") || defaultScope.taxonomyStage,
    problemType: searchParams.get("problemType") || defaultScope.problemType,
    cognitiveTag: searchParams.get("cognitiveTag") || defaultScope.cognitiveTag,
    autoGradableOnly: searchParams.get("autoGradableOnly") !== "false"
  };
}

function getMode(value: string | null): ScopeFilters["mode"] {
  if (value === "review" || value === "plan") return value;
  return defaultScope.mode;
}

function toMaxItems(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 20 ? parsed : defaultScope.maxItems;
}

function toDifficulty(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : fallback;
}

function splitConcepts(value: string | null) {
  return value ? value.split(",").map((concept) => concept.trim()).filter(Boolean) : [];
}

function cleanSessionText(value: string | null) {
  return value ? value.trim().slice(0, 240) : "";
}

function safeReturnHref(value: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "";
  if (trimmed.startsWith("//")) return "";
  return trimmed.slice(0, 180);
}

function scopesEqual(left: ScopeFilters, right: ScopeFilters) {
  return (
    left.course === right.course &&
    left.mode === right.mode &&
    left.problemId === right.problemId &&
    left.sessionTitle === right.sessionTitle &&
    left.sessionGoal === right.sessionGoal &&
    left.sessionSource === right.sessionSource &&
    left.returnHref === right.returnHref &&
    left.reviewConcepts.join(",") === right.reviewConcepts.join(",") &&
    left.planConcepts.join(",") === right.planConcepts.join(",") &&
    left.maxItems === right.maxItems &&
    left.theme === right.theme &&
    left.chapter === right.chapter &&
    left.minDifficulty === right.minDifficulty &&
    left.maxDifficulty === right.maxDifficulty &&
    left.taxonomyLayer === right.taxonomyLayer &&
    left.taxonomyStage === right.taxonomyStage &&
    left.problemType === right.problemType &&
    left.cognitiveTag === right.cognitiveTag &&
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

function simplifyPrerequisiteGaps(gaps: PrerequisiteGap[]) {
  return gaps.slice(0, 4).map((gap) => ({
    concept: gap.concept,
    targetConcept: gap.targetConcept,
    depth: gap.depth,
    mastery: gap.mastery
  }));
}

function getExplanation(problem: Problem): ExampleExplanation {
  return explanations[problem.id] ?? {
    stepByStep: problem.solution,
    whyCorrect: problem.solution
  };
}

function LearningNotes({
  correct,
  distractorExplanation,
  explanation,
  problem,
  solution
}: {
  correct: boolean;
  distractorExplanation?: string;
  explanation?: ExampleExplanation;
  problem: Problem;
  solution: string;
}) {
  const notes = explanation ?? { stepByStep: solution, whyCorrect: solution };
  const quality = assessExplanationQuality(notes, problem);
  const hintNotes = [
    !correct && notes.hint1 ? { label: "First hint", text: notes.hint1 } : null,
    !correct && notes.hint2 ? { label: "Second hint", text: notes.hint2 } : null
  ].filter(Boolean) as Array<{ label: string; text: string }>;
  const reasoningNotes = [
    notes.whyCorrect ? { label: "Why it works", text: notes.whyCorrect } : null,
    distractorExplanation ? { label: "Choice signal", text: distractorExplanation } : null
  ].filter(Boolean) as Array<{ label: string; text: string }>;

  return (
    <div className={`learning-notes explanation-quality-${quality.level}`}>
      <div className="learning-notes-head">
        <div>
          <span>Learning Notes</span>
          <strong>{correct ? "Verify and extend" : "Hint, repair, retry"}</strong>
        </div>
        <div className="explanation-quality-badge">
          <span>{quality.learnerLabel}</span>
          <strong>{quality.score}/100</strong>
        </div>
      </div>

      <div className="explanation-quality-row">
        <span>{quality.reviewerLabel}</span>
        {quality.issues.slice(0, 2).map((issue) => (
          <span key={issue}>{issue}</span>
        ))}
        {quality.issues.length === 0 && <span>Ready for student-facing use.</span>}
      </div>

      {hintNotes.length > 0 && (
        <LearningNoteGroup
          description="Use these before revealing the worked solution."
          notes={hintNotes}
          title="Hints"
        />
      )}

      {reasoningNotes.length > 0 && (
        <LearningNoteGroup
          description={correct ? "Confirm the reasoning behind the correct answer." : "Connect the answer choice to the likely reasoning pattern."}
          notes={reasoningNotes}
          title="Reasoning"
        />
      )}

      {notes.stepByStep && (
        <LearningNoteGroup
          description="Follow the main solution path one move at a time."
          notes={[{ label: "Worked solution", text: notes.stepByStep }]}
          title="Worked Steps"
        />
      )}

      {!correct && notes.commonMistake && (
        <LearningNoteGroup
          description="This is the most likely trap to avoid on the retry."
          notes={[{ label: "Watch for", text: notes.commonMistake }]}
          title="Common Mistake"
        />
      )}

      {notes.variantIdea && (
        <LearningNoteGroup
          description="Use this to check whether the idea transfers."
          notes={[{ label: "Variant", text: notes.variantIdea }]}
          title="Transfer Prompt"
        />
      )}
    </div>
  );
}

function LearningNoteGroup({
  description,
  notes,
  title
}: {
  description: string;
  notes: Array<{ label: string; text: string }>;
  title: string;
}) {
  return (
    <div className="learning-note-group">
      <div className="learning-note-group-head">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className="learning-note-group-body">
        {notes.map((note) => (
          <LearningNote key={note.label} label={note.label} text={note.text} />
        ))}
      </div>
    </div>
  );
}

function LearningNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="learning-note">
      <span>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function QualityStatsPanel({
  activeCount,
  stats
}: {
  activeCount: number;
  stats: ReturnType<typeof buildQualityStats>;
}) {
  return (
    <div className="quality-panel">
      <div className="quality-panel-head">
        <div>
          <p className="eyebrow">Problem Bank Quality</p>
          <h3>Coverage and taxonomy distribution</h3>
        </div>
        <div className="quality-count">
          <span>{activeCount}</span>
          <strong>active / {stats.total} in range · explanations {stats.explanationQuality.averageScore}/100</strong>
        </div>
      </div>
      <div className="quality-grid">
        <QualityDistribution
          title="Explanation Quality"
          total={stats.total}
          rows={[
            { key: "Complete", count: stats.explanationQuality.counts.complete },
            { key: "Partial", count: stats.explanationQuality.counts.partial },
            { key: "Weak", count: stats.explanationQuality.counts.weak },
            { key: "Missing", count: stats.explanationQuality.counts.missing }
          ]}
        />
        <QualityDistribution title="Difficulty Layer" total={stats.total} rows={stats.layers} />
        <QualityDistribution title="Adaptive Stage" total={stats.total} rows={stats.stages} />
        <QualityList title="Problem Types" rows={stats.problemTypes.slice(0, 8)} />
        <QualityList title="Cognitive Tags" rows={stats.cognitiveTags.slice(0, 8)} />
      </div>
    </div>
  );
}

function QualityDistribution({
  rows,
  title,
  total
}: {
  rows: Array<{ key: string; count: number }>;
  title: string;
  total: number;
}) {
  return (
    <div className="quality-card">
      <h4>{title}</h4>
      <div className="quality-bars">
        {rows.map((row) => (
          <div className="quality-bar-row" key={row.key}>
            <div className="quality-bar-label">
              <span>{row.key}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="quality-bar-track">
              <div
                className="quality-bar-fill"
                style={{ width: `${total > 0 ? Math.round((row.count / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityList({
  rows,
  title
}: {
  rows: Array<{ key: string; count: number }>;
  title: string;
}) {
  return (
    <div className="quality-card">
      <h4>{title}</h4>
      <div className="quality-chip-list">
        {rows.map((row) => (
          <span className="quality-chip" key={row.key}>
            {formatTaxonomyLabel(row.key)}
            <strong>{row.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function formatTaxonomyLabel(value: string) {
  return value.replace(/_/g, " ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
