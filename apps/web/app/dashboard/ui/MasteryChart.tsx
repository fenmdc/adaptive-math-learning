"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { SimulationLog } from "../types";

export default function MasteryChart({ logs }: { logs: SimulationLog[] }) {

  const data = logs.map((l, i) => ({
    step: i,
    correctness: l.correct ? 1 : 0,
    averageMastery: average(Object.values(l.mastery || {}))
  }));

  return (
    <section className="panel full-panel">
      <h2 className="panel-title">Mastery Progress</h2>

      <div className="chart-wrap">
        <LineChart width={860} height={300} data={data}>
          <XAxis dataKey="step" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="correctness" stroke="#c47a2c" strokeWidth={2} />
          <Line type="monotone" dataKey="averageMastery" stroke="#115a8c" strokeWidth={3} />
        </LineChart>
      </div>

    </section>
  );
}

function average(values: number[]) {
  if (!values.length) return 0.5;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
