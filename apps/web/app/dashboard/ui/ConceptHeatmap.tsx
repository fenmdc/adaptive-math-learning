export default function ConceptHeatmap({ logs }) {

  const conceptMap = {};

  logs.forEach(l => {
    (l.weakConcepts || []).forEach(c => {
      conceptMap[c] = (conceptMap[c] || 0) + 1;
    });
  });

  return (
    <div>
      <h2>Concept Weakness Heatmap</h2>

      <div className="grid grid-cols-2 gap-2">

        {Object.entries(conceptMap).map(([c, v]) => (
          <div key={c} className="p-2 border rounded">

            <div className="font-bold">{c}</div>
            <div>Weakness Frequency: {v}</div>

          </div>
        ))}

      </div>

    </div>
  );
}
