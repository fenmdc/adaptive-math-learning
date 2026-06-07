"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import problemsData from "../../data/problems.json";
import { AdaptiveEngine, checkAnswer, Problem, StudentState } from "../../../../packages/adaptive-engine";
import { buildLearningPlan, LearningPlan } from "../shared/learningPlan";
import {
  clearDiagnosticLogs,
  createPracticeLog,
  readDiagnosticLogs,
  readStudentModel,
  writeDiagnosticLogs,
  writeLearningPlan,
  writeStudentModel
} from "../shared/storage";
import { updateStudentModel } from "../shared/studentModel";
import { initialAssessmentBlueprint } from "./initialAssessment";

type DiagnosticAttempt = {
  problem: Problem;
  submittedAnswer: string;
  correct: boolean;
  answerReason: string;
  recommendationReason: string;
  responseTimeSeconds: number;
  confidence: number;
};

const allProblems = problemsData as Problem[];
const diagnosticProblems = initialAssessmentBlueprint
  .map((slot) => ({
    slot,
    problem: allProblems.find((problem) => problem.id === slot.problemId)
  }))
  .filter((item): item is { slot: typeof initialAssessmentBlueprint[number]; problem: Problem } =>
    Boolean(item.problem?.isAutoGradable)
  );
const diagnosticProblemCount = diagnosticProblems.length;
const initialState: StudentState = { mastery: {}, history: [] };

export default function DiagnosticPage() {
  const engine = useMemo(() => new AdaptiveEngine(allProblems), []);
  const [studentState, setStudentState] = useState<StudentState>(initialState);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [feedback, setFeedback] = useState<DiagnosticAttempt | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
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

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || pending || !currentProblem) return;

    const answerCheck = checkAnswer(answer, currentProblem.answer);
    const responseTimeSeconds = secondsSince(problemStartedAt);
    const result = engine.run(studentState, {
      problem: currentProblem,
      correct: answerCheck.correct,
      responseTimeSeconds,
      confidence
    });
    const attempt = {
      problem: currentProblem,
      submittedAnswer: answer,
      correct: answerCheck.correct,
      answerReason: answerCheck.reason,
      recommendationReason: result.recommendation.reason,
      responseTimeSeconds,
      confidence
    };
    const log = createPracticeLog({
      step: attempts.length,
      problem: currentProblem,
      correct: answerCheck.correct,
      weakConcepts: result.weak_concepts,
      fluencyConcepts: result.fluency_concepts,
      remediation: result.remediation,
      nextProblem: result.next_problem,
      mastery: result.updated_state.mastery,
      recommendationReason: result.recommendation.reason,
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
      responseTimeSeconds,
      confidence
    });
    const nextPlan = diagnosticComplete ? buildLearningPlan(nextLogs, allProblems, nextStudentModel) : null;

    setStudentState(result.updated_state);
    setAttempts((current) => [...current, attempt]);
    writeDiagnosticLogs(nextLogs);
    writeStudentModel(nextStudentModel);
    if (nextPlan) {
      writeLearningPlan(nextPlan);
      setLearningPlan(nextPlan);
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
            <h1 className="page-title">Diagnostic Mode</h1>
            <p className="page-subtitle">
              A 10-question initial assessment across arithmetic, algebra, geometry, number theory, probability, and statistics.
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/practice">Practice</Link>
            <Link className="button-secondary" href="/dashboard">Dashboard</Link>
            <button className="button" onClick={resetDiagnostic}>Reset</button>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Progress" value={`${Math.min(index + (pending || isComplete ? 1 : 0), diagnosticProblemCount)}/${diagnosticProblemCount}`} />
          <Metric label="Accuracy" value={`${accuracy}%`} />
          <Metric label="Concepts Seen" value={String(new Set(attempts.flatMap((item) => item.problem.concepts)).size)} />
        </section>

        {isComplete || !currentProblem || !currentSlot ? (
          <section className="panel">
            <p className="eyebrow">Diagnostic Complete</p>
            <h2 className="panel-title">Your diagnostic profile is ready.</h2>
            {learningPlan ? (
              <div className="learning-plan-card">
                <div>
                  <div className="tag-row">
                    {learningPlan.course && <span className="tag">{learningPlan.course}</span>}
                    {learningPlan.chapterTitle && <span className="tag tag-teal">{learningPlan.chapterTitle}</span>}
                    {learningPlan.targetMastery !== undefined && (
                      <span className="tag tag-gold">{Math.round(learningPlan.targetMastery * 100)}% mastery</span>
                    )}
                  </div>
                  <h3>{learningPlan.title}</h3>
                  <p>{learningPlan.reason}</p>
                </div>
                <div className="learning-plan-actions">
                  <Link className="button" href={learningPlan.href}>Start recommended practice</Link>
                  <Link className="button-secondary" href="/dashboard">Open dashboard</Link>
                </div>
              </div>
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
                <span className="tag">{currentProblem.answerType}</span>
                <span className="tag">{currentSlot.domain}</span>
                {currentProblem.concepts.map((concept) => (
                  <span className="tag tag-teal" key={concept}>{concept}</span>
                ))}
              </div>

              <h2 className="problem-text">{currentProblem.statement}</h2>
              <div className="schema-note">
                <strong>Assessment goal:</strong> {currentSlot.goal}
              </div>
              <div className="schema-note">
                <strong>Why this item:</strong> {currentSlot.reason}
              </div>

              <form className="answer-form" onSubmit={submitAnswer}>
                <input
                  className="answer-input"
                  disabled={pending}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Enter your answer"
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
                  <div>Your answer: {feedback.submittedAnswer} · Expected: {feedback.problem.answer}</div>
                  <div>Signal: {feedback.responseTimeSeconds}s · Confidence {feedback.confidence}/5</div>
                  <div>Check: {feedback.answerReason}</div>
                  <div>Solution note: {feedback.problem.solution}</div>
                  <div>{feedback.recommendationReason}</div>
                  <button className="button feedback-action" onClick={continueDiagnostic}>
                    {index + 1 >= diagnosticProblemCount ? "Finish diagnostic" : "Next diagnostic question"}
                  </button>
                </div>
              )}
            </div>

            <aside className="panel">
              <h2 className="panel-title">Coverage</h2>
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
              <div className="trajectory-list">
                {diagnosticProblems.map(({ problem, slot }, problemIndex) => (
                  <div className="trajectory-card" key={slot.id}>
                    <div className="trajectory-head">
                      <strong>{problemIndex + 1}. {slot.domain}</strong>
                      <span className={problemIndex < attempts.length ? "status-good" : "muted"}>
                        {problemIndex < attempts.length ? "Done" : "Queued"}
                      </span>
                    </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function secondsSince(startedAt: number) {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
}
