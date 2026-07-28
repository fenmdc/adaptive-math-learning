import fs from "node:fs";
import path from "node:path";

import { generateChoices } from ".";
import type { PracticeProblem } from "./types";

export type LegacyChoice = {
  label?: string;
  value?: string;
  text?: string;
  distractorId?: string;
};

export type LegacyProblem = {
  id: string;
  statement: string;
  answer: string;
  answerType: string;
  choices?: LegacyChoice[];
  difficulty: number;
  source?: string;
  primaryConcept?: string;
  concepts: string[];
  prerequisiteConcepts?: string[];
  skills?: string[];
  patterns?: string[];
  misconceptions?: string[];
  isAutoGradable: boolean;
  solution?: string;
  curriculum?: { course?: string; [key: string]: unknown };
  taxonomy?: Record<string, unknown>;
  assets?: Array<{ type?: string; url?: string; alt?: string; role?: string }>;
  reviewStatus?: "draft" | "reviewed" | "imported";
  [key: string]: unknown;
};

export type LegacyExplanation = {
  hint1?: string;
  hint2?: string;
  stepByStep?: string;
  commonMistake?: string;
  whyCorrect?: string;
  variantIdea?: string;
};

export type LegacyProblemQuery = {
  offset?: number;
  limit?: number;
  course?: string;
  concept?: string;
  answerType?: string;
};

const DATASET_PATH = ["datasets", "problem-bank", "legacy-v1"];
export const SUPPLEMENT_DATASET_IDS = [
  "cn-olympiad-foundations-v1",
  "cn-olympiad-foundations-v2",
  "cn-olympiad-foundations-v3",
  "cn-olympiad-foundations-v4",
  "english-core-diagnostic-v1",
  "algebra1-remediation-v1",
  "amc8-strategy-v1",
  "cn-junior-auto-v1",
  "cn-senior-auto-v1",
  "cn-grade8-auto-v1",
  "cn-grade9-auto-v1",
  "cn-senior-advanced-v1",
  "prealgebra-reviewed-anchors-v1",
];
const SUPPLEMENT_PATHS = SUPPLEMENT_DATASET_IDS.map((datasetId) => [
  "datasets", "problem-bank", "supplements", datasetId,
]);

let cachedProblems: LegacyProblem[] | undefined;
let cachedExplanations: Record<string, LegacyExplanation> | undefined;
let cachedProblemBankProblems: LegacyProblem[] | undefined;
let cachedProblemBankExplanations: Record<string, LegacyExplanation> | undefined;
let cachedConceptNames: Map<string, string> | undefined;

function readJson<T>(filename: string, root = process.cwd()): T {
  return JSON.parse(fs.readFileSync(path.join(root, ...DATASET_PATH, filename), "utf8")) as T;
}

export function loadLegacyProblems(root = process.cwd()) {
  if (root !== process.cwd()) return readJson<LegacyProblem[]>("problems.json", root);
  cachedProblems ??= readJson<LegacyProblem[]>("problems.json", root);
  return cachedProblems;
}

export function loadLegacyExplanations(root = process.cwd()) {
  if (root !== process.cwd()) return readJson<Record<string, LegacyExplanation>>("example-explanations.json", root);
  cachedExplanations ??= readJson<Record<string, LegacyExplanation>>("example-explanations.json", root);
  return cachedExplanations;
}

function readSupplementJson<T>(datasetPath: string[], filename: string, root: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, ...datasetPath, filename), "utf8")) as T;
}

export function loadProblemBankProblems(root = process.cwd()) {
  if (root !== process.cwd()) {
    return [
      ...loadLegacyProblems(root),
      ...SUPPLEMENT_PATHS.flatMap((datasetPath) => readSupplementJson<LegacyProblem[]>(datasetPath, "problems.json", root)),
    ];
  }
  cachedProblemBankProblems ??= [
    ...loadLegacyProblems(root),
    ...SUPPLEMENT_PATHS.flatMap((datasetPath) => readSupplementJson<LegacyProblem[]>(datasetPath, "problems.json", root)),
  ];
  return cachedProblemBankProblems;
}

export function loadProblemBankExplanations(root = process.cwd()) {
  if (root !== process.cwd()) {
    return Object.assign(
      {},
      loadLegacyExplanations(root),
      ...SUPPLEMENT_PATHS.map((datasetPath) => readSupplementJson<Record<string, LegacyExplanation>>(datasetPath, "example-explanations.json", root)),
    );
  }
  cachedProblemBankExplanations ??= Object.assign(
    {},
    loadLegacyExplanations(root),
    ...SUPPLEMENT_PATHS.map((datasetPath) => readSupplementJson<Record<string, LegacyExplanation>>(datasetPath, "example-explanations.json", root)),
  );
  return cachedProblemBankExplanations;
}

function loadLegacyConceptNames(root = process.cwd()) {
  if (root !== process.cwd()) {
    const concepts = readJson<Array<{ id: string; name: string }>>("concepts.json", root);
    return new Map(concepts.map((concept) => [concept.id, concept.name]));
  }
  if (!cachedConceptNames) {
    const concepts = readJson<Array<{ id: string; name: string }>>("concepts.json", root);
    cachedConceptNames = new Map(concepts.map((concept) => [concept.id, concept.name]));
  }
  return cachedConceptNames;
}

export function queryLegacyProblems(query: LegacyProblemQuery = {}, root = process.cwd()) {
  const requestedOffset = Number.isFinite(query.offset) ? Math.trunc(query.offset!) : 0;
  const requestedLimit = Number.isFinite(query.limit) ? Math.trunc(query.limit!) : 25;
  const offset = Math.max(0, requestedOffset);
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const filtered = loadProblemBankProblems(root).filter((problem) =>
    (!query.course || problem.curriculum?.course === query.course)
    && (!query.concept || problem.concepts.includes(query.concept))
    && (!query.answerType || problem.answerType === query.answerType),
  );

  return {
    total: filtered.length,
    offset,
    limit,
    problems: filtered.slice(offset, offset + limit),
  };
}

function choiceValues(problem: LegacyProblem) {
  const values = (problem.choices ?? []).map((choice) => choice.value ?? choice.text ?? "").filter(Boolean);
  return values.length >= 3 && values.includes(problem.answer)
    ? values
    : generateChoices(problem.answer, problem.id);
}

export function adaptLegacyProblem(problem: LegacyProblem, root = process.cwd()): PracticeProblem {
  const explanations = loadProblemBankExplanations(root);
  const conceptNames = loadLegacyConceptNames(root);
  const support = explanations[problem.id] ?? {};
  const concepts = problem.concepts.length ? problem.concepts : [problem.primaryConcept ?? "unmapped"];
  const firstAsset = problem.assets?.find((asset) => asset.type === "image" && asset.url);

  return {
    id: problem.id,
    statement: problem.statement,
    answer: problem.answer,
    choices: choiceValues(problem),
    difficulty: Number(problem.difficulty) || 1,
    concepts,
    conceptLabel: conceptNames.get(concepts[0]) ?? concepts[0],
    conceptLabels: Object.fromEntries(concepts.map((concept) => [concept, conceptNames.get(concept) ?? concept])),
    skills: problem.skills ?? [],
    patterns: problem.patterns ?? [],
    misconception: problem.misconceptions?.[0],
    misconceptionFeedback: support.commonMistake ?? problem.misconceptions?.join("; ") ?? "Review the operation and verify each step against the question.",
    hint: [support.hint1, support.hint2].filter(Boolean).join(" ") || "Identify the relevant concept, then write the first justified step.",
    explanation: support.stepByStep ?? support.whyCorrect ?? problem.solution ?? "Compare your reasoning with the stated answer.",
    answerType: problem.answerType,
    isAutoGradable: problem.isAutoGradable,
    source: problem.source,
    course: problem.curriculum?.course,
    asset: firstAsset?.url ? { url: firstAsset.url, alt: firstAsset.alt ?? "Problem illustration" } : undefined,
    reviewStatus: problem.reviewStatus === "reviewed" ? "reviewed" : "imported",
  };
}

export function loadLegacyPracticeProblems(limit = 80, root = process.cwd()) {
  return loadLegacyProblems(root)
    .filter((problem) => problem.isAutoGradable && problem.answerType !== "manual")
    .slice(0, limit)
    .map((problem) => adaptLegacyProblem(problem, root));
}

export function getLegacyProblemStats(root = process.cwd()) {
  const problems = loadLegacyProblems(root);
  return {
    total: problems.length,
    autoGradable: problems.filter((problem) => problem.isAutoGradable).length,
    manualReview: problems.filter((problem) => !problem.isAutoGradable).length,
    concepts: loadLegacyConceptNames(root).size,
  };
}
