"use client";

import { useState } from "react";
import type { SimulationLog } from "../types";

export default function TrajectoryView({ logs }: { logs: SimulationLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const latestLog = logs[logs.length - 1];
  const correctCount = logs.filter((log) => log.correct).length;
  const accuracy = logs.length > 0 ? Math.round((correctCount / logs.length) * 100) : 0;

  return (
    <section className="panel">
      <div className="collapsible-panel-head">
        <div>
          <h2 className="panel-title compact-title">Learning Trajectory</h2>
          <p className="muted">
            {logs.length
              ? `${logs.length} attempts tracked · ${accuracy}% accuracy`
              : "No attempts tracked yet."}
          </p>
        </div>
        {logs.length > 0 && (
          <button
            className="button-secondary compact-toggle"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "Collapse" : "Show details"}
          </button>
        )}
      </div>

      {!expanded && latestLog && (
        <div className="trajectory-summary-card">
          <div className="trajectory-head">
            <strong>Latest step</strong>
            <span className={latestLog.correct ? "status-good" : "status-bad"}>
              {latestLog.correct ? "Correct" : "Wrong"}
            </span>
          </div>
          <p className="muted">
            {latestLog.problem}
          </p>
          <p className="muted">
            Next: {latestLog.nextProblem}
          </p>
        </div>
      )}

      {expanded && (
        <div className="trajectory-list">
          {logs.map((l, i) => (
            <div key={i} className="trajectory-card">

              <div className="trajectory-head">
                <strong>Step {i}</strong>
                <span className={l.correct ? "status-good" : "status-bad"}>
                Result: {l.correct ? "Correct" : "Wrong"}
                </span>
              </div>

              <div><strong>Problem:</strong> {l.problem}</div>

              {l.taxonomy && (
                <div className="muted">
                  Taxonomy: {l.taxonomy.layer} · {l.taxonomy.problemType} · {l.taxonomy.cognitiveTags.slice(0, 2).join(", ")}
                </div>
              )}

              {l.selectedChoiceLabel && (
                <div className="muted">
                  Choice: {l.selectedChoiceLabel} · {l.selectedChoiceValue}
                </div>
              )}

              {l.selectedDistractor && (
                <div className="muted">
                  Distractor: {l.selectedDistractor.misconception} · {l.selectedDistractor.cognitiveTag}
                </div>
              )}

              <div className="muted">
                Weak Concepts: {l.weakConcepts?.join(", ")}
              </div>

              {l.fluencyConcepts && l.fluencyConcepts.length > 0 && (
                <div className="muted">
                  Fluency Focus: {l.fluencyConcepts.join(", ")}
                </div>
              )}

              {l.prerequisiteGaps && l.prerequisiteGaps.length > 0 && (
                <div className="muted">
                  Prerequisite Gap: {l.prerequisiteGaps
                    .slice(0, 2)
                    .map((gap) => `${gap.concept} before ${gap.targetConcept}`)
                    .join(", ")}
                </div>
              )}

              <div className="muted">
                Next: {l.nextProblem}
              </div>

              <div className="muted">
                Reason: {l.recommendationReason}
              </div>

              {l.recommendationExplanation?.signals.length ? (
                <div className="muted">
                  Recommendation Signals: {l.recommendationExplanation.signals.slice(0, 4).join(" · ")}
                </div>
              ) : null}

              {(l.responseTimeSeconds || l.confidence) && (
                <div className="muted">
                  Signal: {l.responseTimeSeconds ? `${l.responseTimeSeconds}s` : "-"} · Confidence {l.confidence ? `${l.confidence}/5` : "-"}
                </div>
              )}

              {typeof l.recommendationScore === "number" && (
                <div className="muted">
                  Recommendation Score: {l.recommendationScore}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </section>
  );
}
