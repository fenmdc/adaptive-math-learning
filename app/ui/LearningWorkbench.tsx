"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearLearningSession,
  createInitialLearningSession,
  loadLearningSession,
  runLearningAttempt,
  saveLearningSession,
  type LearningSessionState,
} from "@/packages/learning-session";
import { ACCOUNT_CHANGE_EVENT, getActiveAccountId } from "@/packages/accounts";
import type { PracticeProblem } from "@/packages/problem-bank/types";

type DatasetStats = {
  concepts: number;
  problems: number;
  reviewedProblems: number;
  sourceRecords: number;
  textbookSources: number;
  importedProblems: number;
  autoGradableProblems: number;
  manualReviewProblems: number;
};

export default function LearningWorkbench({
  datasetStats,
  problems,
}: {
  datasetStats: DatasetStats;
  problems: PracticeProblem[];
}) {
  const [session, setSession] = useState<LearningSessionState>(() => createInitialLearningSession(problems));

  useEffect(() => {
    const reload = () => {
      const accountId = getActiveAccountId(window.localStorage);
      setSession(loadLearningSession(window.localStorage, problems, accountId) ?? createInitialLearningSession(problems));
    };
    reload();
    window.addEventListener(ACCOUNT_CHANGE_EVENT, reload);
    return () => window.removeEventListener(ACCOUNT_CHANGE_EVENT, reload);
  }, [problems]);

  const problem = problems.find((item) => item.id === session.problemId) ?? problems[0];
  const conceptNames = new Map(
    problems.flatMap((item) => Object.entries(item.conceptLabels)),
  );
  const masteryRows = [...Object.entries(session.adaptiveState.mastery)]
    .sort((left, right) => left[1] - right[1])
    .slice(0, 3);
  const accuracy = session.attempts ? Math.round((session.correctAttempts / session.attempts) * 100) : 0;

  if (!problem) {
    return <p className="empty-workspace">No answerable problems are available.</p>;
  }

  function updateSession(nextSession: LearningSessionState) {
    try {
      saveLearningSession(window.localStorage, nextSession);
    } catch {
      // Practice remains usable when browser storage is unavailable.
    }
    setSession(nextSession);
  }

  function selectAnswer(choice: string) {
    updateSession({ ...session, selected: choice });
  }

  function revealHint() {
    updateSession({ ...session, hintVisible: true });
  }

  function submitAnswer() {
    if (!session.selected || session.result) return;
    const nextResult = runLearningAttempt({
      answer: session.selected,
      problem,
      problems,
      state: session.adaptiveState,
    });
    const { state, ...result } = nextResult;
    updateSession({
      ...session,
      result,
      attempts: session.attempts + 1,
      correctAttempts: session.correctAttempts + (nextResult.correct ? 1 : 0),
      adaptiveState: state,
    });
  }

  function loadNextProblem() {
    updateSession({
      ...session,
      problemId: session.result?.nextProblemId ?? problems[0]?.id,
      selected: undefined,
      hintVisible: undefined,
      result: undefined,
    });
  }

  function resetSession() {
    clearLearningSession(window.localStorage);
    setSession(createInitialLearningSession(problems));
  }

  const currentMastery = Math.round((session.adaptiveState.mastery[problem.concepts[0]] ?? 0.5) * 100);
  const nextProblem = problems.find((item) => item.id === session.result?.nextProblemId);

  return (
    <div className="learning-page">
      <header className="learning-header">
        <div>
          <p>Adaptive practice</p>
          <h1>{problem.conceptLabel}</h1>
          <span>One focused problem. One useful learning signal.</span>
        </div>
        <div className="learning-header-actions">
          <Link href="/dashboard">Progress dashboard</Link>
          <button onClick={resetSession} type="button">Reset session</button>
        </div>
      </header>

      <div className="session-strip" aria-label="Current learning session">
        <div><span>Session</span><strong>{session.attempts ? `${session.attempts} attempts` : "Ready to begin"}</strong></div>
        <div><span>Accuracy</span><strong>{session.attempts ? `${accuracy}%` : "—"}</strong></div>
        <div><span>Current mastery</span><strong>{currentMastery}%</strong></div>
        <div><span>Content status</span><strong>{problem.reviewStatus === "reviewed" ? "Human reviewed" : problem.reviewStatus === "imported" ? "Previous library" : "Draft support"}</strong></div>
      </div>

      <main className="learning-layout" aria-label="Adaptive learning workspace">
        <article className="question-stage" id="practice">
          <div className="question-toolbar">
            <div>
              <span>{problem.id.replace("amc8_", "AMC8 · ").toUpperCase()}</span>
              <strong>{problem.skills[0]?.replaceAll("_", " ") ?? problem.conceptLabel}</strong>
            </div>
            <div className="difficulty" aria-label={`Difficulty ${problem.difficulty} out of 5`}>
              {Array.from({ length: 5 }, (_, index) => <span className={index < problem.difficulty ? "is-filled" : ""} key={index} />)}
            </div>
          </div>

          <div className="question-content">
            <p className="question-label">Choose the best answer</p>
            <h2>{problem.statement}</h2>
            {problem.asset ? <img className="problem-asset" src={problem.asset.url} alt={problem.asset.alt} /> : null}

            {!session.result ? (
              <div className="hint-region">
                {session.hintVisible ? (
                  <div className="hint-panel" role="status"><strong>Strategy hint</strong><p>{problem.hint}</p></div>
                ) : (
                  <button className="hint-button" onClick={revealHint} type="button">Need a hint?</button>
                )}
              </div>
            ) : null}

            <div className="answer-list" role="group" aria-label="Answer choices">
              {problem.choices.map((choice, index) => {
                const state = session.result
                  ? choice === problem.answer ? "is-correct" : choice === session.selected ? "is-wrong" : ""
                  : session.selected === choice ? "is-selected" : "";
                return (
                  <button
                    aria-pressed={session.selected === choice}
                    className={state}
                    disabled={Boolean(session.result)}
                    key={choice}
                    onClick={() => selectAnswer(choice)}
                    type="button"
                  >
                    <span>{String.fromCharCode(65 + index)}</span><strong>{choice}</strong>
                  </button>
                );
              })}
            </div>

            {session.result ? (
              <section className={`learning-feedback ${session.result.correct ? "is-correct" : "is-review"}`} aria-live="polite">
                <div className="feedback-verdict">
                  <span>{session.result.correct ? "Answer confirmed" : session.result.remediation ? "Remediation activated" : "Review this idea"}</span>
                  <strong>{session.result.correct ? "Correct reasoning signal" : `Correct answer: ${problem.answer}`}</strong>
                </div>
                <div className="feedback-grid">
                  <div><span>Why it works</span><p>{problem.explanation}</p></div>
                  <div><span>Watch for</span><p>{problem.misconceptionFeedback}</p></div>
                </div>
              </section>
            ) : null}
          </div>

          <footer className="question-actions">
            <span>{session.selected ? `Selected answer: ${session.selected}` : "Select an answer when your reasoning is ready."}</span>
            {session.result ? (
              <button className="primary-button" onClick={loadNextProblem} type="button">Continue to recommendation</button>
            ) : (
              <button className="primary-button" disabled={!session.selected} onClick={submitAnswer} type="button">Check reasoning</button>
            )}
          </footer>
        </article>

        <aside className="learning-rail" aria-labelledby="learning-path-title">
          <div className="rail-section">
            <span>Learning path</span>
            <h2 id="learning-path-title">What the engine sees</h2>
            <p>{session.result ? `This response updated ${problem.concepts.length} concept signal${problem.concepts.length > 1 ? "s" : ""}.` : "Your answer will update mastery and choose the next useful problem."}</p>
          </div>

          <div className="focus-signal">
            <span>Reasoning focus</span>
            <strong>{problem.patterns[0]?.replaceAll("_", " ") ?? "mathematical reasoning"}</strong>
            <small>{problem.concepts.map((concept) => conceptNames.get(concept) ?? concept).join(" · ")}</small>
          </div>

          <div className="mastery-compact">
            <div><span>Priority concepts</span><small>Lowest mastery first</small></div>
            {masteryRows.map(([concept, value]) => (
              <div className="mastery-compact-row" key={concept}>
                <div><span>{conceptNames.get(concept) ?? concept.replaceAll("_", " ")}</span><strong>{Math.round(value * 100)}%</strong></div>
                <div><span style={{ width: `${value * 100}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="next-recommendation">
            <span>{session.result ? "Next recommendation" : "Current focus"}</span>
            <strong>{nextProblem?.conceptLabel ?? problem.conceptLabel}</strong>
            <p>{session.result ? `Chosen from ${session.result.weakConcepts.length} concepts below the mastery threshold.` : "Complete this problem to calculate the next step."}</p>
          </div>
        </aside>
      </main>

      <section className="quality-band" aria-label="Problem bank quality">
        <div><span>Problem bank quality</span><strong>{datasetStats.importedProblems.toLocaleString()} previous problems now available</strong></div>
        <dl>
          <div><dt>Human reviewed</dt><dd>{datasetStats.reviewedProblems}</dd></div>
          <div><dt>Auto gradable</dt><dd>{datasetStats.autoGradableProblems.toLocaleString()}</dd></div>
          <div><dt>Manual review</dt><dd>{datasetStats.manualReviewProblems}</dd></div>
          <div><dt>Concepts</dt><dd>{datasetStats.concepts}</dd></div>
        </dl>
      </section>
    </div>
  );
}
