import learningPathData from "../../../../datasets/textbooks/college-algebra-stitz-zeager/learning_path.json";
import type { Problem } from "../../../../packages/adaptive-engine";

export type CollegeAlgebraPathGroup = "Functions" | "Polynomials" | "Quadratics";
export type CollegeAlgebraPathRole = "bridge" | "core" | "honors";

export type CollegeAlgebraPathNode = {
  id: string;
  group: CollegeAlgebraPathGroup;
  title: string;
  focus: string;
  chapter: string;
  chapterTitle: string;
  problemType: string;
  concepts: string[];
  prerequisites: string[];
  prerequisiteTitles: string[];
  role: CollegeAlgebraPathRole;
  problemCount: number;
  autoGradableCount: number;
  layerLabel: string;
  difficultyLabel: string;
  practiceHref: string;
};

type CollegeAlgebraPathNodeDefinition = {
  id: string;
  group: CollegeAlgebraPathGroup;
  title: string;
  focus: string;
  chapter: string;
  problemType: string;
  concepts: string[];
  prerequisites: string[];
  role: CollegeAlgebraPathRole;
};

const definitions = learningPathData as CollegeAlgebraPathNodeDefinition[];
const SOURCE_COLLECTION = "college_algebra_stitz_zeager";

export function buildCollegeAlgebraLearningPath(items: Problem[]) {
  const collegeProblems = items.filter((problem) => problem.curriculum.sourceCollection === SOURCE_COLLECTION);
  const titleById = new Map(definitions.map((definition) => [definition.id, definition.title]));
  const nodes = definitions.map((definition) => {
    const matched = collegeProblems.filter((problem) =>
      problem.curriculum.chapter === definition.chapter &&
      problem.taxonomy?.problemType === definition.problemType
    );
    const first = matched[0] ?? collegeProblems.find((problem) => problem.curriculum.chapter === definition.chapter);

    return {
      ...definition,
      chapterTitle: first?.curriculum.chapterTitle ?? definition.chapter,
      prerequisiteTitles: definition.prerequisites.map((id) => titleById.get(id) ?? formatExternalPrerequisite(id)),
      problemCount: matched.length,
      autoGradableCount: matched.filter((problem) => problem.isAutoGradable).length,
      layerLabel: summarizeLabels(matched.map((problem) => problem.taxonomy?.layer)),
      difficultyLabel: summarizeDifficulty(matched),
      practiceHref: buildPracticeHref(definition)
    };
  });

  return {
    nodes,
    groups: groupNodes(nodes),
    totalProblems: nodes.reduce((sum, node) => sum + node.problemCount, 0),
    totalNodes: nodes.length
  };
}

function groupNodes(nodes: CollegeAlgebraPathNode[]) {
  return (["Functions", "Polynomials", "Quadratics"] as CollegeAlgebraPathGroup[])
    .map((group) => ({
      group,
      nodes: nodes.filter((node) => node.group === group),
      problemCount: nodes
        .filter((node) => node.group === group)
        .reduce((sum, node) => sum + node.problemCount, 0)
    }))
    .filter((group) => group.nodes.length > 0);
}

function buildPracticeHref(definition: CollegeAlgebraPathNodeDefinition) {
  const params = new URLSearchParams({
    course: "Algebra 1",
    chapter: definition.chapter,
    problemType: definition.problemType,
    stage: "Algebra Readiness",
    autoGradableOnly: "true",
    sessionTitle: definition.title,
    sessionGoal: definition.focus,
    sessionSource: "home",
    returnHref: "/"
  });

  return `/practice?${params.toString()}`;
}

function summarizeLabels(values: Array<string | undefined>) {
  const labels = [...new Set(values.filter(Boolean) as string[])];
  return labels.length ? labels.join(" / ") : "Unlabeled";
}

function summarizeDifficulty(items: Problem[]) {
  if (items.length === 0) return "No items";
  const values = items.map((problem) => problem.difficulty);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return min === max ? `Level ${min}` : `Levels ${min}-${max}`;
}

function formatExternalPrerequisite(id: string) {
  return id
    .replace(/^ca-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
