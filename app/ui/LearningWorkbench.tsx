"use client";

import Link from "next/link";
import { useState } from "react";

import {
  createInitialAdaptiveState,
  runLearningAttempt,
  type LearningAttemptResult,
} from "@/packages/learning-session";
import type { PracticeProblem } from "@/packages/problem-bank/types";

type DatasetStats = {
  concepts: number;
  problems: number;
  sourceRecords: number;
  textbookSources: number;
};

export default function LearningWorkbench({
  datasetStats,
  problems,
}: {
  datasetStats: DatasetStats;
  problems: PracticeProblem[];
}) {
  const [problemId, setProblemId] = useState(problems[0]?.id);
  const [selected, setSelected] = useState<string>();
  const [result, setResult] = useState<LearningAttemptResult>();
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [adaptiveState, setAdaptiveState] = useState(() => createInitialAdaptiveState(problems));

  const problem = problems.find((item) => item.id === problemId) ?? problems[0];
  const conceptNames = new Map(
    problems.flatMap((item) => Object.entries(item.conceptLabels)),
  );
  const masteryRows = [...Object.entries(adaptiveState.mastery)]
    .sort((left, right) => left[1] - right[1])
    .slice(0, 3);
  const accuracy = attempts ? Math.round((correctAttempts / attempts) * 100) : 0;

  if (!problem) {
    return <p className="empty-workspace">No answerable problems are available.</p>;
  }

  function submitAnswer() {
    if (!selected || result) return;
    const nextResult = runLearningAttempt({ answer: selected, problem, problems, state: adaptiveState });
    setResult(nextResult);
    setAdaptiveState(nextResult.state);
    setAttempts((current) => current + 1);
    if (nextResult.correct) setCorrectAttempts((current) => current + 1);
  }

  function loadNextProblem() {
    setProblemId(result?.nextProblemId ?? problems[0]?.id);
    setSelected(undefined);
    setResult(undefined);
  }

  return (
    <div className="workspace-page">
      <header className="page-header">
        <div>
          <p className="page-context">Student workspace</p>
          <h1>Build mathematical mastery, one decision at a time.</h1>
          <p className="page-intro">
            Diagnose the next gap, practise at the right level, and make every answer update the learning path.
          </p>
        </div>
        <Link className="text-link" href="/dashboard">
          View progress
          <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="workspace-grid" aria-label="Adaptive learning workspace">
        <article className="practice-surface" id="practice">
          <div className="surface-heading">
            <div>
              <span>Recommended from problem bank</span>
              <h2>{problem.conceptLabel}</h2>
            </div>
            <div className="difficulty" aria-label={`Difficulty ${problem.difficulty} out of 5`}>
              {Array.from({ length: 5 }, (_, index) => (
                <span className={index < problem.difficulty ? "is-filled" : ""} key={index} />
              ))}
            </div>
          </div>

          <div className="problem-body">
            <div className="problem-meta">
              <p className="concept-label">{problem.id.replace("amc8_", "AMC8 · ").toUpperCase()}</p>
              {problem.skills[0] ? <span>{problem.skills[0].replaceAll("_", " ")}</span> : null}
            </div>
            <h3>{problem.statement}</h3>
            <div className="math-choices" role="group" aria-label="Answer choices">
              {problem.choices.map((choice) => {
                const state = result
                  ? choice === problem.answer
                    ? "is-correct"
                    : choice === selected
                      ? "is-wrong"
                      : ""
                  : selected === choice
                    ? "is-selected"
                    : "";
                return (
                  <button
                    aria-pressed={selected === choice}
                    className={state}
                    disabled={Boolean(result)}
                    key={choice}
                    onClick={() => setSelected(choice)}
                    type="button"
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {result ? (
              <div className={`answer-feedback ${result.correct ? "is-correct" : "is-review"}`} role="status">
                <strong>
                  {result.correct
                    ? "Correct — mastery updated"
                    : result.remediation
                      ? "Remediation triggered"
                      : `Review ${problem.conceptLabel.toLowerCase()}`}
                </strong>
                <p>{problem.explanation}</p>
              </div>
            ) : null}
          </div>

          <div className="practice-actions">
            <span>{datasetStats.problems} answerable problems · {datasetStats.sourceRecords} source records</span>
            {result ? (
              <button className="primary-button" onClick={loadNextProblem} type="button">
                Next recommendation
              </button>
            ) : (
              <button className="primary-button" disabled={!selected} onClick={submitAnswer} type="button">
                Check answer
              </button>
            )}
          </div>
        </article>

        <aside className="mastery-surface" aria-labelledby="mastery-title">
          <div className="surface-heading compact">
            <div>
              <span>Adaptive engine state</span>
              <h2 id="mastery-title">Priority concepts</h2>
            </div>
            <strong className="attempt-count">{attempts} attempts</strong>
          </div>
          <div className="mastery-list">
            {masteryRows.map(([concept, value]) => (
              <div className="mastery-row" key={concept}>
                <div>
                  <span>{conceptNames.get(concept) ?? concept.replaceAll("_", " ")}</span>
                  <strong>{Math.round(value * 100)}%</strong>
                </div>
                <div className="mastery-track">
                  <span style={{ width: `${value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="next-focus">
            <span>Next engine recommendation</span>
            <strong>
              {result?.nextProblemId
                ? problems.find((item) => item.id === result.nextProblemId)?.conceptLabel
                : problem.conceptLabel}
            </strong>
            <p>
              {result
                ? `Selected from ${result.weakConcepts.length} concepts below the mastery threshold.`
                : "Submit an answer to update mastery and calculate the next problem."}
            </p>
          </div>
          <div className="accuracy-row">
            <span>Session accuracy</span>
            <strong>{attempts ? `${accuracy}%` : "Not started"}</strong>
          </div>
        </aside>
      </section>

      <section className="foundation-strip" aria-labelledby="foundation-title">
        <div>
          <p className="page-context">Learning foundation</p>
          <h2 id="foundation-title">One validated problem bank, one adaptive engine.</h2>
        </div>
        <dl>
          <div>
            <dt>Concepts</dt>
            <dd>{datasetStats.concepts}</dd>
          </div>
          <div>
            <dt>Answerable problems</dt>
            <dd>{datasetStats.problems}</dd>
          </div>
          <div>
            <dt>Textbook sources</dt>
            <dd>{datasetStats.textbookSources}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
