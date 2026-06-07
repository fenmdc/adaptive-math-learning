import type { DomainProfile } from "../summary";

export default function DomainProfilePanel({ profiles }: { profiles: DomainProfile[] }) {
  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Diagnostic Report</p>
          <h2 className="panel-title">Domain Profile</h2>
        </div>
      </div>

      <div className="domain-grid">
        {profiles.map((profile) => (
          <article className="domain-card" key={profile.domain}>
            <div className="trajectory-head">
              <strong>{profile.domain}</strong>
              <span className={`readiness readiness-${profile.readiness.toLowerCase().replace(/\s+/g, "-")}`}>
                {profile.readiness}
              </span>
            </div>

            <div className="domain-metrics">
              <span>{profile.accuracy}% accuracy</span>
              <span>{Math.round(profile.averageMastery * 100)}% mastery</span>
              <span>{profile.attempts} item(s)</span>
            </div>

            <div className="muted">
              Strands: {profile.strands.length ? profile.strands.join(", ") : "mixed practice"}
            </div>

            <div className="muted">
              Concepts: {profile.concepts.join(", ")}
            </div>

            <div className="muted">
              Weak concepts: {profile.weakConcepts.length ? profile.weakConcepts.join(", ") : "none detected"}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
