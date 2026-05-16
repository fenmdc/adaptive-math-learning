export default function TrajectoryView({ logs }) {

  return (
    <div>
      <h2>Learning Trajectory</h2>

      <div className="space-y-2">
        {logs.map((l, i) => (
          <div key={i} className="p-2 border rounded">

            <div>Step: {i}</div>
            <div>Problem: {l.problem}</div>
            <div>
              Result: {l.correct ? "Correct" : "Wrong"}
            </div>

            <div>
              Weak Concepts: {l.weakConcepts?.join(", ")}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
