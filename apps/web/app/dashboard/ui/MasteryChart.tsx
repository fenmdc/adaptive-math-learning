"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function MasteryChart({ logs }) {

  const data = logs.map((l, i) => ({
    step: i,
    correctness: l.correct ? 1 : 0
  }));

  return (
    <div>
      <h2>Mastery Progress</h2>

      <LineChart width={600} height={300} data={data}>
        <XAxis dataKey="step" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="correctness" />
      </LineChart>

    </div>
  );
}
