import logs from "../../../../packages/simulation/output/logs.json";

import MasteryChart from "./ui/MasteryChart";
import TrajectoryView from "./ui/TrajectoryView";
import ConceptHeatmap from "./ui/ConceptHeatmap";

export default function Dashboard() {

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">
        Adaptive Learning Dashboard
      </h1>

      <MasteryChart logs={logs} />

      <TrajectoryView logs={logs} />

      <ConceptHeatmap logs={logs} />

    </div>
  );
}
