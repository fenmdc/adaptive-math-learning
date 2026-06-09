import conceptsData from "../../../data/concepts.json";
import problemsData from "../../../data/problems.json";
import type { ConceptNode } from "../../../../../packages/adaptive-engine";
import type { StudentModel } from "../../shared/studentModel";
import type { SimulationLog } from "../types";

const concepts = conceptsData as ConceptNode[];
const problems = problemsData as Array<{ concepts: string[]; difficulty: number; isAutoGradable: boolean }>;

export default function ConceptGraphPanel({
  logs,
  model
}: {
  logs: SimulationLog[];
  model: StudentModel | null;
}) {
  const coverage = summarizeCoverage(concepts, problems);
  const graphStats = summarizeGraph(concepts, coverage);
  const gaps = summarizePrerequisiteGaps(logs);
  const mapNodes = buildKnowledgeMap(concepts, coverage, gaps, model);

  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Concept Graph v0</p>
          <h2 className="panel-title">Prerequisite gap resolver</h2>
        </div>
        <div className="summary-score">{graphStats.nodeCount}</div>
      </div>

      <p className="summary-recommendation">
        The current graph links {graphStats.nodeCount} concepts across {graphStats.domainCount} domains with {graphStats.edgeCount} prerequisite edge(s). Problem coverage is {graphStats.coverageRate}%.
      </p>

      <div className="graph-stat-grid">
        <GraphStat label="Covered Nodes" value={`${graphStats.coveredNodeCount}/${graphStats.nodeCount}`} />
        <GraphStat label="Problem Links" value={String(graphStats.problemLinks)} />
        <GraphStat label="Uncovered Nodes" value={String(graphStats.uncoveredNodeCount)} />
        <GraphStat label="Gap Signals" value={String(gaps.reduce((sum, gap) => sum + gap.count, 0))} />
      </div>

      <div className="summary-grid">
        <div>
          <h3 className="summary-list-title">Top Gaps</h3>
          <div className="summary-list">
            {gaps.length === 0 && <p className="muted">No prerequisite gaps detected yet.</p>}
            {gaps.slice(0, 4).map((gap) => (
              <div className="summary-item summary-item-focus" key={`${gap.concept}-${gap.targetConcept}`}>
                <div>
                  <strong>{gap.concept}</strong>
                  <div className="muted">
                    Before {gap.targetConcept} · depth {gap.depth} · {gap.count} signal(s)
                  </div>
                </div>
                <div className="summary-percent">{Math.round(gap.mastery * 100)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="summary-list-title">Coverage Holes</h3>
          <div className="summary-list">
            {coverage.uncovered.slice(0, 4).map((node) => (
              <div className="summary-item" key={node.id}>
                <div>
                  <strong>{node.id}</strong>
                  <div className="muted">{node.domain} · {node.strand}</div>
                </div>
              </div>
            ))}
            {coverage.uncovered.length === 0 && <p className="muted">Every graph node currently has at least one tagged problem.</p>}
          </div>
        </div>
      </div>

      <div className="knowledge-map">
        {graphStats.domains.map((domain) => (
          <div className="knowledge-domain" key={domain.domain}>
            <div className="knowledge-domain-head">
              <h3>{domain.domain}</h3>
              <span>{domain.covered}/{domain.count}</span>
            </div>
            <div className="knowledge-node-grid">
              {mapNodes
                .filter((node) => node.domain === domain.domain)
                .map((node) => (
                  <div className={`knowledge-node knowledge-node-${node.status}`} key={node.id}>
                    <div className="knowledge-node-main">
                      <strong>{node.name}</strong>
                      <span>{node.problemCount} problem(s)</span>
                    </div>
                    <div className="knowledge-node-meta">
                      {node.masteryText} · {node.edgeText}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GraphStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="graph-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function summarizeGraph(nodes: ConceptNode[], coverage: ReturnType<typeof summarizeCoverage>) {
  const domains = [...new Set(nodes.map((node) => node.domain))]
    .map((domain) => ({
      domain,
      count: nodes.filter((node) => node.domain === domain).length,
      covered: nodes.filter((node) => node.domain === domain && coverage.byConcept[node.id]?.problemCount > 0).length
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
  const coveredNodeCount = nodes.filter((node) => coverage.byConcept[node.id]?.problemCount > 0).length;

  return {
    nodeCount: nodes.length,
    edgeCount: nodes.reduce((sum, node) => sum + node.prerequisites.length, 0),
    coveredNodeCount,
    uncoveredNodeCount: nodes.length - coveredNodeCount,
    coverageRate: Math.round((coveredNodeCount / nodes.length) * 100),
    problemLinks: Object.values(coverage.byConcept).reduce((sum, item) => sum + item.problemCount, 0),
    domainCount: domains.length,
    domains
  };
}

function summarizeCoverage(nodes: ConceptNode[], problemItems: typeof problems) {
  const byConcept: Record<string, {
    problemCount: number;
    autoGradableCount: number;
    minDifficulty: number;
    maxDifficulty: number;
  }> = {};

  nodes.forEach((node) => {
    byConcept[node.id] = {
      problemCount: 0,
      autoGradableCount: 0,
      minDifficulty: 0,
      maxDifficulty: 0
    };
  });

  problemItems.forEach((problem) => {
    problem.concepts.forEach((concept) => {
      const current = byConcept[concept] ?? {
        problemCount: 0,
        autoGradableCount: 0,
        minDifficulty: 0,
        maxDifficulty: 0
      };
      const minDifficulty = current.problemCount === 0
        ? problem.difficulty
        : Math.min(current.minDifficulty, problem.difficulty);
      const maxDifficulty = current.problemCount === 0
        ? problem.difficulty
        : Math.max(current.maxDifficulty, problem.difficulty);

      byConcept[concept] = {
        problemCount: current.problemCount + 1,
        autoGradableCount: current.autoGradableCount + (problem.isAutoGradable ? 1 : 0),
        minDifficulty,
        maxDifficulty
      };
    });
  });

  return {
    byConcept,
    uncovered: nodes.filter((node) => (byConcept[node.id]?.problemCount ?? 0) === 0)
  };
}

function buildKnowledgeMap(
  nodes: ConceptNode[],
  coverage: ReturnType<typeof summarizeCoverage>,
  gaps: ReturnType<typeof summarizePrerequisiteGaps>,
  model: StudentModel | null
) {
  const gapConcepts = new Set(gaps.map((gap) => gap.concept));
  const now = new Date().toISOString();

  return nodes
    .map((node) => {
      const state = model?.conceptStates[node.id];
      const coverageItem = coverage.byConcept[node.id] ?? {
        problemCount: 0,
        autoGradableCount: 0,
        minDifficulty: 0,
        maxDifficulty: 0
      };
      const status = getNodeStatus(node.id, state, coverageItem.problemCount, gapConcepts, now);

      return {
        id: node.id,
        name: node.name,
        domain: node.domain,
        problemCount: coverageItem.problemCount,
        status,
        masteryText: state ? `${Math.round(state.mastery * 100)}% mastery` : "not measured",
        edgeText: `${node.prerequisites.length} prereq`
      };
    })
    .sort((a, b) => {
      const domainOrder = a.domain.localeCompare(b.domain);
      if (domainOrder !== 0) return domainOrder;
      return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);
    });
}

function getNodeStatus(
  id: string,
  state: StudentModel["conceptStates"][string] | undefined,
  problemCount: number,
  gapConcepts: Set<string>,
  now: string
) {
  if (gapConcepts.has(id)) return "gap";
  if (problemCount === 0) return "uncovered";
  if (!state) return "unseen";
  if (state.reviewDueAt <= now) return "due";
  if (state.mastery >= 0.68 && state.stability >= 0.55 && state.wrongStreak === 0) return "secure";
  if (state.mastery < 0.55 || state.stability < 0.5 || state.wrongStreak > 0) return "developing";
  return "unseen";
}

function statusRank(status: string) {
  if (status === "gap") return 0;
  if (status === "due") return 1;
  if (status === "developing") return 2;
  if (status === "uncovered") return 3;
  if (status === "unseen") return 4;
  return 5;
}

function summarizePrerequisiteGaps(logs: SimulationLog[]) {
  const gaps = new Map<string, {
    concept: string;
    targetConcept: string;
    depth: number;
    mastery: number;
    count: number;
  }>();

  logs.forEach((log) => {
    (log.prerequisiteGaps ?? []).forEach((gap) => {
      const key = `${gap.concept}:${gap.targetConcept}`;
      const current = gaps.get(key);

      gaps.set(key, {
        concept: gap.concept,
        targetConcept: gap.targetConcept,
        depth: Math.min(current?.depth ?? gap.depth, gap.depth),
        mastery: current ? Math.min(current.mastery, gap.mastery) : gap.mastery,
        count: (current?.count ?? 0) + 1
      });
    });
  });

  return [...gaps.values()].sort((a, b) => b.count - a.count || a.mastery - b.mastery);
}
