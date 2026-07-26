"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearLearningSession,
  loadLearningSession,
  type StoredLearningSession,
} from "@/packages/learning-session";
import type { PracticeProblem } from "@/packages/problem-bank/types";

type SimulationLog = {
  step: number;
  correct: boolean;
  weakConcepts: string[];
};

export default function ProgressDashboard({
  problems,
  simulationLogs,
}: {
  problems: PracticeProblem[];
  simulationLogs: SimulationLog[];
}) {
  const [session, setSession] = useState<StoredLearningSession>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(loadLearningSession(window.localStorage, problems));
    setLoaded(true);
  }, [problems]);

  const usesStudentSession = Boolean(session?.attempts);
  const sessionAttempts = session?.adaptiveState.recentAttempts ?? [];
  const recent = usesStudentSession
    ? sessionAttempts.map((attempt, index) => ({ ...attempt, step: session!.attempts - sessionAttempts.length + index }))
    : simulationLogs.slice(-8);
  const attempts = usesStudentSession ? session!.attempts : simulationLogs.length;
  const correct = usesStudentSession
    ? session!.correctAttempts
    : simulationLogs.filter((log) => log.correct).length;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const conceptNames = new Map(problems.flatMap((problem) => Object.entries(problem.conceptLabels)));
  const conceptSignals = usesStudentSession
    ? Object.entries(session!.adaptiveState.mastery)
      .toSorted((left, right) => left[1] - right[1])
      .slice(0, 6)
      .map(([concept, mastery]) => [concept, `${Math.round(mastery * 100)}%`] as const)
    : Object.entries(
      simulationLogs.reduce<Record<string, number>>((counts, log) => {
        log.weakConcepts.forEach((concept) => { counts[concept] = (counts[concept] ?? 0) + 1; });
        return counts;
      }, {}),
    ).toSorted((left, right) => right[1] - left[1]).map(([concept, count]) => [concept, String(count)] as const);

  function resetSession() {
    clearLearningSession(window.localStorage);
    setSession(undefined);
  }

  return (
    <div className="dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="page-context">Progress dashboard</p>
          <h1>See the learning path, not just the score.</h1>
          <p className="page-intro">
            {usesStudentSession
              ? "Your saved practice session now drives this progress view."
              : "Complete a practice attempt to replace this illustrative simulation with your own learning data."}
          </p>
        </div>
        <div className="dashboard-actions">
          <span className="data-source">{loaded && usesStudentSession ? "Student session" : "Simulation preview"}</span>
          {usesStudentSession ? <button className="reset-button" onClick={resetSession} type="button">Reset session</button> : null}
          <Link className="text-link" href="/">Continue practice <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <section className="metric-band" aria-label="Learning summary">
        <article><span>Attempts</span><strong>{attempts}</strong><small>{usesStudentSession ? "saved locally" : "simulation preview"}</small></article>
        <article><span>Accuracy</span><strong>{accuracy}%</strong><small>{correct} correct responses</small></article>
        <article>
          <span>Priority gap</span>
          <strong>{conceptNames.get(conceptSignals[0]?.[0]) ?? conceptSignals[0]?.[0].replaceAll("_", " ") ?? "None"}</strong>
          <small>{usesStudentSession ? `${conceptSignals[0]?.[1] ?? "—"} mastery` : `${conceptSignals[0]?.[1] ?? 0} weak-signal observations`}</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel trajectory-panel">
          <div className="surface-heading compact"><div><span>Recent trajectory</span><h2>Last eight attempts</h2></div></div>
          <div className="trajectory-chart" aria-label="Recent correct and incorrect attempts">
            {recent.map((attempt) => (
              <div className="trajectory-column" key={attempt.step}>
                <span className={attempt.correct ? "is-correct" : "is-wrong"} style={{ height: attempt.correct ? "78%" : "34%" }} />
                <small>{attempt.step + 1}</small>
              </div>
            ))}
          </div>
          <div className="chart-key"><span><i className="correct-key" /> Correct</span><span><i className="wrong-key" /> Needs review</span></div>
        </article>

        <article className="dashboard-panel concept-panel">
          <div className="surface-heading compact"><div><span>Concept signals</span><h2>{usesStudentSession ? "Lowest mastery" : "Weakness frequency"}</h2></div></div>
          <div className="signal-list">
            {conceptSignals.map(([concept, value]) => <div key={concept}><span>{conceptNames.get(concept) ?? concept.replaceAll("_", " ")}</span><strong>{value}</strong></div>)}
          </div>
          <p className="panel-note">
            {usesStudentSession
              ? `Session restored from this browser${session?.updatedAt ? ` · updated ${new Date(session.updatedAt).toLocaleString()}` : ""}.`
              : "Simulation data is an explicit preview and is replaced after the first saved student attempt."}
          </p>
        </article>
      </section>
    </div>
  );
}
