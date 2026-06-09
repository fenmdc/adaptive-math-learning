import fs from "fs";
import path from "path";

type StagingProblem = {
  id: string;
  statement: string;
  answer: string;
  answer_type: string;
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
  taxonomy_layer: string;
  taxonomy_stage: string;
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

type ExplanationRow = {
  problem_id: string;
  hint_1: string;
  hint_2: string;
  step_by_step: string;
  common_mistake: string;
  why_correct: string;
  variant_idea: string;
};

const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const CONCEPTS_PATH = path.join(process.cwd(), "datasets/concepts/concepts.csv");
const PROBLEMS_PATH = path.join(process.cwd(), "datasets/problems/problems.csv");
const APP_PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const VALID_LAYERS = new Set(["Foundation", "Standard", "Honors", "AMC8", "AMC8 Stretch"]);
const VALID_STAGES = new Set(["Foundation", "Bridge", "Algebra Readiness", "AMC8 Transfer"]);
const VALID_ANSWER_TYPES = new Set(["numeric", "fraction", "symbolic", "text", "multiple_choice", "manual"]);

function main() {
  const problems = readCsv<StagingProblem>(path.join(STAGING_DIR, "problem_staging.csv"));
  const distractors = readCsv<DistractorRow>(path.join(STAGING_DIR, "distractors.csv"));
  const explanations = readCsv<ExplanationRow>(path.join(STAGING_DIR, "example_explanations.csv"));
  const conceptIds = new Set(readCsv<Record<string, string>>(CONCEPTS_PATH).map((row) => row.id));
  const existingCsvProblemIds = new Set(readCsv<Record<string, string>>(PROBLEMS_PATH).map((row) => row.id));
  const existingAppProblemIds = new Set(readAppProblemIds(APP_PROBLEMS_PATH));
  const errors: string[] = [];
  const warnings: string[] = [];
  const stagingIds = new Set<string>();

  problems.forEach((problem, index) => {
    const row = index + 2;
    validateProblem(problem, row, conceptIds, existingCsvProblemIds, existingAppProblemIds, stagingIds, errors, warnings);
  });

  validateDistractors(problems, distractors, errors, warnings);
  validateExplanations(problems, explanations, warnings);

  const multipleChoiceCount = problems.filter((problem) => problem.answer_type === "multiple_choice").length;
  const readyCount = problems.filter((problem) => isPromotionReady(problem)).length;

  console.log("Staging validation");
  console.log(`- Problems: ${problems.length}`);
  console.log(`- Multiple choice: ${multipleChoiceCount}`);
  console.log(`- Distractors: ${distractors.length}`);
  console.log(`- Explanations: ${explanations.length}`);
  console.log(`- Promotion-ready rows: ${readyCount}`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Errors: ${errors.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings");
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (errors.length > 0) {
    console.log("\nErrors");
    errors.forEach((error) => console.log(`- ${error}`));
    process.exit(1);
  }
}

function validateProblem(
  problem: StagingProblem,
  row: number,
  conceptIds: Set<string>,
  existingCsvProblemIds: Set<string>,
  existingAppProblemIds: Set<string>,
  stagingIds: Set<string>,
  errors: string[],
  warnings: string[]
) {
  required(problem.id, row, "id", errors);
  required(problem.statement, row, "statement", errors);
  required(problem.answer, row, "answer", errors);
  required(problem.concepts, row, "concepts", errors);
  required(problem.course, row, "course", errors);
  required(problem.chapter, row, "chapter", errors);
  required(problem.solution, row, "solution", warnings);

  if (stagingIds.has(problem.id)) errors.push(`row ${row}: duplicate staging id ${problem.id}`);
  stagingIds.add(problem.id);

  if (existingCsvProblemIds.has(problem.id)) {
    errors.push(`row ${row}: id ${problem.id} already exists in datasets/problems/problems.csv`);
  }

  if (existingAppProblemIds.has(problem.id)) {
    warnings.push(`row ${row}: id ${problem.id} already exists in apps/web/data/problems.json and will be skipped by promotion`);
  }

  if (!VALID_ANSWER_TYPES.has(problem.answer_type)) {
    errors.push(`row ${row}: answer_type must be one of ${[...VALID_ANSWER_TYPES].join(", ")}`);
  }

  const difficulty = Number(problem.difficulty);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    errors.push(`row ${row}: difficulty must be an integer from 1 to 5`);
  }

  splitList(problem.concepts).forEach((concept) => {
    if (!conceptIds.has(concept)) errors.push(`row ${row}: unknown concept ${concept}`);
  });

  if (!VALID_LAYERS.has(problem.taxonomy_layer)) {
    errors.push(`row ${row}: taxonomy_layer must be one of ${[...VALID_LAYERS].join(", ")}`);
  }

  if (!VALID_STAGES.has(problem.taxonomy_stage)) {
    errors.push(`row ${row}: taxonomy_stage must be one of ${[...VALID_STAGES].join(", ")}`);
  }

  required(problem.problem_type, row, "problem_type", errors);
  required(problem.cognitive_tags, row, "cognitive_tags", errors);

  const estimatedTime = Number(problem.estimated_time_seconds);
  if (!Number.isInteger(estimatedTime) || estimatedTime <= 0) {
    errors.push(`row ${row}: estimated_time_seconds must be a positive integer`);
  }

  if (problem.answer_type === "multiple_choice") {
    const choices = parseChoices(problem.choices);
    if (choices.length < 2) errors.push(`row ${row}: multiple_choice rows need at least two choices`);
    if (!choices.some((choice) => normalize(choice.value) === normalize(problem.answer))) {
      errors.push(`row ${row}: choices must include the normalized answer ${problem.answer}`);
    }
  }
}

function validateDistractors(
  problems: StagingProblem[],
  distractors: DistractorRow[],
  errors: string[],
  warnings: string[]
) {
  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));
  const distractorKeys = new Set<string>();

  distractors.forEach((distractor, index) => {
    const row = index + 2;
    const problem = problemMap.get(distractor.problem_id);
    if (!problem) {
      errors.push(`distractors row ${row}: unknown problem_id ${distractor.problem_id}`);
      return;
    }

    const key = `${distractor.problem_id}:${distractor.choice_label}`;
    if (distractorKeys.has(key)) errors.push(`distractors row ${row}: duplicate distractor for ${key}`);
    distractorKeys.add(key);

    required(distractor.choice_label, row, "choice_label", errors, "distractors");
    required(distractor.misconception, row, "misconception", errors, "distractors");
    required(distractor.cognitive_tag, row, "cognitive_tag", errors, "distractors");
    required(distractor.explanation, row, "explanation", warnings, "distractors");

    const choice = parseChoices(problem.choices).find((item) => item.label === distractor.choice_label);
    if (!choice) {
      errors.push(`distractors row ${row}: choice ${distractor.choice_label} is not present on ${problem.id}`);
      return;
    }

    if (normalize(choice.value) === normalize(problem.answer)) {
      errors.push(`distractors row ${row}: choice ${distractor.choice_label} is the correct answer, not a distractor`);
    }

    if (distractor.value && normalize(distractor.value) !== normalize(choice.value)) {
      errors.push(`distractors row ${row}: value ${distractor.value} does not match choice ${choice.label}:${choice.value}`);
    }
  });

  problems
    .filter((problem) => problem.answer_type === "multiple_choice")
    .forEach((problem) => {
      const choices = parseChoices(problem.choices);
      const wrongChoiceCount = choices.filter((choice) => normalize(choice.value) !== normalize(problem.answer)).length;
      const distractorCount = distractors.filter((distractor) => distractor.problem_id === problem.id).length;

      if (distractorCount < wrongChoiceCount) {
        warnings.push(`${problem.id}: has ${wrongChoiceCount} wrong choices but only ${distractorCount} distractor row(s)`);
      }
    });
}

function validateExplanations(
  problems: StagingProblem[],
  explanations: ExplanationRow[],
  warnings: string[]
) {
  const problemIds = new Set(problems.map((problem) => problem.id));

  explanations.forEach((explanation, index) => {
    const row = index + 2;
    if (!problemIds.has(explanation.problem_id)) {
      warnings.push(`example_explanations row ${row}: unknown problem_id ${explanation.problem_id}`);
    }

    if (!explanation.step_by_step) {
      warnings.push(`example_explanations row ${row}: step_by_step is empty`);
    }
  });
}

function isPromotionReady(problem: StagingProblem) {
  return Boolean(
    problem.id &&
    problem.statement &&
    problem.answer &&
    problem.concepts &&
    problem.solution &&
    problem.course &&
    problem.chapter &&
    problem.taxonomy_layer &&
    problem.taxonomy_stage &&
    problem.problem_type &&
    problem.cognitive_tags
  );
}

function readCsv<T extends Record<string, string>>(filePath: string): T[] {
  const [headerLine, ...rows] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""])) as T);
}

function readAppProblemIds(filePath: string) {
  if (!fs.existsSync(filePath)) return [];

  const problems = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<{ id?: string }>;
  return problems.map((problem) => problem.id).filter(Boolean) as string[];
}

function parseChoices(value: string) {
  return splitByPipe(value).map((item, index) => {
    const match = item.match(/^([A-E])\s*:\s*(.+)$/i);

    return {
      label: match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index),
      value: (match?.[2] ?? item).trim()
    };
  });
}

function splitList(value: string) {
  return value ? value.split(";").map((item) => item.trim()).filter(Boolean) : [];
}

function splitByPipe(value: string) {
  return value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
}

function required(
  value: string,
  row: number,
  field: string,
  collection: string[],
  file = "problem_staging"
) {
  if (!value) collection.push(`${file} row ${row}: ${field} is required`);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
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

main();
