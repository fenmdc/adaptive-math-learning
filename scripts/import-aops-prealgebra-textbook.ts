import fs from "fs";
import path from "path";

type RawProblem = Record<string, unknown>;

type StagingRow = {
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

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), "datasets/textbooks/aops-prealgebra");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const CONCEPTS_PATH = path.join(process.cwd(), "datasets/concepts/concepts.csv");

const CONCEPT_ALIASES: Array<{ match: RegExp; concept: string }> = [
  { match: /fraction|frac|分数/i, concept: "arith_fractions" },
  { match: /decimal|小数/i, concept: "arith_decimals" },
  { match: /percent|百分/i, concept: "arith_percentages" },
  { match: /ratio|rate|proportion|比例/i, concept: "arith_ratios" },
  { match: /integer|negative|signed|整数|负数/i, concept: "arith_integers" },
  { match: /expression|simplif|expand|combine|表达式|化简/i, concept: "prealg_expressions" },
  { match: /substitut|evaluate|代入/i, concept: "prealg_substitution" },
  { match: /equation|solve|方程/i, concept: "alg_linear_equations" },
  { match: /area|perimeter|geometry|triangle|circle|几何|面积|周长/i, concept: "geo_area" },
  { match: /factor|gcd|lcm|prime|divis/i, concept: "nt_factorization" },
  { match: /probab|counting|count|排列|组合|概率/i, concept: "counting_probability" },
  { match: /mean|median|mode|range|average|平均|中位/i, concept: "stats_median" }
];

function main() {
  const sourceDir = readArg("--source") ?? DEFAULT_SOURCE_DIR;
  const limit = Number(readArg("--limit") ?? "0");

  if (!fs.existsSync(sourceDir)) {
    console.log(`Source directory not found: ${sourceDir}`);
    console.log("Create it and add problems.json or problems.csv, then rerun:");
    console.log("npm run import:aops-prealgebra-textbook");
    process.exit(1);
  }

  const rawProblems = loadRawProblems(sourceDir);
  const selectedProblems = limit > 0 ? rawProblems.slice(0, limit) : rawProblems;
  const conceptIds = new Set(readCsv<Record<string, string>>(CONCEPTS_PATH).map((row) => row.id));
  const stagingRows: StagingRow[] = [];
  const distractorRows: DistractorRow[] = [];
  const explanationRows: ExplanationRow[] = [];

  selectedProblems.forEach((raw, index) => {
    const mapped = mapProblem(raw, index, sourceDir, conceptIds);
    stagingRows.push(mapped.problem);
    distractorRows.push(...mapped.distractors);
    explanationRows.push(mapped.explanation);
  });

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  writeCsv(path.join(STAGING_DIR, "problem_staging.csv"), stagingRows);
  writeCsv(path.join(STAGING_DIR, "distractors.csv"), distractorRows);
  writeCsv(path.join(STAGING_DIR, "example_explanations.csv"), explanationRows);

  console.log(`Imported ${stagingRows.length} AoPS Prealgebra problem(s) into datasets/staging`);
  console.log(`Distractors: ${distractorRows.length}`);
  console.log(`Explanations: ${explanationRows.length}`);
}

function loadRawProblems(sourceDir: string): RawProblem[] {
  const jsonPath = path.join(sourceDir, "problems.json");
  const csvPath = path.join(sourceDir, "problems.csv");

  if (fs.existsSync(jsonPath)) {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (Array.isArray(parsed)) return parsed as RawProblem[];
    if (Array.isArray(parsed.problems)) return parsed.problems as RawProblem[];
    throw new Error(`${jsonPath} must contain an array or { problems: [] }`);
  }

  if (fs.existsSync(csvPath)) {
    return readCsv<RawProblem>(csvPath);
  }

  console.log(`No problems.json or problems.csv found in ${sourceDir}`);
  console.log("Add structured textbook data first. See datasets/textbooks/aops-prealgebra/README.md.");
  process.exit(1);
}

function mapProblem(raw: RawProblem, index: number, sourceDir: string, conceptIds: Set<string>) {
  const id = stringField(raw, ["id", "problem_id", "slug"]) || `aops_prealg_${String(index + 1).padStart(4, "0")}`;
  const statement = stringField(raw, ["statement", "problem", "question", "text"]);
  const answer = stringField(raw, ["answer", "final_answer", "correct_answer"]);
  const solution = stringField(raw, ["solution", "explanation", "answer_explanation"]);
  const sourceFile = stringField(raw, ["source_file", "source", "page"]) || path.relative(process.cwd(), sourceDir);
  const rawConcepts = listField(raw, ["concepts", "concept_ids", "tags"]);
  const concepts = normalizeConcepts(rawConcepts.length ? rawConcepts : inferConcepts(statement, solution), conceptIds);
  const primaryConcept = concepts[0] ?? "prealg_expressions";
  const choices = normalizeChoices(raw);
  const distractors = normalizeDistractors(raw, id, choices, answer);
  const answerType = choices.length > 0 ? "multiple_choice" : inferAnswerType(answer);
  const inferredTaxonomy = inferTaxonomy(primaryConcept, statement, solution, Number(raw.difficulty) || 3, choices.length > 0);
  const taxonomy = {
    difficulty: Number(raw.difficulty) || inferredTaxonomy.difficulty,
    layer: stringField(raw, ["taxonomy_layer", "taxonomyLayer"]) || inferredTaxonomy.layer,
    stage: stringField(raw, ["taxonomy_stage", "taxonomyStage"]) || inferredTaxonomy.stage,
    problemType: stringField(raw, ["problem_type", "problemType"]) || inferredTaxonomy.problemType,
    cognitiveTags: listField(raw, ["cognitive_tags", "cognitiveTags"]).length
      ? listField(raw, ["cognitive_tags", "cognitiveTags"])
      : inferredTaxonomy.cognitiveTags,
    estimatedTimeSeconds:
      Number(raw.estimated_time_seconds ?? raw.estimatedTimeSeconds) || inferredTaxonomy.estimatedTimeSeconds
  };
  const chapter = stringField(raw, ["chapter", "chapter_slug"]) || inferChapter(primaryConcept);
  const chapterTitle = stringField(raw, ["chapter_title", "chapterTitle"]) || inferChapterTitle(primaryConcept);

  return {
    problem: {
      id,
      statement,
      answer,
      answer_type: answerType,
      choices: formatChoices(choices),
      difficulty: String(Number(raw.difficulty) || taxonomy.difficulty),
      concepts: concepts.join(";"),
      skills: listField(raw, ["skills"]).join(";") || taxonomy.problemType,
      patterns: listField(raw, ["patterns"]).join(";") || taxonomy.cognitiveTags[0],
      misconceptions: listField(raw, ["misconceptions"]).join(";"),
      solution,
      course: "Pre-Algebra",
      theme: stringField(raw, ["theme"]) || inferTheme(primaryConcept),
      chapter,
      chapter_title: chapterTitle,
      sequence: String(Number(raw.sequence) || index + 1),
      source_collection: "aops_prealgebra_textbook",
      source_file: sourceFile,
      taxonomy_layer: taxonomy.layer,
      taxonomy_stage: taxonomy.stage,
      problem_type: taxonomy.problemType,
      cognitive_tags: taxonomy.cognitiveTags.join(";"),
      estimated_time_seconds: String(taxonomy.estimatedTimeSeconds),
      notes: stringField(raw, ["notes"]) || "Imported from datasets/textbooks/aops-prealgebra."
    },
    distractors,
    explanation: {
      problem_id: id,
      hint_1: stringField(raw, ["hint_1", "hint1"]),
      hint_2: stringField(raw, ["hint_2", "hint2"]),
      step_by_step: stringField(raw, ["step_by_step", "steps"]) || solution,
      common_mistake: stringField(raw, ["common_mistake"]),
      why_correct: stringField(raw, ["why_correct"]) || solution,
      variant_idea: stringField(raw, ["variant_idea"])
    }
  };
}

function normalizeConcepts(values: string[], conceptIds: Set<string>) {
  const concepts = values
    .flatMap((value) => value.split(/[;,|]/))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => conceptIds.has(value) ? value : CONCEPT_ALIASES.find((alias) => alias.match.test(value))?.concept ?? value)
    .filter((value) => conceptIds.has(value));

  return unique(concepts.length ? concepts : ["prealg_expressions"]);
}

function inferConcepts(...texts: string[]) {
  const joined = texts.join(" ");
  return unique(CONCEPT_ALIASES.filter((alias) => alias.match.test(joined)).map((alias) => alias.concept));
}

function normalizeChoices(raw: RawProblem) {
  const rawChoices = raw.choices ?? raw.options ?? raw.answer_choices;
  if (!rawChoices) return [];

  if (Array.isArray(rawChoices)) {
    return rawChoices.map((choice, index) => normalizeChoice(choice, index));
  }

  return String(rawChoices)
    .split(/[|;]/)
    .map((choice, index) => normalizeChoice(choice, index))
    .filter((choice) => choice.value);
}

function normalizeChoice(choice: unknown, index: number) {
  if (typeof choice === "object" && choice !== null) {
    const item = choice as Record<string, unknown>;
    return {
      label: String(item.label ?? String.fromCharCode(65 + index)).toUpperCase(),
      value: String(item.value ?? item.text ?? "").trim()
    };
  }

  const text = String(choice);
  const match = text.match(/^([A-E])\s*[:.)-]\s*(.+)$/i);
  return {
    label: match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index),
    value: (match?.[2] ?? text).trim()
  };
}

function normalizeDistractors(raw: RawProblem, problemId: string, choices: Array<{ label: string; value: string }>, answer: string): DistractorRow[] {
  const rawDistractors = raw.distractors;
  if (Array.isArray(rawDistractors)) {
    return rawDistractors.map((item, index) => {
      const distractor = item as Record<string, unknown>;
      const label = String(distractor.choiceLabel ?? distractor.choice_label ?? distractor.label ?? "").toUpperCase();
      const choice = choices.find((candidate) => candidate.label === label);

      return {
        problem_id: problemId,
        choice_label: label,
        value: String(distractor.value ?? choice?.value ?? ""),
        misconception: String(distractor.misconception ?? "distractor_pattern"),
        cognitive_tag: String(distractor.cognitiveTag ?? distractor.cognitive_tag ?? "general_reasoning"),
        explanation: String(distractor.explanation ?? "")
      };
    });
  }

  return choices
    .filter((choice) => normalize(choice.value) !== normalize(answer))
    .map((choice) => ({
      problem_id: problemId,
      choice_label: choice.label,
      value: choice.value,
      misconception: inferDistractorMisconception(choice.value, answer),
      cognitive_tag: "general_reasoning",
      explanation: "Auto-created distractor placeholder; review before promotion."
    }));
}

function inferTaxonomy(primaryConcept: string, statement: string, solution: string, difficulty: number, multipleChoice: boolean) {
  const problemType = inferProblemType(primaryConcept);
  const cognitiveTags = inferCognitiveTags(primaryConcept, statement, solution, problemType);

  return {
    difficulty,
    layer: difficulty <= 2 ? "Foundation" : difficulty <= 4 ? "Standard" : "Honors",
    stage: primaryConcept.startsWith("arith_")
      ? "Foundation"
      : primaryConcept.startsWith("alg_")
        ? "Algebra Readiness"
        : primaryConcept.startsWith("prealg_")
          ? "Bridge"
          : "AMC8 Transfer",
    problemType,
    cognitiveTags,
    estimatedTimeSeconds: (multipleChoice ? 75 : 90) + Math.max(0, difficulty - 2) * 15
  };
}

function inferProblemType(concept: string) {
  if (concept.includes("fraction") || concept.includes("decimal") || concept.includes("integer")) return "computation";
  if (concept.includes("ratio") || concept.includes("percent") || concept.includes("proportion")) return "proportional_reasoning";
  if (concept.includes("substitution")) return "substitution";
  if (concept.includes("expression") || concept.includes("simplification")) return "expression_simplification";
  if (concept.includes("equation")) return "equation_solving";
  if (concept.startsWith("geo_")) return "geometric_measurement";
  if (concept.startsWith("nt_")) return "number_structure";
  if (concept.startsWith("counting_")) return "counting_modeling";
  if (concept.startsWith("stats_")) return "data_reasoning";
  return "mixed_reasoning";
}

function inferCognitiveTags(primaryConcept: string, statement: string, solution: string, problemType: string) {
  const text = `${statement} ${solution}`;
  const tags = new Set<string>();

  if (primaryConcept.includes("fraction")) tags.add("fraction_fluency");
  if (primaryConcept.includes("integer") || /negative|minus|-/i.test(text)) tags.add("sign_error_risk");
  if (problemType === "equation_solving") tags.add("inverse_operations");
  if (problemType === "proportional_reasoning") tags.add("multiplicative_reasoning");
  if (problemType === "expression_simplification") tags.add("symbolic_fluency");
  if (problemType === "substitution") tags.add("variable_meaning");
  if (problemType === "geometric_measurement") tags.add("formula_selection");
  if (problemType === "number_structure") tags.add("factor_structure");
  if (tags.size === 0) tags.add("general_reasoning");

  return [...tags].slice(0, 4);
}

function inferTheme(concept: string) {
  if (concept.startsWith("arith_")) return "Arithmetic and Proportional Reasoning";
  if (concept.startsWith("prealg_")) return "Expressions and Equations";
  if (concept.startsWith("alg_")) return "Linear Equations";
  if (concept.startsWith("geo_")) return "Geometry";
  if (concept.startsWith("nt_")) return "Number Theory";
  if (concept.startsWith("counting_")) return "Counting and Probability";
  if (concept.startsWith("stats_")) return "Statistics";
  return "Pre-Algebra Mixed Practice";
}

function inferChapter(concept: string) {
  if (concept.startsWith("arith_")) return "aops-prealg-arithmetic";
  if (concept.startsWith("prealg_")) return "aops-prealg-expressions";
  if (concept.startsWith("alg_")) return "aops-prealg-equations";
  return "aops-prealg-mixed";
}

function inferChapterTitle(concept: string) {
  if (concept.startsWith("arith_")) return "AoPS Prealgebra Arithmetic";
  if (concept.startsWith("prealg_")) return "AoPS Prealgebra Expressions";
  if (concept.startsWith("alg_")) return "AoPS Prealgebra Equations";
  return "AoPS Prealgebra Mixed Practice";
}

function inferAnswerType(answer: string) {
  if (!answer) return "manual";
  if (/^-?\d+(?:\.\d+)?$/.test(answer)) return "numeric";
  if (/^-?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/.test(answer)) return "fraction";
  if (/[a-zπ^*]/i.test(answer)) return "symbolic";
  return "text";
}

function inferDistractorMisconception(value: string, answer: string) {
  if (/^-/.test(value) !== /^-/.test(answer)) return "sign_error";
  return "distractor_pattern";
}

function stringField(raw: RawProblem, keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function listField(raw: RawProblem, keys: string[]) {
  const value = keys.map((key) => raw[key]).find((item) => item !== undefined && item !== null);
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function formatChoices(choices: Array<{ label: string; value: string }>) {
  return choices.map((choice) => `${choice.label}:${choice.value}`).join("|");
}

function writeCsv<T extends Record<string, string>>(filePath: string, rows: T[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  fs.writeFileSync(filePath, [headers.join(","), ...body].join("\n") + "\n");
}

function readCsv<T extends Record<string, unknown>>(filePath: string): T[] {
  const [headerLine, ...rows] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
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

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
