import type { Problem, StudentState } from "./index";

export type ConceptNode = {
  id: string;
  name: string;
  domain: string;
  strand: string;
  description: string;
  difficultyLevel: number;
  importanceWeight: number;
  prerequisites: string[];
  amcRelevance: number;
};

export type ConceptGraph = {
  nodes: Record<string, ConceptNode>;
  prerequisites: Record<string, string[]>;
  dependents: Record<string, string[]>;
};

export type PrerequisiteGap = {
  concept: string;
  targetConcept: string;
  depth: number;
  mastery: number;
  score: number;
};

export const DEFAULT_MASTERY = 0.5;

export function buildConceptGraph(nodes: ConceptNode[]): ConceptGraph {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const prerequisites = Object.fromEntries(
    nodes.map((node) => [node.id, node.prerequisites.filter(Boolean)])
  );
  const dependents: Record<string, string[]> = {};

  nodes.forEach((node) => {
    node.prerequisites.forEach((prerequisite) => {
      dependents[prerequisite] = [...(dependents[prerequisite] ?? []), node.id];
    });
  });

  return {
    nodes: nodeMap,
    prerequisites,
    dependents
  };
}

export function buildConceptGraphFromProblems(problems: Problem[]): ConceptGraph {
  const ids = new Set<string>();
  const prerequisites: Record<string, Set<string>> = {};

  problems.forEach((problem) => {
    problem.concepts.forEach((concept) => {
      ids.add(concept);
      prerequisites[concept] = prerequisites[concept] ?? new Set();
      problem.prerequisiteConcepts.forEach((prerequisite) => {
        if (prerequisite && prerequisite !== concept) {
          ids.add(prerequisite);
          prerequisites[concept].add(prerequisite);
        }
      });
    });
  });

  return buildConceptGraph(
    [...ids].map((id) => ({
      id,
      name: humanizeConcept(id),
      domain: inferDomain(id),
      strand: "Inferred",
      description: "Inferred from problem prerequisite metadata.",
      difficultyLevel: 3,
      importanceWeight: 1,
      prerequisites: [...(prerequisites[id] ?? [])],
      amcRelevance: 0.8
    }))
  );
}

export function findPrerequisiteGaps(
  targetConcepts: string[],
  state: StudentState,
  graph: ConceptGraph,
  masteryThreshold = 0.55
): PrerequisiteGap[] {
  const gaps = new Map<string, PrerequisiteGap>();

  targetConcepts.forEach((targetConcept) => {
    const targetMastery = state.mastery[targetConcept] ?? DEFAULT_MASTERY;
    const targetIsWeak = targetMastery < masteryThreshold;

    collectPrerequisites(targetConcept, graph).forEach(({ concept, depth }) => {
      const hasPrerequisiteEvidence = Object.prototype.hasOwnProperty.call(state.mastery, concept);
      if (!hasPrerequisiteEvidence && !targetIsWeak) return;

      const mastery = hasPrerequisiteEvidence ? state.mastery[concept] : DEFAULT_MASTERY;
      if (mastery >= masteryThreshold) return;

      const node = graph.nodes[concept];
      const score =
        (masteryThreshold - mastery) * 100 +
        (node?.importanceWeight ?? 1) * 12 +
        (node?.amcRelevance ?? 0.8) * 8 +
        Math.max(0, 8 - depth * 2);
      const existing = gaps.get(concept);

      if (!existing || score > existing.score) {
        gaps.set(concept, {
          concept,
          targetConcept,
          depth,
          mastery,
          score
        });
      }
    });
  });

  return [...gaps.values()].sort((a, b) => b.score - a.score || a.depth - b.depth);
}

export function getPrerequisiteClosure(concept: string, graph: ConceptGraph) {
  return collectPrerequisites(concept, graph).map((item) => item.concept);
}

function collectPrerequisites(concept: string, graph: ConceptGraph) {
  const seen = new Set<string>();
  const queue = (graph.prerequisites[concept] ?? []).map((prerequisite) => ({
    concept: prerequisite,
    depth: 1
  }));
  const result: Array<{ concept: string; depth: number }> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.concept)) continue;

    seen.add(current.concept);
    result.push(current);
    (graph.prerequisites[current.concept] ?? []).forEach((prerequisite) => {
      queue.push({
        concept: prerequisite,
        depth: current.depth + 1
      });
    });
  }

  return result;
}

function inferDomain(concept: string) {
  if (concept.startsWith("arith_")) return "Arithmetic";
  if (concept.startsWith("prealg_")) return "Pre-Algebra";
  if (concept.startsWith("alg_")) return "Algebra";
  if (concept.startsWith("geo_")) return "Geometry";
  if (concept.startsWith("nt_")) return "Number Theory";
  if (concept.startsWith("counting_")) return "Counting & Probability";
  if (concept.startsWith("stats_")) return "Statistics";
  return "Unclassified";
}

function humanizeConcept(concept: string) {
  return concept
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
