"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import conceptsData from "../../data/concepts.json";
import problemsData from "../../data/problems.json";
import { AdaptiveEngine, buildConceptGraph, checkProblemAnswer, Problem, StudentState, type AnswerChoice, type ConceptNode, type PrerequisiteGap } from "../../../../packages/adaptive-engine";
import { AssessmentReport, buildAssessmentReport } from "../shared/assessmentReport";
import { buildLearningPlan, LearningPlan } from "../shared/learningPlan";
import {
  clearDiagnosticLogs,
  createPracticeLog,
  readDiagnosticLogs,
  readStudentModel,
  writeAssessmentReport,
  writeDiagnosticLogs,
  writeLearningPlan,
  writeStudentModel
} from "../shared/storage";
import { summarizeDiagnosticCalibration } from "../shared/diagnosticCalibration";
import { updateStudentModel } from "../shared/studentModel";
import { auditDiagnosticBlueprint, initialAssessmentBlueprint, selectDiagnosticProblems, type AssessmentSlot } from "./initialAssessment";

type DiagnosticAttempt = {
  slot: AssessmentSlot;
  problem: Problem;
  submittedAnswer: string;
  correct: boolean;
  answerReason: string;
  recommendationReason: string;
  prerequisiteGaps: PrerequisiteGap[];
  responseTimeSeconds: number;
  confidence: number;
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Problem["distractors"] extends Array<infer T> ? T : never;
};

const allProblems = problemsData as Problem[];
const conceptGraph = buildConceptGraph(conceptsData as ConceptNode[]);
const diagnosticProblems = selectDiagnosticProblems(initialAssessmentBlueprint, allProblems);
const diagnosticProblemCount = diagnosticProblems.length;
const diagnosticBlueprintAudit = auditDiagnosticBlueprint(initialAssessmentBlueprint, allProblems, diagnosticProblems);
const initialState: StudentState = { mastery: {}, history: [] };

export default function DiagnosticPage() {
  const engine = useMemo(() => new AdaptiveEngine(allProblems, conceptGraph), []);
  const [studentState, setStudentState] = useState<StudentState>(initialState);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [feedback, setFeedback] = useState<DiagnosticAttempt | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [assessmentReport, setAssessmentReport] = useState<AssessmentReport | null>(null);
  const [pending, setPending] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [problemStartedAt, setProblemStartedAt] = useState(() => Date.now());

  const currentItem = diagnosticProblems[index];
  const currentProblem = currentItem?.problem;
  const currentSlot = currentItem?.slot;
  const isComplete = index >= diagnosticProblemCount;
  const accuracy =
    attempts.length === 0
      ? 0
      : Math.round((attempts.filter((item) => item.correct).length / attempts.length) * 100);
  const currentLogs = useMemo(() => readDiagnosticLogs(), [attempts.length, feedback, pending]);
  const calibrationSummary = useMemo(
    () => summarizeDiagnosticCalibration(currentLogs, diagnosticBlueprintAudit.expectedSlotsByStage),
    [currentLogs]
  );

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || pending || !currentProblem) return;

    const answerCheck = checkProblemAnswer({
      submitted: answer,
      expected: currentProblem.answer,
      choices: currentProblem.choices,
      distractors: currentProblem.distractors
    });
    const responseTimeSeconds = secondsSince(problemStartedAt);
    const result = engine.run(studentState, {
      problem: currentProblem,
      correct: answerCheck.correct,
      responseTimeSeconds,
      confidence
    });
    const attempt = {
      slot: currentSlot,
      problem: currentProblem,
      submittedAnswer: answer,
      correct: answerCheck.correct,
      answerReason: answerCheck.reason,
      recommendationReason: result.recommendation.reason,
      prerequisiteGaps: result.prerequisite_gaps,
      responseTimeSeconds,
      confidence
    };
    const log = createPracticeLog({
      step: attempts.length,
      problem: currentProblem,
      selectedChoiceLabel: answerCheck.selectedChoiceLabel,
      selectedChoiceValue: answerCheck.selectedChoiceValue,
      selectedDistractor: answerCheck.selectedDistractor,
      diagnosticSlot: currentSlot.id,
      diagnosticStage: currentSlot.stage,
      assessmentGoal: currentSlot.goal,
      correct: answerCheck.correct,
      weakConcepts: result.weak_concepts,
      fluencyConcepts: result.fluency_concepts,
      prerequisiteGaps: simplifyPrerequisiteGaps(result.prerequisite_gaps),
      remediation: result.remediation,
      nextProblem: result.next_problem,
      mastery: result.updated_state.mastery,
      recommendationReason: result.recommendation.reason,
      recommendationExplanation: result.recommendation.explanation,
      recommendationScore: Math.round(result.recommendation.score),
      responseTimeSeconds,
      confidence
    });

    const nextLogs = [...readDiagnosticLogs(), log];
    const diagnosticComplete = attempts.length + 1 >= diagnosticProblemCount;
    const nextStudentModel = updateStudentModel(readStudentModel(), {
      problem: currentProblem,
      correct: answerCheck.correct,
      mastery: result.updated_state.mastery,
      selectedDistractor: answerCheck.selectedDistractor,
      responseTimeSeconds,
      confidence
    });
    const nextPlan = diagnosticComplete ? buildLearningPlan(nextLogs, allProblems, nextStudentModel) : null;
    const nextReport = diagnosticComplete ? buildAssessmentReport(nextLogs, nextStudentModel) : null;

    setStudentState(result.updated_state);
    setAttempts((current) => [...current, attempt]);
    writeDiagnosticLogs(nextLogs);
    writeStudentModel(nextStudentModel);
    if (nextPlan) {
      writeLearningPlan(nextPlan);
      setLearningPlan(nextPlan);
    }
    if (nextReport) {
      writeAssessmentReport(nextReport);
      setAssessmentReport(nextReport);
    }
    setFeedback(attempt);
    setPending(true);
  }

  function continueDiagnostic() {
    setIndex((current) => current + 1);
    setAnswer("");
    setFeedback(null);
    setPending(false);
    setConfidence(3);
    setProblemStartedAt(Date.now());
  }

  function resetDiagnostic() {
    clearDiagnosticLogs();
    setStudentState(initialState);
    setIndex(0);
    setAnswer("");
    setAttempts([]);
    setFeedback(null);
    setLearningPlan(null);
    setAssessmentReport(null);
    setPending(false);
    setConfidence(3);
    setProblemStartedAt(Date.now());
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="masthead">
          <div>
            <p className="eyebrow">Adaptive Math Learning</p>
            <h1 className="page-title">Diagnostic Mode v2</h1>
            <p className="page-subtitle">
              A {diagnosticProblemCount}-slot calibrated assessment across Pre-Algebra, Algebra 1 readiness, and AMC8 transfer skills.
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/login">Login</Link>
            <Link className="button-secondary" href="/practice">Practice</Link>
            <Link className="button-secondary" href="/dashboard">Dashboard</Link>
            <button className="button" onClick={resetDiagnostic}>Reset</button>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Progress" value={`${Math.min(index + (pending || isComplete ? 1 : 0), diagnosticProblemCount)}/${diagnosticProblemCount}`} />
          <Metric label="Accuracy" value={`${accuracy}%`} />
          <Metric label="Calibration" value={calibrationSummary.confidence} />
        </section>

        <CalibrationSummaryPanel summary={calibrationSummary} />

        {isComplete || !currentProblem || !currentSlot ? (
          <section className="panel">
            <p className="eyebrow">Diagnostic Complete</p>
            <h2 className="panel-title">Your diagnostic profile is ready.</h2>
            {learningPlan ? (
              <>
                {assessmentReport && <AssessmentReportCard report={assessmentReport} />}
                {assessmentReport && <CalibrationSummaryPanel summary={assessmentReport.calibration} />}
                <div className="learning-plan-card">
                  <div>
                    <div className="tag-row">
                      {learningPlan.course && <span className="tag">{learningPlan.course}</span>}
                      {learningPlan.chapterTitle && <span className="tag tag-teal">{learningPlan.chapterTitle}</span>}
                      {learningPlan.targetMastery !== undefined && (
                        <span className="tag tag-gold">{Math.round(learningPlan.targetMastery * 100)}% mastery</span>
                      )}
                    </div>
                    <h3>{assessmentReport?.recommendationTitle ?? learningPlan.title}</h3>
                    <p>{assessmentReport?.recommendationReason ?? learningPlan.reason}</p>
                  </div>
                  <div className="learning-plan-actions">
                    <Link className="button" href={assessmentReport?.practiceHref ?? learningPlan.href}>Start personalized mini session</Link>
                    <Link className="button-secondary" href="/dashboard">Open dashboard</Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="summary-recommendation">
                  Review your dashboard to see focus concepts, secure concepts, and the next recommended study path.
                </p>
                <Link className="button" href="/dashboard">Open dashboard</Link>
              </>
            )}
          </section>
        ) : (
          <section className="content-grid">
            <div className="panel">
              <div className="tag-row">
                <span className="tag">{currentProblem.id}</span>
                <span className="tag tag-gold">Question {index + 1}</span>
                <span className="tag tag-gold">{currentSlot.stage}</span>
                <span className="tag">{currentProblem.answerType}</span>
                <span className="tag">{currentSlot.domain}</span>
                {currentProblem.taxonomy && (
                  <>
                    <span className="tag tag-gold">{currentProblem.taxonomy.layer}</span>
                    <span className="tag">{currentProblem.taxonomy.problemType}</span>
                  </>
                )}
                {currentProblem.concepts.map((concept) => (
                  <span className="tag tag-teal" key={concept}>{concept}</span>
                ))}
              </div>

              <h2 className="problem-text">{currentProblem.statement}</h2>
              <div className="schema-note">
                <strong>Selected by:</strong> {currentItem.selectionReason}
              </div>
              <div className="schema-note">
                <strong>Assessment goal:</strong> {currentSlot.goal}
              </div>
              <div className="schema-note">
                <strong>Why this item:</strong> {currentSlot.reason}
              </div>

              <form className="answer-form" onSubmit={submitAnswer}>
                {isMultipleChoice(currentProblem) && (
                  <div className="choice-grid">
                    {normalizeChoices(currentProblem.choices).map((choice) => (
                      <button
                        className={`choice-button ${answer === choice.label ? "choice-button-selected" : ""}`}
                        disabled={pending}
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
                  disabled={pending}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={isMultipleChoice(currentProblem) ? "Choose an option or type A-E" : "Enter your answer"}
                  value={answer}
                />
                <label className="confidence-control" htmlFor="diagnostic-confidence">
                  Confidence
                  <select
                    className="select-input"
                    disabled={pending}
                    id="diagnostic-confidence"
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
                <button className="button" disabled={pending} type="submit">Submit</button>
              </form>

              {feedback && (
                <div className={`feedback ${feedback.correct ? "feedback-success" : "feedback-error"}`}>
                  <div className="feedback-title">{feedback.correct ? "Correct" : "Not yet"}</div>
                  <div>Slot: {feedback.slot.stage} · {feedback.slot.strand}</div>
                  <div>Your answer: {feedback.submittedAnswer} · Expected: {feedback.problem.answer}</div>
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
                  <div>Signal: {feedback.responseTimeSeconds}s · Confidence {feedback.confidence}/5</div>
                  {feedback.prerequisiteGaps.length > 0 && (
                    <div>
                      Gap: {feedback.prerequisiteGaps[0].concept} before {feedback.prerequisiteGaps[0].targetConcept}
                    </div>
                  )}
                  <div>Check: {feedback.answerReason}</div>
                  <div>Solution note: {feedback.problem.solution}</div>
                  <div>{feedback.recommendationReason}</div>
                  {feedback.problem.taxonomy && (
                    <div>
                      Taxonomy: {feedback.problem.taxonomy.layer} · {feedback.problem.taxonomy.problemType} · {feedback.problem.taxonomy.cognitiveTags.slice(0, 2).join(", ")}
                    </div>
                  )}
                  <button className="button feedback-action" onClick={continueDiagnostic}>
                    {index + 1 >= diagnosticProblemCount ? "Finish diagnostic" : "Next diagnostic question"}
                  </button>
                </div>
              )}
            </div>

            <aside className="panel">
              <h2 className="panel-title">Calibration Blueprint</h2>
              <div className="schema-note">
                <strong>Coverage:</strong> {diagnosticBlueprintAudit.selectedCount}/{diagnosticBlueprintAudit.slotCount} slot(s) ready.
              </div>
              {diagnosticBlueprintAudit.missingFallbacks.length > 0 && (
                <div className="schema-note">
                  <strong>Missing slot:</strong> {diagnosticBlueprintAudit.missingFallbacks.join(", ")}
                </div>
              )}
              <div className="schema-note">
                <strong>Stage:</strong> {currentSlot.stage}
              </div>
              <div className="schema-note">
                <strong>Domain:</strong> {currentSlot.domain} · {currentSlot.strand}
              </div>
              <div className="schema-note">
                <strong>Primary concept:</strong> {currentProblem.primaryConcept}
              </div>
              <div className="schema-note">
                <strong>Prerequisites:</strong>{" "}
                {currentProblem.prerequisiteConcepts.length
                  ? currentProblem.prerequisiteConcepts.join(", ")
                  : "none tagged"}
              </div>
              <div className="schema-note">
                <strong>Slot concepts:</strong> {currentSlot.concepts.join(", ")}
              </div>
              <div className="calibration-stage-list">
                {calibrationSummary.stageEvidence.map((stage) => (
                  <div className="calibration-stage-card" key={stage.stage}>
                    <div className="trajectory-head">
                      <strong>{stage.stage}</strong>
                      <span className={`readiness ${readinessClass(stage.status)}`}>{stage.confidence}</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, Math.round((stage.completedSlots / Math.max(stage.expectedSlots, 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="muted">{stage.evidence}</div>
                  </div>
                ))}
              </div>
              <div className="trajectory-list">
                {diagnosticProblems.map(({ problem, slot }, problemIndex) => (
                  <div className="trajectory-card" key={slot.id}>
                    <div className="trajectory-head">
                      <strong>{problemIndex + 1}. {slot.domain}</strong>
                      <span className={problemIndex < attempts.length ? "status-good" : "muted"}>
                        {problemIndex < attempts.length ? "Done" : "Queued"}
                      </span>
                    </div>
                    <div className="muted">{slot.stage}</div>
                    <div className="muted">{slot.strand}</div>
                    <div className="muted">{problem.id} · {problem.primaryConcept} · Difficulty {problem.difficulty}</div>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

function CalibrationSummaryPanel({ summary }: { summary: ReturnType<typeof summarizeDiagnosticCalibration> }) {
  return (
    <section className="panel full-panel calibration-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">{summary.version}</p>
          <h2 className="panel-title">Calibration confidence: {summary.confidence}</h2>
          <p className="muted">
            Evidence complete: {summary.completedSlots}/{summary.expectedSlots} slot(s). {summary.nextCheckpoint}
          </p>
        </div>
        <div className={`summary-score calibration-score-${summary.confidence.toLowerCase()}`}>
          {summary.confidence}
        </div>
      </div>
      <p className="summary-recommendation">{summary.retestRecommendation}</p>
      <div className="readiness-grid">
        {summary.stageEvidence.map((stage) => (
          <div className="readiness-card" key={stage.stage}>
            <div className={`readiness ${readinessClass(stage.status)}`}>{stage.status}</div>
            <strong>{stage.stage}</strong>
            <span>{stage.evidence}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function AssessmentReportCard({ report }: { report: AssessmentReport }) {
  return (
    <div className="assessment-report-card">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Assessment Report v1</p>
          <h3>{report.placement.stage} · {report.placement.status}</h3>
          <div className="muted">
            Calibration: {report.calibration.confidence} · {report.calibration.completedSlots}/{report.calibration.expectedSlots} slot(s)
          </div>
        </div>
        <div className="summary-score">{report.attempts}</div>
      </div>
      <p className="summary-recommendation">{report.placement.evidence}</p>
      <div className="summary-list">
        {report.summaryBullets.map((item) => (
          <div className="summary-item" key={item}>
            <div>{item}</div>
          </div>
        ))}
      </div>
      <div className="readiness-grid">
        {report.stageReadiness.map((stage) => (
          <div className="readiness-card" key={stage.stage}>
            <div className={`readiness ${readinessClass(stage.status)}`}>{stage.status}</div>
            <strong>{stage.stage}</strong>
            <span>{stage.evidence}</span>
          </div>
        ))}
      </div>
      <div className="summary-grid">
        <ReportList
          emptyText="No ability signals yet."
          items={report.abilityProfile.map((item) => `${item.dimension} · ${Math.round(item.score * 100)}% · ${item.status}`)}
          title="Ability profile"
        />
        <ReportList
          emptyText="No focus concept detected yet."
          items={report.focusConcepts.map((item) => `${item.concept} · ${Math.round(item.mastery * 100)}%`)}
          title="Focus concepts"
        />
        <ReportList
          emptyText="No prerequisite gap detected."
          items={report.prerequisiteGaps.map((gap) => `${gap.concept} before ${gap.targetConcept}`)}
          title="Prerequisite gaps"
        />
      </div>
    </div>
  );
}

function ReportList({
  emptyText,
  items,
  title
}: {
  emptyText: string;
  items: string[];
  title: string;
}) {
  return (
    <div>
      <h3 className="summary-list-title">{title}</h3>
      <div className="summary-list">
        {items.length === 0 && <p className="muted">{emptyText}</p>}
        {items.slice(0, 4).map((item) => (
          <div className="summary-item" key={item}>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function readinessClass(status: string) {
  if (status === "Ready" || status === "Calibrated") return "readiness-ready";
  if (status === "Developing" || status === "Partial") return "readiness-developing";
  return "readiness-needs-review";
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
