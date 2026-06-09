import fs from "fs";
import path from "path";
import type { AnswerChoice, Distractor, Problem } from "../packages/adaptive-engine";

type StagingProblem = {
  id: string;
  statement: string;
  answer: string;
  answer_type: Problem["answerType"];
  choices: string;
  difficulty: string;
  concepts: string;
  skills: string;
  patterns: string;
  misconceptions: string;
  solution: string;
  course: string;
  theme: string;
  chapter: string;
  chapter_title: string;
  sequence: string;
  source_collection: string;
  source_file: string;
  taxonomy_layer: NonNullable<Problem["taxonomy"]>["layer"];
  taxonomy_stage: NonNullable<Problem["taxonomy"]>["stage"];
  problem_type: string;
  cognitive_tags: string;
  estimated_time_seconds: string;
  notes: string;
};

type DistractorRow = {
  problem_id: string;
  choice_label: string;
  value: string;
  misconception: string;
  cognitive_tag: string;
  explanation: string;
};

const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const APP_PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const CONCEPTS_PATH = path.join(process.cwd(), "apps/web/data/concepts.json");

function main() {
  const stagingProblems = readCsv<StagingProblem>(path.join(STAGING_DIR, "problem_staging.csv"));
  const distractors = readCsv<DistractorRow>(path.join(STAGING_DIR, "distractors.csv"));
  const existing = JSON.parse(fs.readFileSync(APP_PROBLEMS_PATH, "utf8")) as Problem[];
  const replaceSourceCollection = readArg("--replace-source-collection");
  const existingForMerge = replaceSourceCollection
    ? existing.filter((problem) =>
        problem.source !== replaceSourceCollection &&
        problem.curriculum.sourceCollection !== replaceSourceCollection
      )
    : existing;
  const conceptPrerequisites = readConceptPrerequisites();
  const existingIds = new Set(existingForMerge.map((problem) => problem.id));
  const promoted: Problem[] = [];
  const skipped: string[] = [];

  stagingProblems.forEach((row) => {
    if (existingIds.has(row.id)) {
      skipped.push(row.id);
      return;
    }

    promoted.push(mapProblem(row, distractors, conceptPrerequisites));
  });

  const merged = [...existingForMerge, ...promoted.sort(compareProblems)];

  fs.writeFileSync(APP_PROBLEMS_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Promoted ${promoted.length} staging problem(s) into apps/web/data/problems.json`);
  console.log(`Skipped existing ids: ${skipped.length}`);
  if (replaceSourceCollection) {
    console.log(`Replaced source collection: ${replaceSourceCollection}`);
    console.log(`Removed existing collection rows: ${existing.length - existingForMerge.length}`);
  }
  if (skipped.length > 0) console.log(skipped.join(", "));
}

function mapProblem(
  row: StagingProblem,
  distractorRows: DistractorRow[],
  conceptPrerequisites: Map<string, string[]>
): Problem {
  const concepts = splitList(row.concepts);
  const distractors = distractorRows
    .filter((distractor) => distractor.problem_id === row.id)
    .map((distractor, index): Distractor => ({
      id: `${row.id}_d${index + 1}`,
      choiceLabel: distractor.choice_label,
      value: distractor.value,
      misconception: distractor.misconception,
      cognitiveTag: distractor.cognitive_tag,
      explanation: distractor.explanation
    }));

  const choices = parseChoices(row.choices, row.id, distractors);

  return {
    id: row.id,
    statement: row.statement,
    answer: row.answer,
    answerType: row.answer_type,
    choices,
    difficulty: Number(row.difficulty) || 3,
    source: row.source_collection || "staging",
    primaryConcept: concepts[0] ?? "prealg_expressions",
    concepts,
    prerequisiteConcepts: prerequisiteUnion(concepts, conceptPrerequisites),
    skills: splitList(row.skills),
    patterns: splitList(row.patterns),
    misconceptions: splitList(row.misconceptions),
    isAutoGradable: row.answer_type !== "manual" && Boolean(row.answer),
    solution: row.solution,
    curriculum: {
      course: row.course,
      theme: row.theme,
      chapter: row.chapter,
      chapterTitle: row.chapter_title,
      sequence: Number(row.sequence) || 999,
      sourceCollection: row.source_collection || "staging"
    },
    taxonomy: {
      version: "v0",
      layer: row.taxonomy_layer,
      stage: row.taxonomy_stage,
      problemType: row.problem_type,
      cognitiveTags: splitList(row.cognitive_tags),
      estimatedTimeSeconds: Number(row.estimated_time_seconds) || 90
    },
    ...(distractors.length > 0 ? { distractors } : {})
  };
}

function parseChoices(value: string, problemId: string, distractors: Distractor[]): AnswerChoice[] {
  return splitByPipe(value).map((item, index) => {
    const match = item.match(/^([A-E])\s*:\s*(.+)$/i);
    const label = match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index);
    const choiceValue = (match?.[2] ?? item).trim();
    const distractor = distractors.find((candidate) => candidate.choiceLabel === label);

    return {
      label,
      value: choiceValue,
      text: choiceValue,
      ...(distractor ? { distractorId: distractor.id } : {})
    };
  });
}

function readConceptPrerequisites() {
  const concepts = JSON.parse(fs.readFileSync(CONCEPTS_PATH, "utf8")) as Array<{
    id: string;
    prerequisites?: string[];
  }>;

  return new Map(concepts.map((concept) => [concept.id, concept.prerequisites ?? []]));
}

function prerequisiteUnion(concepts: string[], conceptPrerequisites: Map<string, string[]>) {
  return unique(concepts.flatMap((concept) => conceptPrerequisites.get(concept) ?? []));
}

function compareProblems(left: Problem, right: Problem) {
  return (
    courseOrder(left.curriculum.course) - courseOrder(right.curriculum.course) ||
    left.curriculum.sequence - right.curriculum.sequence ||
    left.curriculum.chapter.localeCompare(right.curriculum.chapter) ||
    left.id.localeCompare(right.id)
  );
}

function courseOrder(course: string) {
  if (course === "Pre-Algebra") return 1;
  if (course === "Algebra 1") return 2;
  if (course === "AMC8") return 3;
  return 99;
}

function readCsv<T extends Record<string, string>>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) return [];

  const [headerLine, ...rows] = content.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""])) as T);
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function splitList(value: string) {
  return value ? value.split(";").map((item) => item.trim()).filter(Boolean) : [];
}

function splitByPipe(value: string) {
  return value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
