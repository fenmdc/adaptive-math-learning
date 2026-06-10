"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { SimulationLog } from "../types";

export default function MasteryChart({ logs }: { logs: SimulationLog[] }) {
  const [mounted, setMounted] = useState(false);

  const data = logs.map((l, i) => ({
    step: i,
    correctness: l.correct ? 1 : 0,
    averageMastery: average(Object.values(l.mastery || {}))
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="panel full-panel">
      <h2 className="panel-title">Mastery Progress</h2>

      <div className="chart-wrap">
        {mounted ? (
          <LineChart width={860} height={300} data={data}>
            <XAxis dataKey="step" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="correctness" stroke="#c47a2c" strokeWidth={2} isAnimationActive={false} />
            <Line type="monotone" dataKey="averageMastery" stroke="#115a8c" strokeWidth={3} isAnimationActive={false} />
          </LineChart>
        ) : (
          <div className="chart-placeholder" aria-hidden="true" />
        )}
      </div>

    </section>
  );
}

function average(values: number[]) {
  if (!values.length) return 0.5;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
