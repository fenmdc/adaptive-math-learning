import Link from "next/link";
import explanationsData from "../../../data/exampleExplanations.json";
import problemsData from "../../../data/problems.json";
import type { Problem } from "../../../../../packages/adaptive-engine";

type ExplanationMap = Record<string, unknown>;

const problems = problemsData as Problem[];
const explanations = explanationsData as ExplanationMap;

const MVP_TRACKS = [
  {
    key: "prealgebra",
    title: "Pre-Algebra",
    description: "Foundation arithmetic, ratios, percent, expressions, and readiness fluency.",
    href: "/practice?course=Pre-Algebra",
    match: (problem: Problem) => problem.curriculum.course === "Pre-Algebra"
  },
  {
    key: "amc8",
    title: "AMC8 Transfer",
    description: "Competition-style transfer practice across number theory, geometry, counting, and statistics.",
    href: "/practice?stage=AMC8%20Transfer",
    match: (problem: Problem) => problem.taxonomy?.stage === "AMC8 Transfer"
  },
  {
    key: "algebra",
    title: "Algebra 1 Readiness",
    description: "Linear equations, inequalities, systems, factoring, quadratics, and functions.",
    href: "/practice?course=Algebra%201&stage=Algebra%20Readiness",
    match: (problem: Problem) => problem.curriculum.course === "Algebra 1" || problem.taxonomy?.stage === "Algebra Readiness"
  }
];

export default function ProblemBankCoveragePanel() {
  const summary = summarizeProblemBank(problems, explanations);

  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Problem Bank Coverage</p>
          <h2 className="panel-title">Adaptive graph learning MVP coverage</h2>
        </div>
        <div className="summary-score">{summary.total}</div>
      </div>

      <p className="summary-recommendation">
        The active bank now supports the target MVP path from Pre-Algebra to AMC8 transfer and Algebra 1 readiness, with {summary.explanationRate}% explanation coverage and {summary.autoGradableRate}% auto-gradable coverage.
      </p>

      <div className="graph-stat-grid">
        <CoverageStat label="Auto-Gradable" value={`${summary.autoGradable}/${summary.total}`} />
        <CoverageStat label="Explanations" value={`${summary.withExplanations}/${summary.total}`} />
        <CoverageStat label="Chapters" value={String(summary.chapterCount)} />
        <CoverageStat label="Concepts" value={String(summary.conceptCount)} />
      </div>

      <div className="mvp-coverage-grid">
        {MVP_TRACKS.map((track) => {
          const item = summary.tracks.find((candidate) => candidate.key === track.key);
          if (!item) return null;

          return (
            <Link className="mvp-coverage-card" href={track.href} key={track.key}>
              <div className="mvp-coverage-card-head">
                <div>
                  <p>{track.title}</p>
                  <strong>{item.problemCount}</strong>
                </div>
                <span>{item.chapterCount} chapters</span>
              </div>
              <div className="coverage-meter" aria-hidden="true">
                <div className="coverage-meter-fill" style={{ width: `${item.explanationRate}%` }} />
              </div>
              <p>{track.description}</p>
              <div className="coverage-card-meta">
                <span>{item.autoGradableRate}% auto-check</span>
                <span>{item.explanationRate}% explained</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="coverage-split-grid">
        <CoverageDistribution title="Adaptive Stage" rows={summary.stages} total={summary.total} />
        <CoverageDistribution title="Difficulty Layer" rows={summary.layers} total={summary.total} />
        <CoverageList title="Top Source Collections" rows={summary.sources.slice(0, 6)} />
      </div>
    </section>
  );
}

function summarizeProblemBank(items: Problem[], explanationMap: ExplanationMap) {
  const withExplanations = items.filter((problem) => Boolean(explanationMap[problem.id])).length;
  const autoGradable = items.filter((problem) => problem.isAutoGradable).length;
  const chapters = new Set(items.map((problem) => problem.curriculum.chapter));
  const concepts = new Set(items.flatMap((problem) => problem.concepts));

  return {
    total: items.length,
    autoGradable,
    autoGradableRate: percent(autoGradable, items.length),
    withExplanations,
    explanationRate: percent(withExplanations, items.length),
    chapterCount: chapters.size,
    conceptCount: concepts.size,
    stages: countTaxonomy(items, (problem) => problem.taxonomy?.stage),
    layers: countTaxonomy(items, (problem) => problem.taxonomy?.layer),
    sources: countTaxonomy(items, (problem) => problem.curriculum.sourceCollection),
    tracks: MVP_TRACKS.map((track) => {
      const trackProblems = items.filter(track.match);
      const trackExplanations = trackProblems.filter((problem) => Boolean(explanationMap[problem.id])).length;
      const trackAutoGradable = trackProblems.filter((problem) => problem.isAutoGradable).length;

      return {
        key: track.key,
        problemCount: trackProblems.length,
        chapterCount: new Set(trackProblems.map((problem) => problem.curriculum.chapter)).size,
        explanationRate: percent(trackExplanations, trackProblems.length),
        autoGradableRate: percent(trackAutoGradable, trackProblems.length)
      };
    })
  };
}

function CoverageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="graph-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CoverageDistribution({
  rows,
  title,
  total
}: {
  rows: Array<{ key: string; count: number }>;
  title: string;
  total: number;
}) {
  return (
    <div className="quality-card">
      <h4>{title}</h4>
      <div className="quality-bars">
        {rows.map((row) => (
          <div className="quality-bar-row" key={row.key}>
            <div className="quality-bar-label">
              <span>{row.key}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="quality-bar-track">
              <div className="quality-bar-fill" style={{ width: `${percent(row.count, total)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageList({
  rows,
  title
}: {
  rows: Array<{ key: string; count: number }>;
  title: string;
}) {
  return (
    <div className="quality-card">
      <h4>{title}</h4>
      <div className="quality-chip-list">
        {rows.map((row) => (
          <span className="quality-chip" key={row.key}>
            {row.key.replace(/_/g, " ")}
            <strong>{row.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function countTaxonomy(items: Problem[], getValue: (problem: Problem) => string | undefined) {
  const counts = new Map<string, number>();

  items.forEach((problem) => {
    const key = getValue(problem) || "Unlabeled";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
