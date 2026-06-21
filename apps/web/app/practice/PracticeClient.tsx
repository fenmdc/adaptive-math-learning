"use client";

import { ChangeEvent, FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import conceptsData from "../../data/concepts.json";
import explanationsData from "../../data/exampleExplanations.json";
import problemsData from "../../data/problems.json";
import { AdaptiveEngine, buildConceptGraph, checkProblemAnswer, Problem, StudentState, type AnswerChoice, type ConceptNode, type PrerequisiteGap, type Recommendation, type RecommendationContext, type RecommendationExplanation } from "../../../../packages/adaptive-engine";
import { buildLearningPlan } from "../shared/learningPlan";
import { assessExplanationQuality, summarizeExplanationQuality, type ExampleExplanation } from "../shared/explanationQuality";
import { buildReviewQueue, selectReviewProblems } from "../shared/reviewQueue";
import { clearPracticeLogs, createPracticeLog, enqueueSubjectiveReview, readPracticeLogs, readSessionPreferences, readStudentModel, readSubjectiveReviewQueue, writeLearningPlan, writePracticeLogs, writeSessionPreferences, writeStudentModel, type WorkSubmission } from "../shared/storage";
import { updateStudentModel, type StudentModel } from "../shared/studentModel";
import { buildReviewedSubjectiveFeedback, type ReviewedSubjectiveFeedback } from "../shared/subjectiveFeedback";
import {
  CONTENT_PROFILES,
  getLanguageProfile,
  getProfilesByLanguage,
  type ContentProfile
} from "../shared/curriculumTracks";
import MathText from "../shared/MathText";

type AttemptLog = {
  problem: Problem;
  submittedAnswer: string;
  correct: boolean;
  manualReviewPending?: boolean;
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
  workSubmission?: WorkSubmission;
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
  layerFeedback: LayerFeedback[];
  focusConcepts: string[];
  strongConcepts: string[];
  nextTitle: string;
  nextReason: string;
  nextHref: string;
  secondaryTitle: string;
  secondaryHref: string;
  seniorDiagnosticFeedback?: SeniorDiagnosticFeedback;
};

type SeniorDiagnosticFeedback = {
  title: string;
  status: PracticeSessionReport["status"];
  evidence: string;
  diagnosticWeakness: string;
  repaired: boolean;
  nextAction: string;
  statusLabel: string;
};

type LayerFeedback = {
  accuracy: number;
  averageConfidence: number;
  correctCount: number;
  group: string;
  guidance: string;
  status: "Secure" | "Developing" | "Needs Repair" | "Not Sampled";
  totalCount: number;
};

const problems = problemsData as Problem[];
const explanations = explanationsData as Record<string, ExampleExplanation>;
const conceptGraph = buildConceptGraph(conceptsData as ConceptNode[]);
const initialState: StudentState = { mastery: {}, history: [] };
const ALL = "all";
const DEFAULT_PRACTICE_SESSION_LENGTH = 10;
const PRACTICE_ITEM_COUNT_OPTIONS = [3, 5, 8, 10, 12, 15, 20, 30, 40];

type ScopeFilters = {
  mode: "practice" | "review" | "plan";
  problemId: string;
  layerStrategy: "adaptive" | "balanced";
  sessionTitle: string;
  sessionGoal: string;
  sessionSource: string;
  returnHref: string;
  reviewConcepts: string[];
  planConcepts: string[];
  maxItems: number;
  curriculumSystem: string;
  language: string;
  displayTrack: string;
  course: string;
  theme: string;
  chapter: string;
  minSequence: number;
  maxSequence: number;
  minDifficulty: number;
  maxDifficulty: number;
  taxonomyLayer: string;
  taxonomyStage: string;
  problemType: string;
  responseMode: string;
  cognitiveTag: string;
  autoGradableOnly: boolean;
};

const defaultScope: ScopeFilters = {
  mode: "practice",
  problemId: "",
  layerStrategy: "adaptive",
  sessionTitle: "",
  sessionGoal: "",
  sessionSource: "",
  returnHref: "",
  reviewConcepts: [],
  planConcepts: [],
  maxItems: 0,
  curriculumSystem: "US",
  language: "en",
  displayTrack: "US Core",
  course: ALL,
  theme: ALL,
  chapter: ALL,
  minSequence: 0,
  maxSequence: 0,
  minDifficulty: 1,
  maxDifficulty: 5,
  taxonomyLayer: ALL,
  taxonomyStage: ALL,
  problemType: ALL,
  responseMode: ALL,
  cognitiveTag: ALL,
  autoGradableOnly: true
};

export default function PracticeClient({ initialQueryString = "" }: { initialQueryString?: string }) {
  const urlScope = useMemo(() => scopeFromSearchParams(new URLSearchParams(initialQueryString)), [initialQueryString]);
  const [studentState, setStudentState] = useState<StudentState>(initialState);
  const [scope, setScope] = useState<ScopeFilters>(urlScope);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [feedback, setFeedback] = useState<AttemptLog | null>(null);
  const [pendingNextProblem, setPendingNextProblem] = useState<Problem | null>(null);
  const [latestStudentModel, setLatestStudentModel] = useState<StudentModel | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [showRecentTrajectory, setShowRecentTrajectory] = useState(false);
  const [workSubmission, setWorkSubmission] = useState<WorkSubmission>({});
  const [problemStartedAt, setProblemStartedAt] = useState(() => Date.now());
  const catalog = useMemo(() => buildCatalog(problems), []);
  const taxonomyBaseProblems = useMemo(() => filterTaxonomyBaseProblems(problems, scope), [scope]);
  const qualityStats = useMemo(() => buildQualityStats(taxonomyBaseProblems), [taxonomyBaseProblems]);
  const scopedProblems = useMemo(() => filterProblems(problems, scope), [scope]);
  const layerSamplingPlan = useMemo(
    () => buildLayerSamplingPlan(scopedProblems, scope),
    [scope, scopedProblems]
  );
  const conceptSummary = useMemo(
    () => buildConceptSummary(taxonomyBaseProblems, studentState.mastery),
    [studentState.mastery, taxonomyBaseProblems]
  );
  const engine = useMemo(() => new AdaptiveEngine(scopedProblems, conceptGraph), [scopedProblems]);
  const [currentProblem, setCurrentProblem] = useState<Problem>(scopedProblems[0] ?? problems[0]);
  const reviewedFeedback = useMemo(
    () => buildReviewedSubjectiveFeedback(readSubjectiveReviewQueue(), problems, { limit: 3 }),
    [attempts.length, latestStudentModel, scope]
  );
  const scopedReviewedFeedback = useMemo(
    () => filterReviewedFeedbackForScope(reviewedFeedback, scope, currentProblem).slice(0, 2),
    [currentProblem, reviewedFeedback, scope]
  );

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
    setWorkSubmission({});
    setLatestStudentModel(readStudentModel());
    setConfidence(3);
    setProblemStartedAt(Date.now());
    clearPracticeLogs();
  }

  function updateScope(nextScope: ScopeFilters) {
    setScope(nextScope);
    restartWithScope(nextScope);
  }

  function updatePracticeItemCount(value: number) {
    const nextCount = clampItemCount(value, 3, 40, DEFAULT_PRACTICE_SESSION_LENGTH);

    writeSessionPreferences({ practiceItemCount: nextCount });
    updateScope({
      ...scope,
      maxItems: nextCount
    });
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasTypedAnswer = Boolean(answer.trim());
    const hasSubmittedWork = hasWorkSubmission(workSubmission);
    const requiresManualReview = shouldQueueSubjectiveReview(currentProblem, workSubmission) && !currentProblem.isAutoGradable;
    if ((!hasTypedAnswer && !hasSubmittedWork) || pendingNextProblem) return;
    if (scopedProblems.length === 0) return;

    const answerCheck = requiresManualReview
      ? {
          correct: false,
          comparable: false,
          normalizedExpected: currentProblem.answer,
          normalizedSubmitted: answer,
          reason: "Submitted for manual review. Automatic scoring is skipped for this response."
        }
      : checkProblemAnswer({
          submitted: answer,
          expected: currentProblem.answer,
          choices: currentProblem.choices,
          distractors: currentProblem.distractors
        });
    const correct = !requiresManualReview && answerCheck.correct;
    const explanation = getExplanation(currentProblem);
    const responseTimeSeconds = secondsSince(problemStartedAt);
    const currentStudentModel = readStudentModel();
    const currentLearningPlan = buildLearningPlan(readPracticeLogs(), problems, currentStudentModel);
    const recommendationContext = buildRecommendationContext(currentStudentModel, currentLearningPlan, scope);
    const result = requiresManualReview
      ? buildManualReviewResult(currentProblem, scopedProblems, studentState)
      : engine.run(studentState, {
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
      workSubmission: hasWorkSubmission(workSubmission) ? workSubmission : undefined,
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
      manualReviewPending: requiresManualReview,
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
      workSubmission: hasWorkSubmission(workSubmission) ? workSubmission : undefined,
      explanation
    };

    const nextLogs = [...readPracticeLogs(), persistedLog];
    if (shouldQueueSubjectiveReview(currentProblem, workSubmission)) {
      enqueueSubjectiveReview({
        concepts: currentProblem.concepts,
        problem: currentProblem.id,
        problemStatement: currentProblem.statement,
        responseSchema: currentProblem.responseSchema ?? inferResponseSchema(currentProblem),
        source: "practice",
        submittedAnswer: answer,
        taxonomy: currentProblem.taxonomy,
        workSubmission
      });
    }
    const nextStudentModel = requiresManualReview
      ? currentStudentModel
      : updateStudentModel(currentStudentModel, {
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
    const practiceNowComplete = scope.mode === "practice" && attempts.length + 1 >= getPracticeSessionTarget(scopedProblems.length, scope);
    const sessionNowComplete = reviewNowComplete || planNowComplete || practiceNowComplete;

    setStudentState(result.updated_state);
    setAttempts((current) => [nextAttempt, ...current]);
    writePracticeLogs(nextLogs);
    if (nextStudentModel) writeStudentModel(nextStudentModel);
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
    setWorkSubmission({});
    setConfidence(3);
    setProblemStartedAt(Date.now());
  }

  const masteryEntries = Object.entries(studentState.mastery).sort((a, b) => a[1] - b[1]);
  const selectedCurriculumSystem = scope.curriculumSystem === ALL ? undefined : scope.curriculumSystem;
  const selectedLanguage = scope.language === ALL ? undefined : scope.language;
  const selectedDisplayTrack = scope.displayTrack === ALL ? undefined : scope.displayTrack;
  const selectedCourse = scope.course === ALL ? undefined : scope.course;
  const selectedTheme = scope.theme === ALL ? undefined : scope.theme;
  const availableCourses = catalog.courseItems
    .filter((item) => !selectedCurriculumSystem || item.curriculumSystem === selectedCurriculumSystem)
    .filter((item) => !selectedLanguage || item.language === selectedLanguage)
    .filter((item) => !selectedDisplayTrack || item.displayTrack === selectedDisplayTrack)
    .map((item) => item.course);
  const availableThemes = catalog.themes
    .filter((item) => !selectedCurriculumSystem || item.curriculumSystem === selectedCurriculumSystem)
    .filter((item) => !selectedLanguage || item.language === selectedLanguage)
    .filter((item) => !selectedDisplayTrack || item.displayTrack === selectedDisplayTrack)
    .filter((item) => !selectedCourse || item.course === selectedCourse)
    .map((item) => item.theme);
  const availableChapters = catalog.chapters.filter((chapter) => {
    if (selectedCurriculumSystem && chapter.curriculumSystem !== selectedCurriculumSystem) return false;
    if (selectedLanguage && chapter.language !== selectedLanguage) return false;
    if (selectedDisplayTrack && chapter.displayTrack !== selectedDisplayTrack) return false;
    if (selectedCourse && chapter.course !== selectedCourse) return false;
    if (selectedTheme && chapter.theme !== selectedTheme) return false;
    return true;
  });
  const availableLayers = qualityStats.layers.map((item) => item.key);
  const availableStages = qualityStats.stages.map((item) => item.key);
  const availableProblemTypes = qualityStats.problemTypes.map((item) => item.key);
  const availableResponseModes = unique(
    taxonomyBaseProblems
      .map((problem) => problem.responseSchema?.mode ?? "")
      .filter(Boolean)
  );
  const availableCognitiveTags = qualityStats.cognitiveTags.map((item) => item.key);
  const activeContentProfile = getActiveContentProfile(scope);
  const activeLanguage = getLanguageProfile(scope.language).id;
  const sameLanguageProfiles = getProfilesByLanguage(activeLanguage);
  const chineseContent = isChineseScope(scope);
  const scopeCopy = getScopeCopy(chineseContent);
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
  const practiceSessionTarget = getPracticeSessionTarget(scopedProblems.length, scope);
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
            <Link className="button-secondary" href="/curriculum">
              Courses
            </Link>
            <Link className="button-secondary" href="/dashboard">
              Dashboard
            </Link>
            <Link className="button-secondary" href="/review">
              Review Queue
            </Link>
            <button className="button" onClick={resetSession}>
              Reset
            </button>
          </div>
        </header>

        {scope.mode === "practice" && (
          <PracticeLanguageNav activeLanguage={activeLanguage} />
        )}

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

        {scopedReviewedFeedback.length > 0 && (
          <ReviewedFeedbackPanel items={scopedReviewedFeedback} />
        )}

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
                  : chineseContent
                    ? "选择课程与章节"
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
              <ContentProfileTabs
                activeProfileId={activeContentProfile?.id}
                onSelect={(profile) => updateScope({
                  ...scope,
                  curriculumSystem: profile.curriculumSystem,
                  language: profile.language,
                  displayTrack: profile.displayTrack,
                  mode: "practice",
                  reviewConcepts: [],
                  course: ALL,
                  theme: ALL,
                  chapter: ALL,
                  minSequence: 0,
                  maxSequence: 0,
                  taxonomyLayer: ALL,
                  taxonomyStage: ALL,
                  problemType: ALL,
                  responseMode: ALL,
                  cognitiveTag: ALL
                })}
                profiles={sameLanguageProfiles}
              />
              <div className="scope-grid">
                <label className="field-label" htmlFor="scope-session-count">
                  {scopeCopy.sessionItemCount}
                  <select
                    className="select-input"
                    id="scope-session-count"
                    onChange={(event) => updatePracticeItemCount(Number(event.target.value))}
                    value={practiceSessionTarget}
                  >
                    {PRACTICE_ITEM_COUNT_OPTIONS.filter((count) => scopedProblems.length === 0 || count <= Math.max(scopedProblems.length, 3)).map((count) => (
                      <option key={count} value={count}>
                        {count} {scopeCopy.items}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-course">
                  {scopeCopy.course}
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
                      minSequence: 0,
                      maxSequence: 0,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      responseMode: ALL,
                      cognitiveTag: ALL
                    })}
                    value={scope.course}
                  >
                    <option value={ALL}>{scopeCopy.allCourses}</option>
                    {unique(availableCourses).map((course) => (
                      <option key={course} value={course}>
                        {formatCourseLabel(course)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-theme">
                  {scopeCopy.theme}
                  <select
                    className="select-input"
                    id="scope-theme"
                    onChange={(event) => updateScope({
                      ...scope,
                      mode: "practice",
                      reviewConcepts: [],
                      theme: event.target.value,
                      chapter: ALL,
                      minSequence: 0,
                      maxSequence: 0,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      responseMode: ALL,
                      cognitiveTag: ALL
                    })}
                    value={scope.theme}
                  >
                    <option value={ALL}>{scopeCopy.allThemes}</option>
                    {unique(availableThemes).map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-chapter">
                  {scopeCopy.chapter}
                  <select
                    className="select-input"
                    id="scope-chapter"
                    onChange={(event) => updateScope({
                      ...scope,
                      mode: "practice",
                      reviewConcepts: [],
                      chapter: event.target.value,
                      minSequence: 0,
                      maxSequence: 0,
                      taxonomyLayer: ALL,
                      taxonomyStage: ALL,
                      problemType: ALL,
                      responseMode: ALL,
                      cognitiveTag: ALL
                    })}
                    value={scope.chapter}
                  >
                    <option value={ALL}>{scopeCopy.allChapters}</option>
                    {availableChapters.map((chapter) => (
                      <option key={chapter.chapter} value={chapter.chapter}>
                        {chapter.chapterTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-min-difficulty">
                  {scopeCopy.minDifficulty}
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
                  {scopeCopy.maxDifficulty}
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
                  {scopeCopy.autoGradableOnly}
                </label>
                <label className="field-label" htmlFor="scope-taxonomy-layer">
                  {scopeCopy.difficultyLayer}
                  <select
                    className="select-input"
                    id="scope-taxonomy-layer"
                    onChange={(event) => updateScope({ ...scope, taxonomyLayer: event.target.value })}
                    value={scope.taxonomyLayer}
                  >
                    <option value={ALL}>{scopeCopy.allLayers}</option>
                    {availableLayers.map((layer) => (
                      <option key={layer} value={layer}>
                        {layer}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-taxonomy-stage">
                  {scopeCopy.adaptiveStage}
                  <select
                    className="select-input"
                    id="scope-taxonomy-stage"
                    onChange={(event) => updateScope({ ...scope, taxonomyStage: event.target.value })}
                    value={scope.taxonomyStage}
                  >
                    <option value={ALL}>{scopeCopy.allStages}</option>
                    {availableStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-problem-type">
                  {scopeCopy.problemType}
                  <select
                    className="select-input"
                    id="scope-problem-type"
                    onChange={(event) => updateScope({ ...scope, problemType: event.target.value })}
                    value={scope.problemType}
                  >
                    <option value={ALL}>{scopeCopy.allTypes}</option>
                    {availableProblemTypes.map((problemType) => (
                      <option key={problemType} value={problemType}>
                        {formatTaxonomyLabel(problemType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-response-mode">
                  {scopeCopy.responseMode}
                  <select
                    className="select-input"
                    id="scope-response-mode"
                    onChange={(event) => updateScope({ ...scope, responseMode: event.target.value })}
                    value={scope.responseMode}
                  >
                    <option value={ALL}>{scopeCopy.allResponseModes}</option>
                    {availableResponseModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {formatTaxonomyLabel(mode)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label" htmlFor="scope-cognitive-tag">
                  {scopeCopy.cognitiveTag}
                  <select
                    className="select-input"
                    id="scope-cognitive-tag"
                    onChange={(event) => updateScope({ ...scope, cognitiveTag: event.target.value })}
                    value={scope.cognitiveTag}
                  >
                    <option value={ALL}>{scopeCopy.allCognitiveTags}</option>
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
              {layerSamplingPlan.enabled && (
                <LayerSamplingPanel plan={layerSamplingPlan} />
              )}
              <ConceptSummaryPanel concepts={conceptSummary} />
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
                    {formatCourseLabel(currentProblem.curriculum.course)}
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

                <h2 className="problem-text"><MathText text={currentProblem.statement} /></h2>
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
                          <span><MathText text={choice.text} /></span>
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
                  <WorkSubmissionPanel
                    disabled={Boolean(pendingNextProblem) || sessionComplete}
                    onChange={setWorkSubmission}
                    value={workSubmission}
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
                    feedback.correct || feedback.manualReviewPending
                      ? "feedback-success"
                      : "feedback-error"
                }`}
              >
                <div className="feedback-title">
                  {feedback.manualReviewPending ? "Submitted for review" : feedback.correct ? "Correct" : "Not yet"}
                </div>
                <div>
                  Your answer: <MathText text={feedback.submittedAnswer || "work submitted"} />
                  {!feedback.manualReviewPending && (
                    <> · Expected: <MathText text={feedback.problem.answer} /></>
                  )}
                </div>
                {feedback.selectedChoiceLabel && (
                  <div>
                    Selected choice: {feedback.selectedChoiceLabel} · <MathText text={feedback.selectedChoiceValue ?? ""} />
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
                {feedback.manualReviewPending && (
                  <div>
                    This response is now in the Review Queue. A reviewer score can update the learning record in the next grading layer.
                  </div>
                )}
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
                  scope.layerStrategy === "balanced" ? "balanced layer sampling" : "",
                  formatSelectedProfile(scope),
                  scope.course === ALL ? scope.course : formatCourseLabel(scope.course),
                  scope.theme,
                  scope.chapter,
                  scope.taxonomyLayer,
                  scope.taxonomyStage,
                  scope.problemType,
                  scope.responseMode,
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
              <p className="muted"><MathText text={attempts[0].problem.statement} /></p>
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
                  <div className="muted"><MathText text={item.problem.statement} /></div>
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

function ContentProfileTabs({
  activeProfileId,
  onSelect,
  profiles
}: {
  activeProfileId?: string;
  onSelect: (profile: ContentProfile) => void;
  profiles: ContentProfile[];
}) {
  return (
    <div className="content-profile-tabs" aria-label="Content track">
      {profiles.map((profile) => (
        <button
          className={`content-profile-tab ${activeProfileId === profile.id ? "content-profile-tab-active" : ""}`}
          key={profile.id}
          onClick={() => onSelect(profile)}
          type="button"
        >
          <strong>{profile.title}</strong>
          <span>{profile.subtitle}</span>
        </button>
      ))}
    </div>
  );
}

function PracticeLanguageNav({ activeLanguage }: { activeLanguage: string }) {
  const languages = [
    {
      id: "en",
      label: "English",
      href: "/curriculum?language=en"
    },
    {
      id: "zh",
      label: "中文",
      href: "/curriculum?language=zh"
    }
  ];

  return (
    <div className="practice-language-nav" aria-label="Practice language">
      <div>
        <strong>{activeLanguage === "zh" ? "当前语言" : "Current language"}</strong>
        <span>
          {activeLanguage === "zh"
            ? "切换语言会回到课程入口，再选择对应 track。"
            : "Switching language returns to the curriculum entry page."}
        </span>
      </div>
      <div className="language-switch">
        {languages.map((language) => (
          <Link
            className={`language-switch-link ${activeLanguage === language.id ? "language-switch-link-active" : ""}`}
            href={language.href}
            key={language.id}
          >
            {language.label}
          </Link>
        ))}
      </div>
    </div>
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

function ReviewedFeedbackPanel({ items }: { items: ReviewedSubjectiveFeedback[] }) {
  return (
    <section className="panel full-panel subjective-feedback-panel practice-feedback-panel">
      <div className="recommended-task-head">
        <div>
          <p className="eyebrow">Reviewed Written Work</p>
          <h2 className="panel-title">Feedback to use in this practice</h2>
        </div>
        <Link className="button-secondary" href="/review">
          Review queue
        </Link>
      </div>
      <div className="subjective-feedback-grid">
        {items.map((item) => (
          <div className="subjective-feedback-card" key={item.id}>
            <div className="tag-row">
              <span className="tag tag-gold">{item.scoreLabel}</span>
              {item.abilityTags.slice(0, 2).map((tag) => (
                <span className="tag tag-teal" key={tag}>{tag}</span>
              ))}
            </div>
            <h3>{item.problemTitle}</h3>
            <p>{item.feedback}</p>
            <p className="muted">{item.nextAction}</p>
            <div className="learning-plan-actions">
              <Link className="button" href={item.href}>
                Start repair set
              </Link>
              <Link className="button-secondary" href={`/practice?problemId=${encodeURIComponent(item.problem)}&autoGradableOnly=false`}>
                Reopen work
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
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

      {report.seniorDiagnosticFeedback && (
        <div className={`chapter-feedback-panel chapter-feedback-${statusClass(report.seniorDiagnosticFeedback.status)}`}>
          <div>
            <p className="eyebrow">高中诊断跟进</p>
            <h3>{report.seniorDiagnosticFeedback.title}</h3>
            <p>{report.seniorDiagnosticFeedback.evidence}</p>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <div>
                <strong>{report.seniorDiagnosticFeedback.diagnosticWeakness}</strong>
                <div className="muted">
                  {report.seniorDiagnosticFeedback.repaired
                    ? "本次专项练习已经给出原诊断薄弱点的修复证据。"
                    : "这个薄弱点还需要再做一轮更聚焦的修复。"}
                </div>
              </div>
              <div className="summary-percent">{report.seniorDiagnosticFeedback.statusLabel}</div>
            </div>
            <div className="summary-item">
              <div>
                <strong>下一步检查点</strong>
                <div className="muted">{report.seniorDiagnosticFeedback.nextAction}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {report.layerFeedback.length > 0 && (
        <div className="chapter-feedback-panel">
          <div>
            <p className="eyebrow">Chapter Layer Feedback</p>
            <h3>What this chapter quiz says</h3>
          </div>
          <div className="chapter-feedback-grid">
            {report.layerFeedback.map((item) => (
              <div className={`chapter-feedback-card chapter-feedback-${statusClass(item.status === "Secure" ? "Ready" : item.status === "Developing" ? "Developing" : "Needs Repair")}`} key={item.group}>
                <div className="trajectory-head">
                  <strong>{item.group}</strong>
                  <span>{item.totalCount > 0 ? `${item.accuracy}%` : "—"}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${item.totalCount > 0 ? item.accuracy : 0}%` }} />
                </div>
                <p>{item.guidance}</p>
                <small>
                  {item.correctCount}/{item.totalCount} correct · confidence {item.averageConfidence}/5 · {item.status}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

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
  const courseItems = uniqueBy(
    items.map((problem) => ({
      curriculumSystem: getProblemCurriculumSystem(problem),
      language: getProblemLanguage(problem),
      displayTrack: getProblemDisplayTrack(problem),
      course: problem.curriculum.course
    })),
    (item) => `${item.curriculumSystem}:${item.language}:${item.displayTrack}:${item.course}`
  );
  const themes = uniqueBy(
    items.map((problem) => ({
      curriculumSystem: getProblemCurriculumSystem(problem),
      language: getProblemLanguage(problem),
      displayTrack: getProblemDisplayTrack(problem),
      course: problem.curriculum.course,
      theme: problem.curriculum.theme
    })),
    (item) => `${item.curriculumSystem}:${item.language}:${item.displayTrack}:${item.course}:${item.theme}`
  );
  const chapters = uniqueBy(
    items.map((problem) => ({
      curriculumSystem: getProblemCurriculumSystem(problem),
      language: getProblemLanguage(problem),
      displayTrack: getProblemDisplayTrack(problem),
      course: problem.curriculum.course,
      theme: problem.curriculum.theme,
      chapter: problem.curriculum.chapter,
      chapterTitle: problem.curriculum.chapterTitle,
      sequence: problem.curriculum.sequence,
      count: items.filter((item) => item.curriculum.chapter === problem.curriculum.chapter).length
    })),
    (item) => item.chapter
  ).sort((a, b) => a.course.localeCompare(b.course) || a.sequence - b.sequence);

  return { courseItems, themes, chapters };
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
  const minSequence = Math.min(scope.minSequence || 0, scope.maxSequence || 0);
  const maxSequence = Math.max(scope.minSequence || 0, scope.maxSequence || 0);

  const filtered = items.filter((problem) => {
    if (scope.curriculumSystem !== ALL && getProblemCurriculumSystem(problem) !== scope.curriculumSystem) return false;
    if (scope.language !== ALL && getProblemLanguage(problem) !== scope.language) return false;
    if (scope.displayTrack !== ALL && getProblemDisplayTrack(problem) !== scope.displayTrack) return false;
    if (scope.course !== ALL && problem.curriculum.course !== scope.course) return false;
    if (scope.theme !== ALL && problem.curriculum.theme !== scope.theme) return false;
    if (scope.chapter !== ALL && problem.curriculum.chapter !== scope.chapter) return false;
    if (minSequence > 0 && problem.curriculum.sequence < minSequence) return false;
    if (maxSequence > 0 && problem.curriculum.sequence > maxSequence) return false;
    if (scope.autoGradableOnly && !problem.isAutoGradable) return false;
    if (scope.taxonomyLayer !== ALL && problem.taxonomy?.layer !== scope.taxonomyLayer) return false;
    if (scope.taxonomyStage !== ALL && problem.taxonomy?.stage !== scope.taxonomyStage) return false;
    if (scope.problemType !== ALL && problem.taxonomy?.problemType !== scope.problemType) return false;
    if (scope.responseMode !== ALL && (problem.responseSchema?.mode ?? "") !== scope.responseMode) return false;
    if (scope.cognitiveTag !== ALL && !problem.taxonomy?.cognitiveTags?.includes(scope.cognitiveTag)) return false;

    return problem.difficulty >= minDifficulty && problem.difficulty <= maxDifficulty;
  });

  return scope.layerStrategy === "balanced"
    ? selectBalancedLayerProblems(filtered, getPracticeSessionTarget(filtered.length, scope))
    : filtered;
}

type LayerSamplingPlan = {
  enabled: boolean;
  layerCounts: Array<{ key: string; count: number }>;
  targetCount: number;
  totalCount: number;
};

function selectBalancedLayerProblems(items: Problem[], targetCount: number) {
  if (items.length <= targetCount) {
    return [...items].sort(compareProblemForLayerLadder);
  }

  const targets = layerTargets(targetCount);
  const buckets = groupByLayer(items);
  const selected: Problem[] = [];

  targets.forEach((target) => {
    const bucket = buckets.get(target.group) ?? [];
    selected.push(...bucket.slice(0, Math.max(0, target.count - selected.filter((problem) => layerGroup(problem) === target.group).length)));
  });

  const selectedIds = new Set(selected.map((problem) => problem.id));
  const fallback = [...items]
    .sort(compareProblemForLayerLadder)
    .filter((problem) => !selectedIds.has(problem.id));

  return [...selected, ...fallback].slice(0, targetCount).sort(compareProblemForLayerLadder);
}

function buildLayerSamplingPlan(items: Problem[], scope: ScopeFilters): LayerSamplingPlan {
  const enabled = scope.mode === "practice" && scope.layerStrategy === "balanced";
  const targetCount = getPracticeSessionTarget(items.length, scope);

  return {
    enabled,
    layerCounts: countTaxonomy(items.slice(0, targetCount), (problem) => layerGroup(problem), ["Foundation", "Standard", "Honors", "Challenge"]),
    targetCount,
    totalCount: items.length
  };
}

function layerTargets(targetCount: number) {
  const foundation = targetCount >= 8 ? 2 : Math.max(1, Math.floor(targetCount * 0.25));
  const standard = targetCount >= 8 ? 3 : Math.max(1, Math.floor(targetCount * 0.4));
  const challenge = targetCount >= 8 ? 1 : targetCount >= 5 ? 1 : 0;
  const honors = Math.max(0, targetCount - foundation - standard - challenge);

  return [
    { group: "Foundation", count: foundation },
    { group: "Standard", count: standard },
    { group: "Honors", count: honors },
    { group: "Challenge", count: challenge }
  ];
}

function groupByLayer(items: Problem[]) {
  const groups = new Map<string, Problem[]>();

  [...items].sort(compareProblemForLayerLadder).forEach((problem) => {
    const group = layerGroup(problem);
    groups.set(group, [...(groups.get(group) ?? []), problem]);
  });

  return groups;
}

function layerGroup(problem: Problem) {
  const layer = problem.taxonomy?.layer;
  if (layer === "Foundation") return "Foundation";
  if (layer === "Standard") return "Standard";
  if (layer === "AMC8" || layer === "AMC8 Stretch") return "Challenge";
  if (problem.difficulty >= 5 || problem.taxonomy?.stage === "AMC8 Transfer") return "Challenge";
  return "Honors";
}

function compareProblemForLayerLadder(left: Problem, right: Problem) {
  return (
    layerGroupRank(layerGroup(left)) - layerGroupRank(layerGroup(right)) ||
    left.difficulty - right.difficulty ||
    (left.curriculum.sequence ?? 0) - (right.curriculum.sequence ?? 0) ||
    left.id.localeCompare(right.id)
  );
}

function layerGroupRank(group: string) {
  if (group === "Foundation") return 0;
  if (group === "Standard") return 1;
  if (group === "Honors") return 2;
  if (group === "Challenge") return 3;
  return 4;
}

function filterTaxonomyBaseProblems(items: Problem[], scope: ScopeFilters) {
  return items.filter((problem) => {
    if (scope.curriculumSystem !== ALL && getProblemCurriculumSystem(problem) !== scope.curriculumSystem) return false;
    if (scope.language !== ALL && getProblemLanguage(problem) !== scope.language) return false;
    if (scope.displayTrack !== ALL && getProblemDisplayTrack(problem) !== scope.displayTrack) return false;
    if (scope.course !== ALL && problem.curriculum.course !== scope.course) return false;
    if (scope.theme !== ALL && problem.curriculum.theme !== scope.theme) return false;
    if (scope.chapter !== ALL && problem.curriculum.chapter !== scope.chapter) return false;
    if (scope.minSequence > 0 && problem.curriculum.sequence < scope.minSequence) return false;
    if (scope.maxSequence > 0 && problem.curriculum.sequence > scope.maxSequence) return false;
    if (scope.autoGradableOnly && !problem.isAutoGradable) return false;
    if (scope.responseMode !== ALL && (problem.responseSchema?.mode ?? "") !== scope.responseMode) return false;

    return true;
  });
}

function filterReviewedFeedbackForScope(
  items: ReviewedSubjectiveFeedback[],
  scope: ScopeFilters,
  currentProblem: Problem
) {
  if (items.length === 0) return [];

  const scopeConcepts = new Set([
    ...currentProblem.concepts,
    ...scope.reviewConcepts,
    ...scope.planConcepts
  ]);

  const matched = items.filter((item) => {
    if (item.problem === currentProblem.id) return true;
    if (item.concepts.some((concept) => scopeConcepts.has(concept))) return true;
    if (scope.course !== ALL && item.href.includes(`course=${encodeURIComponent(scope.course)}`)) return true;
    return false;
  });

  return matched.length > 0 ? matched : items.slice(0, 1);
}

function getPracticeSessionTarget(poolSize: number, scope: ScopeFilters) {
  const requested = scope.maxItems > 0 ? scope.maxItems : DEFAULT_PRACTICE_SESSION_LENGTH;
  if (poolSize <= 0) return DEFAULT_PRACTICE_SESSION_LENGTH;
  return Math.min(requested, poolSize);
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
  const poolLabel = scope.autoGradableOnly
    ? `${stats.poolSize} auto-gradable item(s)`
    : `${stats.poolSize} reviewable item(s)`;
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
  const layerFeedback = buildLayerFeedback(chronological);
  const focusConcepts = summarizeFocusConcepts(chronological);
  const strongConcepts = summarizeStrongConcepts(chronological, focusConcepts);
  const status = getPracticeStatus(accuracy, focusConcepts.length, averageConfidence);
  const seniorDiagnosticFeedback = buildSeniorDiagnosticFeedback(scope, status, accuracy, chronological.length, focusConcepts);
  const nextStep = buildNextPracticeStep(status, focusConcepts, scope, studentModel, layerFeedback, seniorDiagnosticFeedback);

  return {
    status,
    title: getPracticeTitle(status, scope),
    summary: buildPracticeSummary(status, accuracy, chronological.length, focusConcepts, averageTimeSeconds, averageConfidence),
    accuracy,
    correctCount,
    totalCount: chronological.length,
    averageTimeSeconds,
    averageConfidence,
    layerFeedback,
    focusConcepts,
    strongConcepts,
    seniorDiagnosticFeedback,
    ...nextStep
  };
}

function buildLayerFeedback(attempts: AttemptLog[]): LayerFeedback[] {
  const groups = ["Foundation", "Standard", "Honors", "Challenge"];

  return groups.map((group) => {
    const groupAttempts = attempts.filter((attempt) => layerGroup(attempt.problem) === group);
    const totalCount = groupAttempts.length;
    const correctCount = groupAttempts.filter((attempt) => attempt.correct).length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const averageConfidence = totalCount > 0
      ? Math.round((groupAttempts.reduce((sum, attempt) => sum + attempt.confidence, 0) / totalCount) * 10) / 10
      : 0;
    const status = getLayerFeedbackStatus(totalCount, accuracy, averageConfidence);

    return {
      accuracy,
      averageConfidence,
      correctCount,
      group,
      guidance: buildLayerGuidance(group, status, totalCount),
      status,
      totalCount
    };
  });
}

function getLayerFeedbackStatus(
  totalCount: number,
  accuracy: number,
  averageConfidence: number
): LayerFeedback["status"] {
  if (totalCount === 0) return "Not Sampled";
  if (accuracy >= 80 && averageConfidence >= 3) return "Secure";
  if (accuracy >= 50) return "Developing";
  return "Needs Repair";
}

function buildLayerGuidance(group: string, status: LayerFeedback["status"], totalCount: number) {
  if (status === "Not Sampled") return `${group} was not sampled in this session.`;

  const secureGuidance: Record<string, string> = {
    Foundation: "Foundation is stable enough; keep it warm while moving into standard methods.",
    Standard: "Standard methods are usable; the next useful work is mixed practice or light transfer.",
    Honors: "Honors-level reasoning is holding; challenge work can be introduced carefully.",
    Challenge: "Challenge transfer is ready for broader or more open-ended problems."
  };
  const developingGuidance: Record<string, string> = {
    Foundation: "Foundation is partially there, but calculation or definitions still need a short repair set.",
    Standard: "Core method is developing; repeat a balanced set before raising difficulty.",
    Honors: "Multi-step reasoning is not automatic yet; review the worked explanations before another challenge.",
    Challenge: "Transfer is promising but not stable; do one more standard-to-honors bridge set first."
  };
  const repairGuidance: Record<string, string> = {
    Foundation: "Foundation needs repair before this chapter should advance.",
    Standard: "Standard method is the bottleneck; focus on examples and structured steps.",
    Honors: "Honors tasks are too early right now; rebuild the standard layer first.",
    Challenge: "Challenge transfer should pause until lower layers are more stable."
  };

  if (status === "Secure") return secureGuidance[group] ?? `${group} is secure across ${totalCount} sampled item(s).`;
  if (status === "Developing") return developingGuidance[group] ?? `${group} is developing across ${totalCount} sampled item(s).`;
  return repairGuidance[group] ?? `${group} needs repair across ${totalCount} sampled item(s).`;
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
  if (scope.layerStrategy === "balanced" && scope.chapter !== ALL) {
    if (status === "Ready") return "Chapter quiz complete: ready to extend";
    if (status === "Developing") return "Chapter quiz complete: consolidate the middle layer";
    return "Chapter quiz complete: repair before advancing";
  }

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

function buildSeniorDiagnosticFeedback(
  scope: ScopeFilters,
  status: PracticeSessionReport["status"],
  accuracy: number,
  totalCount: number,
  focusConcepts: string[]
): SeniorDiagnosticFeedback | undefined {
  if (scope.sessionSource !== "senior-diagnostic-report" || scope.course !== "CN Senior High Math") return undefined;

  const diagnosticWeakness = scope.sessionTitle || getSeniorChapterTitle(scope.chapter) || "高中诊断跟进";
  const repaired = status === "Ready";
  const partial = status === "Developing";
  const title = repaired
    ? `${diagnosticWeakness}：已基本修复`
    : partial
      ? `${diagnosticWeakness}：正在稳定`
      : `${diagnosticWeakness}：仍需修复`;
  const evidence = `本次高中专项跟进共完成 ${totalCount} 题，正确率 ${accuracy}%，用于验证 Diagnostic 推荐的薄弱点是否已经修复。`;
  const nextAction = repaired
    ? "可以进入下一个高中检查点，或用一次短诊断确认迁移是否稳定。"
    : partial
      ? "先重复一组聚焦确认题，再进入更高难度或更综合的高中章节。"
      : focusConcepts.length > 0
        ? `先修复 ${focusConcepts.slice(0, 2).map(formatTaxonomyLabel).join(", ")}，再重新测试这个高中专题。`
        : "先从基础层重复这个高中章节，再进行专题复测。";
  const statusLabel = status === "Ready" ? "可推进" : status === "Developing" ? "需巩固" : "需修复";

  return {
    title,
    status,
    evidence,
    diagnosticWeakness,
    repaired,
    nextAction,
    statusLabel
  };
}

function buildNextPracticeStep(
  status: PracticeSessionReport["status"],
  focusConcepts: string[],
  scope: ScopeFilters,
  studentModel: StudentModel | null,
  layerFeedback: LayerFeedback[] = [],
  seniorDiagnosticFeedback?: SeniorDiagnosticFeedback
): Pick<PracticeSessionReport, "nextTitle" | "nextReason" | "nextHref" | "secondaryTitle" | "secondaryHref"> {
  const seniorStep = buildSeniorDiagnosticNextStep(scope, focusConcepts, seniorDiagnosticFeedback);
  if (seniorStep) return seniorStep;

  const chapterLayerStep = buildChapterLayerNextStep(scope, layerFeedback, focusConcepts);
  if (chapterLayerStep) return chapterLayerStep;

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

function buildSeniorDiagnosticNextStep(
  scope: ScopeFilters,
  focusConcepts: string[],
  feedback?: SeniorDiagnosticFeedback
): Pick<PracticeSessionReport, "nextTitle" | "nextReason" | "nextHref" | "secondaryTitle" | "secondaryHref"> | null {
  if (!feedback) return null;

  if (feedback.repaired) {
    return {
      nextTitle: "选择下一个高中检查点",
      nextReason: feedback.nextAction,
      nextHref: "/curriculum?language=zh",
      secondaryTitle: "重新做诊断检查",
      secondaryHref: "/diagnostic"
    };
  }

  if (feedback.status === "Developing") {
    return {
      nextTitle: "重复当前高中检查点",
      nextReason: feedback.nextAction,
      nextHref: repeatCurrentSeniorHref(scope, "senior-diagnostic-confirmation"),
      secondaryTitle: "返回学习首页",
      secondaryHref: "/dashboard"
    };
  }

  const repairConcepts = focusConcepts.length ? focusConcepts.slice(0, 3) : [];

  return {
    nextTitle: "修复当前高中薄弱点",
    nextReason: feedback.nextAction,
    nextHref: repairConcepts.length ? buildPlanHref(repairConcepts, 6) : repeatCurrentSeniorHref(scope, "senior-diagnostic-repair"),
    secondaryTitle: "重做高中章节专项",
    secondaryHref: repeatCurrentSeniorHref(scope, "senior-diagnostic-retry")
  };
}

function buildChapterLayerNextStep(
  scope: ScopeFilters,
  layerFeedback: LayerFeedback[],
  focusConcepts: string[]
): Pick<PracticeSessionReport, "nextTitle" | "nextReason" | "nextHref" | "secondaryTitle" | "secondaryHref"> | null {
  if (scope.layerStrategy !== "balanced" || scope.chapter === ALL) return null;

  const foundation = layerFeedback.find((item) => item.group === "Foundation");
  const standard = layerFeedback.find((item) => item.group === "Standard");
  const honors = layerFeedback.find((item) => item.group === "Honors");
  const challenge = layerFeedback.find((item) => item.group === "Challenge");
  const baseParams = new URLSearchParams({
    autoGradableOnly: String(scope.autoGradableOnly),
    chapter: scope.chapter,
    course: scope.course,
    curriculumSystem: scope.curriculumSystem,
    language: scope.language,
    layerStrategy: "balanced",
    maxItems: String(scope.maxItems || 8),
    sessionSource: "chapter-feedback",
    track: scope.displayTrack
  });

  if (scope.theme !== ALL) baseParams.set("theme", scope.theme);

  const hrefForLayer = (layer: string) => {
    const params = new URLSearchParams(baseParams);
    params.delete("layerStrategy");
    params.set("layer", layer);
    params.set("maxItems", "6");
    params.set("sessionTitle", `${scope.sessionTitle || "Chapter quiz"} · ${layer} repair`);
    return `/practice?${params.toString()}`;
  };

  const repeatHref = () => {
    const params = new URLSearchParams(baseParams);
    params.set("sessionTitle", `${scope.sessionTitle || "Chapter quiz"} · balanced retry`);
    return `/practice?${params.toString()}`;
  };

  if (foundation && foundation.status !== "Secure") {
    return {
      nextTitle: "Repair the foundation layer",
      nextReason: foundation.guidance,
      nextHref: hrefForLayer("Foundation"),
      secondaryTitle: "Open dashboard",
      secondaryHref: "/dashboard"
    };
  }

  if (standard && standard.status !== "Secure") {
    return {
      nextTitle: "Repeat standard methods",
      nextReason: standard.guidance,
      nextHref: hrefForLayer("Standard"),
      secondaryTitle: "Repeat balanced quiz",
      secondaryHref: repeatHref()
    };
  }

  if (honors && honors.status !== "Secure") {
    return {
      nextTitle: "Bridge into honors reasoning",
      nextReason: honors.guidance,
      nextHref: hrefForLayer("Honors"),
      secondaryTitle: "Repeat balanced quiz",
      secondaryHref: repeatHref()
    };
  }

  if (challenge && challenge.totalCount > 0 && challenge.status !== "Secure") {
    return {
      nextTitle: "Stabilize before challenge transfer",
      nextReason: challenge.guidance,
      nextHref: hrefForLayer("Honors"),
      secondaryTitle: "Repeat balanced quiz",
      secondaryHref: repeatHref()
    };
  }

  if (focusConcepts.length > 0) {
    return {
      nextTitle: "Extend this chapter",
      nextReason: "The chapter layers are stable enough to add a broader mixed or transfer set.",
      nextHref: buildPlanHref(focusConcepts.slice(0, 3), 8),
      secondaryTitle: "Open dashboard",
      secondaryHref: "/dashboard"
    };
  }

  return {
    nextTitle: "Move to the next chapter checkpoint",
    nextReason: "All sampled layers are stable enough to stop this loop and continue the learning path.",
    nextHref: "/curriculum?language=zh",
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

function repeatCurrentSeniorHref(scope: ScopeFilters, sessionSource: string) {
  const params = new URLSearchParams({
    autoGradableOnly: String(scope.autoGradableOnly),
    course: scope.course,
    curriculumSystem: scope.curriculumSystem,
    language: scope.language,
    layerStrategy: scope.layerStrategy,
    maxItems: String(scope.maxItems || 8),
    sessionSource,
    sessionTitle: scope.sessionTitle || getSeniorChapterTitle(scope.chapter) || "高中诊断跟进",
    sessionGoal: scope.sessionGoal || "重复本组高中专项跟进，确认诊断薄弱点是否已经修复。",
    track: scope.displayTrack
  });

  if (scope.chapter !== ALL) params.set("chapter", scope.chapter);
  if (scope.theme !== ALL) params.set("theme", scope.theme);
  if (scope.responseMode !== ALL) params.set("responseMode", scope.responseMode);

  return `/practice?${params.toString()}`;
}

function getSeniorChapterTitle(chapter: string) {
  const titles: Record<string, string> = {
    "subjective-v0-cn-g10-functions": "高一函数基础",
    "subjective-v0-cn-g10-quadratics": "高一二次函数",
    "subjective-v0-cn-g10-trigonometry": "高一三角函数",
    "subjective-v0-cn-g11-sequences": "高二数列",
    "subjective-v0-cn-g11-analytic-geometry": "高二解析几何",
    "subjective-v0-cn-g12-derivatives": "高三导数",
    "subjective-v0-cn-g12-probability-statistics": "高三概率统计"
  };

  return titles[chapter];
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

function buildConceptSummary(items: Problem[], mastery: Record<string, number>) {
  const groups = new Map<string, {
    concept: string;
    count: number;
    layers: Set<string>;
    stages: Set<string>;
  }>();

  items.forEach((problem) => {
    problem.concepts.forEach((concept) => {
      const current = groups.get(concept) ?? {
        concept,
        count: 0,
        layers: new Set<string>(),
        stages: new Set<string>()
      };

      current.count += 1;
      if (problem.taxonomy?.layer) current.layers.add(problem.taxonomy.layer);
      if (problem.taxonomy?.stage) current.stages.add(problem.taxonomy.stage);
      groups.set(concept, current);
    });
  });

  return [...groups.values()]
    .map((item) => ({
      concept: item.concept,
      count: item.count,
      layers: [...item.layers],
      mastery: mastery[item.concept],
      stages: [...item.stages]
    }))
    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));
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
  const curriculumSystem = searchParams.get("curriculumSystem") || defaultScope.curriculumSystem;
  const language = searchParams.get("language") || defaultScope.language;
  const preferences = readSessionPreferences();

  return {
    mode: getMode(searchParams.get("mode")),
    problemId: searchParams.get("problemId") || defaultScope.problemId,
    layerStrategy: getLayerStrategy(searchParams.get("layerStrategy")),
    sessionTitle: cleanSessionText(searchParams.get("sessionTitle")),
    sessionGoal: cleanSessionText(searchParams.get("sessionGoal")),
    sessionSource: cleanSessionText(searchParams.get("sessionSource")),
    returnHref: safeReturnHref(searchParams.get("returnHref")),
    reviewConcepts: searchParams.get("mode") === "review" ? splitConcepts(searchParams.get("concepts")) : [],
    planConcepts: searchParams.get("mode") === "plan" ? splitConcepts(searchParams.get("concepts")) : [],
    maxItems: toMaxItems(searchParams.get("maxItems"), preferences.practiceItemCount),
    curriculumSystem,
    language,
    displayTrack: searchParams.get("track") || inferDefaultDisplayTrack(curriculumSystem, language),
    course: searchParams.get("course") || defaultScope.course,
    theme: searchParams.get("theme") || defaultScope.theme,
    chapter: searchParams.get("chapter") || defaultScope.chapter,
    minSequence: toSequence(searchParams.get("minSequence")),
    maxSequence: toSequence(searchParams.get("maxSequence")),
    minDifficulty: toDifficulty(searchParams.get("minDifficulty"), defaultScope.minDifficulty),
    maxDifficulty: toDifficulty(searchParams.get("maxDifficulty"), defaultScope.maxDifficulty),
    taxonomyLayer: searchParams.get("layer") || defaultScope.taxonomyLayer,
    taxonomyStage: searchParams.get("stage") || defaultScope.taxonomyStage,
    problemType: searchParams.get("problemType") || defaultScope.problemType,
    responseMode: searchParams.get("responseMode") || defaultScope.responseMode,
    cognitiveTag: searchParams.get("cognitiveTag") || defaultScope.cognitiveTag,
    autoGradableOnly: searchParams.get("autoGradableOnly") !== "false"
  };
}

function inferDefaultDisplayTrack(curriculumSystem: string, language: string) {
  return CONTENT_PROFILES.find((profile) =>
    profile.curriculumSystem === curriculumSystem &&
    profile.language === language
  )?.displayTrack ?? defaultScope.displayTrack;
}

function getMode(value: string | null): ScopeFilters["mode"] {
  if (value === "review" || value === "plan") return value;
  return defaultScope.mode;
}

function getLayerStrategy(value: string | null): ScopeFilters["layerStrategy"] {
  return value === "balanced" ? "balanced" : defaultScope.layerStrategy;
}

function toMaxItems(value: string | null, fallback = defaultScope.maxItems) {
  const parsed = Number(value);
  return clampItemCount(parsed, 3, 40, fallback);
}

function clampItemCount(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function toDifficulty(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : fallback;
}

function toSequence(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
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
    left.layerStrategy === right.layerStrategy &&
    left.sessionTitle === right.sessionTitle &&
    left.sessionGoal === right.sessionGoal &&
    left.sessionSource === right.sessionSource &&
    left.returnHref === right.returnHref &&
    left.reviewConcepts.join(",") === right.reviewConcepts.join(",") &&
    left.planConcepts.join(",") === right.planConcepts.join(",") &&
    left.maxItems === right.maxItems &&
    left.curriculumSystem === right.curriculumSystem &&
    left.language === right.language &&
    left.displayTrack === right.displayTrack &&
    left.theme === right.theme &&
    left.chapter === right.chapter &&
    left.minSequence === right.minSequence &&
    left.maxSequence === right.maxSequence &&
    left.minDifficulty === right.minDifficulty &&
    left.maxDifficulty === right.maxDifficulty &&
    left.taxonomyLayer === right.taxonomyLayer &&
    left.taxonomyStage === right.taxonomyStage &&
    left.problemType === right.problemType &&
    left.responseMode === right.responseMode &&
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

function getProblemCurriculumSystem(problem: Problem) {
  return problem.locale?.curriculumSystem ?? inferCurriculumSystem(problem);
}

function getProblemLanguage(problem: Problem) {
  return problem.locale?.language ?? "en";
}

function getProblemDisplayTrack(problem: Problem) {
  return problem.locale?.displayTrack ?? inferDisplayTrack(problem);
}

function inferCurriculumSystem(problem: Problem) {
  if (problem.curriculum.course.startsWith("AMC")) return "AMC";
  return "US";
}

function inferDisplayTrack(problem: Problem) {
  if (problem.curriculum.course.startsWith("AMC")) return "AMC Competition";
  return "US Core";
}

function formatLanguage(language: string) {
  if (language === "zh") return "中文";
  if (language === "bilingual") return "Bilingual";
  return "English";
}

function getActiveContentProfile(scope: ScopeFilters) {
  return CONTENT_PROFILES.find((profile) =>
    scope.curriculumSystem === profile.curriculumSystem &&
    scope.language === profile.language &&
    scope.displayTrack === profile.displayTrack
  );
}

function isChineseScope(scope: ScopeFilters) {
  return scope.language === "zh" || scope.curriculumSystem === "CN" || scope.curriculumSystem === "Olympiad";
}

function formatSelectedProfile(scope: ScopeFilters) {
  const profile = getActiveContentProfile(scope);
  if (profile) return profile.title;
  if (scope.curriculumSystem === ALL && scope.language === ALL && scope.displayTrack === ALL) return "";
  return [scope.curriculumSystem, formatLanguage(scope.language), scope.displayTrack]
    .filter((item) => item && item !== ALL)
    .join(" / ");
}

function formatCourseLabel(course: string) {
  const labels: Record<string, string> = {
    "CN Primary Math": "小学数学",
    "CN Junior High Math": "初中数学",
    "CN Senior High Math": "高中数学",
    "CN Olympiad Lite": "中文奥数 Lite"
  };

  return labels[course] ?? course;
}

function getScopeCopy(chineseContent: boolean) {
  if (!chineseContent) {
    return {
      adaptiveStage: "Adaptive stage",
      allChapters: "All chapters",
      allCognitiveTags: "All cognitive tags",
      allCourses: "All courses",
      allLayers: "All layers",
      allStages: "All stages",
      allThemes: "All themes",
      allResponseModes: "All response modes",
      allTypes: "All types",
      autoGradableOnly: "Auto-gradable only",
      chapter: "Chapter",
      cognitiveTag: "Cognitive tag",
      course: "Course",
      difficultyLayer: "Difficulty layer",
      items: "items",
      maxDifficulty: "Max difficulty",
      minDifficulty: "Min difficulty",
      problemType: "Problem type",
      responseMode: "Response mode",
      sessionItemCount: "Items this session",
      theme: "Theme"
    };
  }

  return {
    adaptiveStage: "学习阶段",
    allChapters: "全部章节",
    allCognitiveTags: "全部认知标签",
    allCourses: "全部课程",
    allLayers: "全部难度层",
    allStages: "全部阶段",
    allThemes: "全部主题",
    allResponseModes: "全部作答类型",
    allTypes: "全部题型",
    autoGradableOnly: "仅自动判分",
    chapter: "章节",
    cognitiveTag: "认知标签",
    course: "课程",
    difficultyLayer: "难度层",
    items: "题",
    maxDifficulty: "最高难度",
    minDifficulty: "最低难度",
    problemType: "题型",
    responseMode: "作答类型",
    sessionItemCount: "本次题数",
    theme: "主题"
  };
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

function hasWorkSubmission(value: WorkSubmission) {
  return Boolean(
    value.writtenWork?.trim() ||
    value.drawingDataUrl ||
    value.uploadedFileName
  );
}

function buildManualReviewResult(problem: Problem, pool: Problem[], state: StudentState) {
  const nextProblem = pool.find((candidate) => candidate.id !== problem.id) ?? problem;
  const targetConcept = problem.primaryConcept || problem.concepts[0];
  const explanation: RecommendationExplanation = {
    priority: "balanced",
    summary: "Manual review is pending, so the adaptive model is waiting for reviewer scoring before changing mastery.",
    targetConcept,
    targetMastery: targetConcept ? state.mastery[targetConcept] ?? 0.5 : undefined,
    abilityTarget: "reasoning",
    pathMode: "balanced",
    pathStep: "subjective-review",
    nextAction: "review",
    layer: problem.taxonomy?.layer,
    stage: problem.taxonomy?.stage,
    problemType: problem.taxonomy?.problemType,
    cognitiveTags: problem.taxonomy?.cognitiveTags ?? [],
    signals: ["manual_review_pending", "student_work_collected"]
  };
  const recommendation: Recommendation = {
    explanation,
    problem: nextProblem,
    reason: explanation.summary,
    score: 0,
    targetConcept,
    targetMastery: targetConcept ? state.mastery[targetConcept] ?? 0.5 : undefined
  };

  return {
    fluency_concepts: [] as string[],
    next_problem: nextProblem,
    prerequisite_gaps: [] as PrerequisiteGap[],
    recommendation,
    remediation: false,
    updated_state: state,
    weak_concepts: [] as string[]
  };
}

function shouldQueueSubjectiveReview(problem: Problem, submission: WorkSubmission) {
  return Boolean(problem.responseSchema || problem.answerType === "manual" || hasWorkSubmission(submission));
}

function inferResponseSchema(problem: Problem): NonNullable<Problem["responseSchema"]> {
  const tags = [
    problem.answerType,
    problem.taxonomy?.problemType ?? "",
    ...(problem.taxonomy?.cognitiveTags ?? [])
  ].join(" ");
  const mode = /proof|证明|deduction|geometric reasoning/.test(tags)
    ? "proof"
    : /model|application|word|应用/.test(tags)
      ? "application"
      : problem.answerType === "manual"
        ? "constructed_response"
        : "short_answer";

  return {
    version: "v0",
    mode,
    requiresWork: mode !== "short_answer",
    acceptedInputs: ["text", "handwriting", "image_upload", "pdf_upload"],
    rubric: [
      {
        id: "setup",
        label: "Setup",
        maxScore: 2,
        description: "Identifies the right quantities, diagram, equation, or proof target."
      },
      {
        id: "reasoning",
        label: "Reasoning",
        maxScore: 4,
        description: "Uses valid mathematical steps and connects them in a clear order."
      },
      {
        id: "answer",
        label: "Conclusion",
        maxScore: 2,
        description: "States the final answer or proof conclusion in the requested form."
      }
    ],
    reviewPolicy: {
      aiAssist: true,
      autoGrade: false,
      humanReview: true
    }
  };
}

function canvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
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

function WorkSubmissionPanel({
  disabled,
  onChange,
  value
}: {
  disabled: boolean;
  onChange: (value: WorkSubmission) => void;
  value: WorkSubmission;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  function updateValue(next: Partial<WorkSubmission>) {
    onChange({
      ...value,
      ...next
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = canvasPoint(canvas, event);

    drawingRef.current = true;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#17324d";
    context.beginPath();
    context.moveTo(point.x, point.y);
    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = canvasPoint(canvas, event);

    context.lineTo(point.x, point.y);
    context.stroke();
    updateValue({ drawingDataUrl: canvas.toDataURL("image/png") });
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    updateValue({ drawingDataUrl: undefined });
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      updateValue({ uploadedFileName: undefined, uploadedFileType: undefined });
      return;
    }

    updateValue({
      uploadedFileName: file.name,
      uploadedFileType: file.type || "unknown"
    });
  }

  return (
    <div className="work-submission-panel">
      <div className="work-submission-head">
        <div>
          <span className="eyebrow">Solution Work</span>
          <strong>Write, draw, or upload your process</strong>
        </div>
        <button
          className="button-secondary compact-toggle"
          disabled={disabled}
          onClick={() => {
            clearCanvas();
            onChange({});
          }}
          type="button"
        >
          Clear
        </button>
      </div>
      <textarea
        className="work-textarea"
        disabled={disabled}
        onChange={(event) => updateValue({ writtenWork: event.target.value })}
        placeholder="Type equations, reasoning steps, or a short proof outline."
        value={value.writtenWork ?? ""}
      />
      <canvas
        aria-label="Handwritten solution canvas"
        className="work-canvas"
        height={220}
        onPointerCancel={stopDrawing}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        ref={canvasRef}
        width={760}
      />
      <label className="work-upload" htmlFor="work-upload-input">
        Upload solution image or PDF
        <input
          accept="image/*,.pdf"
          disabled={disabled}
          id="work-upload-input"
          onChange={handleUpload}
          type="file"
        />
      </label>
      {value.uploadedFileName && (
        <div className="muted">
          Attached: {value.uploadedFileName}
        </div>
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
      <p><MathText text={text} /></p>
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

function LayerSamplingPanel({ plan }: { plan: LayerSamplingPlan }) {
  return (
    <div className="layer-sampling-panel">
      <div>
        <p className="eyebrow">Layer Sampling</p>
        <h3>Foundation → Standard → Honors → Challenge</h3>
      </div>
      <div className="layer-sampling-grid">
        {plan.layerCounts.map((item) => (
          <div className="layer-sampling-chip" key={item.key}>
            <span>{item.key}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        {plan.targetCount} item session selected from {plan.totalCount} eligible problem(s).
      </p>
    </div>
  );
}

function ConceptSummaryPanel({
  concepts
}: {
  concepts: ReturnType<typeof buildConceptSummary>;
}) {
  const visibleConcepts = concepts.slice(0, 12);

  return (
    <div className="concept-summary-panel">
      <div className="concept-summary-head">
        <div>
          <p className="eyebrow">Concept Summary</p>
          <h3>Knowledge points in this range</h3>
        </div>
        <span className="tag tag-gold">{concepts.length} concept(s)</span>
      </div>
      <div className="concept-summary-grid">
        {visibleConcepts.map((item) => (
          <Link
            className="concept-summary-card"
            href={buildPlanHref([item.concept], 8)}
            key={item.concept}
          >
            <div className="trajectory-head">
              <strong>{formatTaxonomyLabel(item.concept)}</strong>
              <span>{item.count}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.round((item.mastery ?? 0.5) * 100)}%` }}
              />
            </div>
            <div className="muted">
              Mastery {Math.round((item.mastery ?? 0.5) * 100)}% · {item.stages.slice(0, 2).join(", ") || "mixed stage"}
            </div>
          </Link>
        ))}
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
