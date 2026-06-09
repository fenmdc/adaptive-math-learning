import type { SimulationLog } from "../types";

export default function TrajectoryView({ logs }: { logs: SimulationLog[] }) {

  return (
    <section className="panel">
      <h2 className="panel-title">Learning Trajectory</h2>

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

    </section>
  );
}
