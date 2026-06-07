import type { SimulationLog } from "../types";

export default function ConceptHeatmap({ logs }: { logs: SimulationLog[] }) {

  const conceptMap: Record<string, number> = {};

  logs.forEach(l => {
    (l.weakConcepts || []).forEach(c => {
      conceptMap[c] = (conceptMap[c] || 0) + 1;
    });
  });

  return (
    <section className="panel">
      <h2 className="panel-title">Concept Weakness Heatmap</h2>

      <div className="heatmap-grid">

        {Object.entries(conceptMap).map(([c, v]) => (
          <div key={c} className="heatmap-card">

            <div><strong>{c}</strong></div>
            <div className="muted">Weakness Frequency: {v}</div>

          </div>
        ))}

        {Object.keys(conceptMap).length === 0 && (
          <p className="muted">No weak concepts detected yet.</p>
        )}

      </div>

    </section>
  );
}
