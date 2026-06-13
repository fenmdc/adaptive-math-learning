import Link from "next/link";
import explanationsData from "../../../data/exampleExplanations.json";
import problemsData from "../../../data/problems.json";
import type { Problem } from "../../../../../packages/adaptive-engine";
import { buildContentPipelineReport } from "../../shared/contentPipeline";
import { buildExplanationReviewQueue, explanationQualityPercent, summarizeExplanationQuality, type ExampleExplanation } from "../../shared/explanationQuality";
import { buildProblemQualityAudit, percent } from "../../shared/problemQuality";

type ExplanationMap = Record<string, ExampleExplanation>;

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
  const reviewQueue = buildExplanationReviewQueue(problems, explanations);
  const audit = buildProblemQualityAudit(problems, explanations);
  const pipeline = buildContentPipelineReport({
    problems,
    explanations,
    staging: {
      problemRows: 0,
      distractorRows: 0,
      explanationRows: 0
    }
  });

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
        The active bank now supports the target MVP path from Pre-Algebra to AMC8 transfer and Algebra 1 readiness, with {summary.explanationRate}% explanation coverage, {summary.explanationQuality.averageScore}/100 average explanation quality, {summary.autoGradableRate}% auto-gradable coverage, and a {audit.readinessScore}/100 quality readiness score.
      </p>

      <ContentPipelinePanel pipeline={pipeline} />

      <div className="graph-stat-grid">
        <CoverageStat label="Readiness" value={`${audit.readinessScore}/100`} />
        <CoverageStat label="Auto-Gradable" value={`${summary.autoGradable}/${summary.total}`} />
        <CoverageStat label="Explanations" value={`${summary.withExplanations}/${summary.total}`} />
        <CoverageStat label="Complete Notes" value={`${summary.explanationQuality.counts.complete}/${summary.total}`} />
        <CoverageStat label="Choice QA" value={`${audit.fullDistractorCoverage}/${audit.multipleChoice}`} />
        <CoverageStat label="Remote Assets" value={String(audit.remoteAssets)} />
      </div>

      <QualityActionPanel audit={audit} />

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
        <ExplanationQualityCard summary={summary.explanationQuality} />
        <QualityBacklogCard audit={audit} />
        <CoverageDistribution title="Adaptive Stage" rows={summary.stages} total={summary.total} />
        <CoverageDistribution title="Difficulty Layer" rows={summary.layers} total={summary.total} />
        <CoverageList title="Top Source Collections" rows={summary.sources.slice(0, 6)} />
      </div>

      <ExplanationReviewQueuePanel queue={reviewQueue} />
    </section>
  );
}

function ContentPipelinePanel({
  pipeline
}: {
  pipeline: ReturnType<typeof buildContentPipelineReport>;
}) {
  return (
    <div className="content-pipeline-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Content Pipeline v1</p>
          <h3 className="panel-title">Source, quality, and diagnostic gates</h3>
          <p className="muted">{pipeline.summary}</p>
        </div>
        <div className={`summary-score pipeline-status-${pipeline.status.toLowerCase().replace(/\s+/g, "-")}`}>
          {pipeline.readinessScore}
        </div>
      </div>
      <div className="graph-stat-grid">
        <CoverageStat label="Pipeline" value={pipeline.status} />
        <CoverageStat label="Diagnostic Slots" value={`${pipeline.diagnosticGate.selectedSlots}/${pipeline.diagnosticGate.totalSlots}`} />
        <CoverageStat label="Sources" value={String(pipeline.sourceCollections.length)} />
        <CoverageStat label="Staging" value={String(pipeline.staging.problemRows)} />
      </div>
      <div className="quality-action-grid">
        {pipeline.nextActions.slice(0, 3).map((action) => (
          <div className={`quality-action-card quality-priority-${action.priority}`} key={action.title}>
            <span>{action.priority}</span>
            <strong>{action.title}</strong>
            <p>{action.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function summarizeProblemBank(items: Problem[], explanationMap: ExplanationMap) {
  const withExplanations = items.filter((problem) => Boolean(explanationMap[problem.id])).length;
  const autoGradable = items.filter((problem) => problem.isAutoGradable).length;
  const chapters = new Set(items.map((problem) => problem.curriculum.chapter));
  const concepts = new Set(items.flatMap((problem) => problem.concepts));
  const explanationQuality = summarizeExplanationQuality(items, explanationMap);

  return {
    total: items.length,
    autoGradable,
    autoGradableRate: percent(autoGradable, items.length),
    withExplanations,
    explanationRate: percent(withExplanations, items.length),
    explanationQuality,
    chapterCount: chapters.size,
    conceptCount: concepts.size,
    stages: countTaxonomy(items, (problem) => problem.taxonomy?.stage),
    layers: countTaxonomy(items, (problem) => problem.taxonomy?.layer),
    sources: countTaxonomy(items, (problem) => problem.curriculum.sourceCollection),
    tracks: MVP_TRACKS.map((track) => {
      const trackProblems = items.filter(track.match);
      const trackExplanations = trackProblems.filter((problem) => Boolean(explanationMap[problem.id])).length;
      const trackAutoGradable = trackProblems.filter((problem) => problem.isAutoGradable).length;
      const trackQuality = summarizeExplanationQuality(trackProblems, explanationMap);

      return {
        key: track.key,
        problemCount: trackProblems.length,
        chapterCount: new Set(trackProblems.map((problem) => problem.curriculum.chapter)).size,
        explanationRate: percent(trackExplanations, trackProblems.length),
        autoGradableRate: percent(trackAutoGradable, trackProblems.length),
        completeRate: explanationQualityPercent(trackQuality.counts.complete, trackProblems.length)
      };
    })
  };
}

function ExplanationQualityCard({
  summary
}: {
  summary: ReturnType<typeof summarizeExplanationQuality>;
}) {
  const rows = [
    { key: "Complete", count: summary.counts.complete, className: "quality-complete" },
    { key: "Partial", count: summary.counts.partial, className: "quality-partial" },
    { key: "Weak", count: summary.counts.weak, className: "quality-weak" },
    { key: "Missing", count: summary.counts.missing, className: "quality-missing" }
  ];

  return (
    <div className="quality-card explanation-quality-card">
      <div className="coverage-quality-head">
        <h4>Explanation Quality</h4>
        <strong>{summary.averageScore}/100</strong>
      </div>
      <div className="quality-bars">
        {rows.map((row) => (
          <div className="quality-bar-row" key={row.key}>
            <div className="quality-bar-label">
              <span>{row.key}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="quality-bar-track">
              <div
                className={`quality-bar-fill ${row.className}`}
                style={{ width: `${explanationQualityPercent(row.count, summary.total)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {summary.weakProblems.length > 0 && (
        <div className="explanation-review-list">
          <strong>Review queue</strong>
          {summary.weakProblems.slice(0, 4).map((problem) => (
            <span key={problem.id}>
              {problem.id} · {problem.level} · {problem.issues[0] ?? problem.chapterTitle}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QualityActionPanel({
  audit
}: {
  audit: ReturnType<typeof buildProblemQualityAudit>;
}) {
  return (
    <div className="quality-action-panel">
      <div>
        <p className="eyebrow">Problem Quality Audit v1</p>
        <h3 className="panel-title">Next quality moves</h3>
      </div>
      <div className="quality-action-grid">
        {audit.nextQualityMoves.map((move) => (
          <Link className={`quality-action-card quality-priority-${move.priority}`} href={move.href} key={move.title}>
            <span>{move.priority}</span>
            <strong>{move.title}</strong>
            <p>{move.reason}</p>
            <em>{move.label}</em>
          </Link>
        ))}
        {audit.nextQualityMoves.length === 0 && (
          <p className="muted">No urgent quality action is queued.</p>
        )}
      </div>
    </div>
  );
}

function QualityBacklogCard({
  audit
}: {
  audit: ReturnType<typeof buildProblemQualityAudit>;
}) {
  return (
    <div className="quality-card quality-backlog-card">
      <div className="coverage-quality-head">
        <h4>Coverage Backlog</h4>
        <strong>{audit.thinChapters.length + audit.thinConcepts.length}</strong>
      </div>
      <div className="quality-backlog-grid">
        <div>
          <span>Thin chapters</span>
          <strong>{audit.thinChapters.length}</strong>
          <p>{audit.thinChapters[0] ? `${audit.thinChapters[0].chapterTitle} · ${audit.thinChapters[0].count}/20` : "All chapters meet floor."}</p>
        </div>
        <div>
          <span>Thin concepts</span>
          <strong>{audit.thinConcepts.length}</strong>
          <p>{audit.thinConcepts[0] ? `${audit.thinConcepts[0].concept} · ${audit.thinConcepts[0].count}/5` : "All concepts meet floor."}</p>
        </div>
      </div>
      <div className="explanation-review-list">
        <strong>Top chapter targets</strong>
        {audit.thinChapters.slice(0, 4).map((chapter) => (
          <Link href={chapter.href} key={`${chapter.course}-${chapter.chapter}`}>
            {chapter.course} · {chapter.chapterTitle} · {chapter.count}/20
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExplanationReviewQueuePanel({
  queue
}: {
  queue: ReturnType<typeof buildExplanationReviewQueue>;
}) {
  return (
    <div className="explanation-queue-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Explanation Review Queue v1</p>
          <h3 className="panel-title">Prioritized batches to upgrade to complete</h3>
        </div>
        <div className="summary-score">{queue.totalReviewItems}</div>
      </div>

      <div className="graph-stat-grid">
        <CoverageStat label="Partial" value={String(queue.partialCount)} />
        <CoverageStat label="Weak" value={String(queue.weakCount)} />
        <CoverageStat label="Missing" value={String(queue.missingCount)} />
        <CoverageStat label="Queue Avg" value={`${queue.averageScore}/100`} />
      </div>

      {queue.batches.length === 0 ? (
        <p className="muted">All explanation templates are currently complete.</p>
      ) : (
        <div className="explanation-batch-list">
          {queue.batches.slice(0, 8).map((batch, index) => (
            <div className="explanation-batch-card" key={batch.id}>
              <div className="explanation-batch-rank">{index + 1}</div>
              <div className="explanation-batch-body">
                <div className="explanation-batch-head">
                  <div>
                    <h4>{batch.title}</h4>
                    <p>
                      {batch.course} · {batch.sourceCollection.replace(/_/g, " ")} · {batch.layer} · {batch.stage}
                    </p>
                  </div>
                  <div className="explanation-batch-score">
                    <span>{batch.count} item(s)</span>
                    <strong>{batch.averageScore}/100</strong>
                  </div>
                </div>

                <div className="explanation-issue-row">
                  {batch.topIssues.map((issue) => (
                    <span key={issue.issue}>
                      {issue.issue} · {issue.count}
                    </span>
                  ))}
                </div>

                <div className="explanation-sample-list">
                  {batch.items.slice(0, 3).map((item) => (
                    <Link href={item.href} key={item.id}>
                      {item.id} · {item.quality.score}/100 · {item.quality.issues[0] ?? item.problemType}
                    </Link>
                  ))}
                </div>

                <div className="explanation-batch-actions">
                  <Link className="button-secondary" href={batch.href}>
                    Open batch
                  </Link>
                  <Link className="button-secondary" href={batch.items[0]?.href ?? batch.href}>
                    Review first item
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
