import logs from "../../packages/simulation/output/logs.json";

import AppShell from "../ui/AppShell";

export default function DashboardPage() {
  const correct = logs.filter((log) => log.correct).length;
  const accuracy = Math.round((correct / logs.length) * 100);
  const recent = logs.slice(-8);
  const weakConcepts = Object.entries(
    logs.reduce<Record<string, number>>((counts, log) => {
      log.weakConcepts.forEach((concept) => {
        counts[concept] = (counts[concept] ?? 0) + 1;
      });
      return counts;
    }, {}),
  ).toSorted((left, right) => right[1] - left[1]);

  return (
    <AppShell activeRoute="/dashboard">
      <div className="dashboard-page">
        <header className="page-header dashboard-header">
          <div>
            <p className="page-context">Progress dashboard</p>
            <h1>See the learning path, not just the score.</h1>
            <p className="page-intro">
              This starter dashboard reads the project simulation output and surfaces accuracy, trajectory, and weak concepts.
            </p>
          </div>
        </header>

        <section className="metric-band" aria-label="Learning summary">
          <article>
            <span>Attempts</span>
            <strong>{logs.length}</strong>
            <small>latest simulation</small>
          </article>
          <article>
            <span>Accuracy</span>
            <strong>{accuracy}%</strong>
            <small>{correct} correct responses</small>
          </article>
          <article>
            <span>Priority gap</span>
            <strong>{weakConcepts[0]?.[0].replaceAll("_", " ") ?? "None"}</strong>
            <small>{weakConcepts[0]?.[1] ?? 0} weak-signal observations</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel trajectory-panel">
            <div className="surface-heading compact">
              <div>
                <span>Recent trajectory</span>
                <h2>Last eight attempts</h2>
              </div>
            </div>
            <div className="trajectory-chart" aria-label="Recent correct and incorrect attempts">
              {recent.map((log) => (
                <div className="trajectory-column" key={log.step}>
                  <span className={log.correct ? "is-correct" : "is-wrong"} style={{ height: log.correct ? "78%" : "34%" }} />
                  <small>{log.step + 1}</small>
                </div>
              ))}
            </div>
            <div className="chart-key">
              <span><i className="correct-key" /> Correct</span>
              <span><i className="wrong-key" /> Needs review</span>
            </div>
          </article>

          <article className="dashboard-panel concept-panel">
            <div className="surface-heading compact">
              <div>
                <span>Concept signals</span>
                <h2>Weakness frequency</h2>
              </div>
            </div>
            <div className="signal-list">
              {weakConcepts.map(([concept, count]) => (
                <div key={concept}>
                  <span>{concept.replaceAll("_", " ")}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <p className="panel-note">Simulation data is illustrative; persistent student mastery is the next infrastructure milestone.</p>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
