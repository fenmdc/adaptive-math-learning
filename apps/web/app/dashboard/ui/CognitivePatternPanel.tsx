import { summarizeCognitivePatterns } from "../../shared/cognitivePatterns";
import type { SimulationLog } from "../types";

export default function CognitivePatternPanel({ logs }: { logs: SimulationLog[] }) {
  const patterns = summarizeCognitivePatterns(logs);
  const distractorCount = logs.filter((log) => log.selectedDistractor).length;

  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Cognitive Pattern Signals v0</p>
          <h2 className="panel-title">Distractor and reasoning signals</h2>
        </div>
        <div className="summary-score">{patterns.length}</div>
      </div>

      <p className="summary-recommendation">
        {patterns.length > 0
          ? `The current logs contain ${distractorCount} distractor-backed signal(s), combined with taxonomy, speed, and confidence evidence.`
          : "Complete multiple-choice or diagnostic items to generate cognitive pattern signals."}
      </p>

      <div className="cognitive-grid">
        {patterns.length === 0 && (
          <div className="empty-state">
            <p className="muted">No cognitive pattern signals yet.</p>
          </div>
        )}
        {patterns.map((pattern) => (
          <article className="cognitive-card" key={pattern.id}>
            <div className="trajectory-head">
              <strong>{pattern.label}</strong>
              <span className={`readiness readiness-${confidenceClass(pattern.confidence)}`}>
                {pattern.confidence}
              </span>
            </div>
            <div className="domain-metrics">
              <span>{pattern.count} signal(s)</span>
              {pattern.sources.slice(0, 3).map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
            <p>{pattern.interpretation}</p>
            <div className="muted">
              Concepts: {pattern.concepts.length ? pattern.concepts.join(", ") : "not linked yet"}
            </div>
            <div className="muted">
              Evidence: {pattern.evidence.length ? pattern.evidence.join(" / ") : "No detailed evidence yet."}
            </div>
            <div className="schema-note">
              <strong>Next action:</strong> {pattern.nextAction}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function confidenceClass(confidence: string) {
  if (confidence === "high") return "needs-review";
  if (confidence === "medium") return "developing";
  return "ready";
}
