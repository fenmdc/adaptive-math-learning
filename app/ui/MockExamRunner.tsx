"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { accountScopedKey, getActiveAccountId } from "@/packages/accounts";
import { scoreMockExam, type MockExamPaper } from "@/packages/mock-exam/scoring";

const STORAGE_PREFIX = "adaptive-math-learning:mock-exam:v1";
const EMPTY_EXAM_STATE: ExamState = { answers: {}, current: 0, endsAt: 0, started: false, submitted: false };

type ExamState = {
  answers: Record<string, string>;
  current: number;
  endsAt: number;
  started: boolean;
  submitted: boolean;
};

export default function MockExamRunner({ paper }: { paper: MockExamPaper }) {
  const [state, setState] = useState<ExamState>(EMPTY_EXAM_STATE);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const problem = paper.problems[state.current];
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${paper.config.id}`, [paper.config.id]);

  useEffect(() => {
    try {
      const accountId = getActiveAccountId(window.localStorage);
      const raw = window.localStorage.getItem(accountScopedKey(storageKey, accountId));
      if (raw) {
        const parsed = JSON.parse(raw) as ExamState;
        if (parsed && typeof parsed === "object" && typeof parsed.endsAt === "number") setState(parsed);
      }
    } catch {
      // A mock exam remains usable without local persistence.
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!state.started || state.submitted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.started, state.submitted]);

  useEffect(() => {
    if (state.started && !state.submitted && state.endsAt > 0 && now >= state.endsAt) {
      setState((current) => ({ ...current, submitted: true }));
    }
  }, [now, state.endsAt, state.started, state.submitted]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const accountId = getActiveAccountId(window.localStorage);
      window.localStorage.setItem(accountScopedKey(storageKey, accountId), JSON.stringify(state));
    } catch {
      // A mock exam remains usable without local persistence.
    }
  }, [loaded, state, storageKey]);

  const remainingSeconds = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  const score = state.submitted ? scoreMockExam(paper.config, paper.problems, state.answers) : undefined;

  function start() {
    setState({ answers: {}, current: 0, endsAt: Date.now() + paper.config.timeMinutes * 60_000, started: true, submitted: false });
    setNow(Date.now());
  }

  function answer(value: string) {
    setState((current) => ({ ...current, answers: { ...current.answers, [problem.id]: value } }));
  }

  function restart() {
    start();
  }

  function clearAttempt() {
    setState(EMPTY_EXAM_STATE);
  }

  if (!loaded) return <div className="exam-runner"><p>Loading saved exam…</p></div>;

  if (!state.started) {
    return (
      <div className="exam-runner exam-intro">
        <p className="page-context">Timed simulation</p><h1>{paper.config.title}</h1><p>{paper.config.format}. Your timer begins only when you start.</p>
        <dl><div><dt>Questions</dt><dd>{paper.problems.length}</dd></div><div><dt>Time limit</dt><dd>{paper.config.timeMinutes} minutes</dd></div><div><dt>Scoring</dt><dd>{paper.config.scoring === "amc-advanced" ? "6 correct · 1.5 blank · 0 wrong" : "1 point per correct answer"}</dd></div></dl>
        <div><button className="primary-button" disabled={paper.problems.length !== paper.config.questionCount} onClick={start} type="button">Begin exam</button><Link href="/exams">Back to exam list</Link></div>
      </div>
    );
  }

  if (state.submitted && score) {
    return (
      <div className="exam-runner exam-result">
        <p className="page-context">Exam complete</p><h1>{paper.config.shortTitle} result</h1><div className="exam-score"><strong>{score.points}/{score.maxPoints}</strong><span>{score.accuracy}% accuracy</span></div>
        <dl><div><dt>Correct</dt><dd>{score.correct}</dd></div><div><dt>Incorrect</dt><dd>{score.incorrect}</dd></div><div><dt>Blank</dt><dd>{score.blank}</dd></div></dl>
        <div><button className="primary-button" onClick={restart} type="button">Retry this paper</button><button className="exam-clear-button" onClick={clearAttempt} type="button">Clear saved result</button><Link href="/exams">Choose another exam</Link></div>
      </div>
    );
  }

  if (!problem) return <div className="exam-runner"><p>This exam paper is unavailable.</p></div>;

  const selected = state.answers[problem.id] ?? "";

  return (
    <div className="exam-runner">
      <header className="exam-toolbar"><div><span>{paper.config.shortTitle}</span><strong>Question {state.current + 1} of {paper.problems.length}</strong></div><time aria-label="Time remaining">{formatTime(remainingSeconds)}</time><button onClick={() => setState((current) => ({ ...current, submitted: true }))} type="button">Submit exam</button></header>
      <div className="exam-layout">
        <article className="exam-question">
          <div><span>{problem.course} · Difficulty {problem.difficulty}</span><h1>{problem.statement}</h1>{problem.asset ? <img className="problem-asset" src={problem.asset.url} alt={problem.asset.alt} /> : null}</div>
          {problem.answerType === "multiple_choice" ? (
            <div className="answer-list" role="group" aria-label="Exam answer choices">{problem.choices.map((choice, index) => <button aria-pressed={selected === choice} className={selected === choice ? "is-selected" : ""} key={`${index}:${choice}`} onClick={() => answer(choice)} type="button"><span>{String.fromCharCode(65 + index)}</span><strong>{choice}</strong></button>)}</div>
          ) : (
            <label className="exam-response"><span>Student-produced response</span><input aria-label="Student-produced response" onChange={(event) => answer(event.target.value)} value={selected} /></label>
          )}
          <footer><button disabled={state.current === 0} onClick={() => setState((current) => ({ ...current, current: current.current - 1 }))} type="button">Previous</button><button disabled={state.current === paper.problems.length - 1} onClick={() => setState((current) => ({ ...current, current: current.current + 1 }))} type="button">Next</button></footer>
        </article>
        <aside className="exam-answer-sheet"><span>Answer sheet</span><div>{paper.problems.map((item, index) => <button aria-current={index === state.current ? "step" : undefined} className={state.answers[item.id] ? "is-answered" : ""} key={item.id} onClick={() => setState((current) => ({ ...current, current: index }))} type="button">{index + 1}</button>)}</div><p>{Object.keys(state.answers).filter((id) => state.answers[id]).length} answered · {paper.problems.length - Object.keys(state.answers).filter((id) => state.answers[id]).length} blank</p></aside>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
