import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

type Layer = "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
type AnswerType = "multiple_choice" | "manual";

type Topic = {
  theme: string;
  chapter: string;
  chapterTitle: string;
  sequenceBase: number;
  concepts: string[];
  problemType: string;
  cognitiveTags: string[];
};

type ParsedProblem = {
  id: string;
  year: number;
  number: number;
  statement: string;
  assets?: ProblemAsset[];
  answer: string;
  answerType: AnswerType;
  choices: Record<"A" | "B" | "C" | "D" | "E", string>;
  topic: Topic;
  difficulty: number;
  layer: Layer;
  solution: string;
  sourceFile: string;
  notes: string;
};

type ProblemAsset = {
  type: "image";
  url: string;
  alt: string;
  role: "prompt" | "choice" | "solution";
};

type VerifiedProblem = {
  id: string;
  year: number;
  number: number;
  statement: string;
  assets?: ProblemAsset[];
  choices: Record<"A" | "B" | "C" | "D" | "E", string>;
  answerLabel: "A" | "B" | "C" | "D" | "E";
  answer: string;
  solution: string;
  sourceUrl: string;
};

type StagingProblem = {
  id: string;
  statement: string;
  answer: string;
  answer_type: AnswerType;
  choices: string;
  difficulty: string;
  concepts: string;
  skills: string;
  patterns: string;
  misconceptions: string;
  solution: string;
  course: "AMC8";
  theme: string;
  chapter: string;
  chapter_title: string;
  sequence: string;
  source_collection: string;
  source_file: string;
  taxonomy_layer: Layer;
  taxonomy_stage: Stage;
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

const SOURCE_COLLECTION = "amc8_past_papers_bulk";
const LOCAL_SOURCE_DIR = "/Users/fenmdc/Documents/IMO-中小学奥数/AMC/AMC8真题";
const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/amc8-past-papers");
const SOURCE_PDF_DIR = path.join(DATASET_DIR, "source-pdfs");
const EXTRACTED_TEXT_DIR = path.join(DATASET_DIR, "extracted-text");
const REVIEW_DIR = path.join(DATASET_DIR, "review");
const VERIFIED_PATH = path.join(DATASET_DIR, "verification/verified-problems.json");
const APP_PUBLIC_ASSET_DIR = path.join(process.cwd(), "apps/web/public/problem-assets/amc8");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const PYTHON = "/Users/fenmdc/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const YEARS = Array.from({ length: 36 }, (_, index) => 1985 + index);
const MANUAL_REVIEW_ANSWER = "manual_review";
const EXISTING_CURATED_YEARS = new Set([2013]);
const CHOICE_LABELS = ["A", "B", "C", "D", "E"] as const;

const TOPICS: Record<string, Topic> = {
  numberSystems: {
    theme: "Number Systems and Operations",
    chapter: "amc8-topic-number-systems",
    chapterTitle: "AMC8 Topic: Number Systems and Operations",
    sequenceBase: 9100,
    concepts: ["arith_natural_numbers", "arith_fractions"],
    problemType: "computation",
    cognitiveTags: ["fluency_precision", "operation_selection"]
  },
  numberTheory: {
    theme: "Number Theory and Integer Structure",
    chapter: "amc8-topic-number-theory",
    chapterTitle: "AMC8 Topic: Number Theory and Integer Structure",
    sequenceBase: 9200,
    concepts: ["nt_divisibility", "nt_factorization"],
    problemType: "number_structure",
    cognitiveTags: ["divisibility", "factor_structure"]
  },
  proportional: {
    theme: "Arithmetic and Proportional Reasoning",
    chapter: "amc8-topic-arithmetic-proportional",
    chapterTitle: "AMC8 Topic: Arithmetic and Proportional Reasoning",
    sequenceBase: 9300,
    concepts: ["arith_ratios", "arith_percentages"],
    problemType: "proportional_reasoning",
    cognitiveTags: ["unit_rate_modeling", "part_whole_reasoning"]
  },
  expressions: {
    theme: "Expressions and Equations",
    chapter: "amc8-topic-expressions-equations",
    chapterTitle: "AMC8 Topic: Expressions and Equations",
    sequenceBase: 9400,
    concepts: ["prealg_expressions", "prealg_word_to_equation"],
    problemType: "equation_solving",
    cognitiveTags: ["equation_from_context", "inverse_operations"]
  },
  counting: {
    theme: "Data, Counting, and Probability",
    chapter: "amc8-topic-counting-probability",
    chapterTitle: "AMC8 Topic: Data, Counting, and Probability",
    sequenceBase: 9500,
    concepts: ["counting_principle", "counting_probability"],
    problemType: "case_enumeration",
    cognitiveTags: ["case_enumeration", "sample_space_modeling"]
  },
  data: {
    theme: "Data, Counting, and Probability",
    chapter: "amc8-topic-counting-probability",
    chapterTitle: "AMC8 Topic: Data, Counting, and Probability",
    sequenceBase: 9500,
    concepts: ["stats_mean", "stats_median"],
    problemType: "data_reasoning",
    cognitiveTags: ["mean_vs_median", "data_interpretation"]
  },
  geometry: {
    theme: "Geometry and Measurement",
    chapter: "amc8-topic-geometry-measurement",
    chapterTitle: "AMC8 Topic: Geometry and Measurement",
    sequenceBase: 9600,
    concepts: ["geo_area", "geo_triangles"],
    problemType: "geometric_measurement",
    cognitiveTags: ["diagram_reasoning", "formula_selection"]
  }
};

function main() {
  [SOURCE_PDF_DIR, EXTRACTED_TEXT_DIR, REVIEW_DIR, STAGING_DIR, APP_PUBLIC_ASSET_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  const parsed: ParsedProblem[] = [];
  const diagnostics: string[] = [];
  const verifiedProblems = readVerifiedProblems();

  YEARS.forEach((year) => {
    const pdfPath = copySourcePdf(year);
    const textPath = path.join(EXTRACTED_TEXT_DIR, `${year}AMC8.bulk.txt`);
    const text = extractText(pdfPath, textPath);
    const answers = extractAnswerKey(text, year);
    const sections = splitProblems(text);
    const orderedChoices = extractOrderedChoices(stripBoilerplate(text));
    const usableSections = sections.filter((section) => section.number >= 1 && section.number <= 25);

    if (EXISTING_CURATED_YEARS.has(year)) {
      diagnostics.push(`${year}: source copied and text extracted; skipped generated rows because curated rows already exist.`);
      return;
    }

    let generated = 0;
    let autoGradable = 0;
    const generatedIds = new Set<string>();

    usableSections.forEach((section) => {
      const id = `amc8_${year}_p${String(section.number).padStart(2, "0")}`;
      const verified = verifiedProblems.get(id);
      const choices = verified?.choices ?? extractChoices(section.body) ?? orderedChoices.get(section.number) ?? null;
      const hasChoices = choices !== null;
      const answerLabel = verified?.answerLabel ?? answers.get(section.number);
      const answer = verified?.answer ?? (hasChoices && answerLabel ? choices[answerLabel] : MANUAL_REVIEW_ANSWER);
      const answerType: AnswerType = hasChoices && answerLabel ? "multiple_choice" : "manual";
      const statement = cleanStatement(verified?.statement ?? (hasChoices ? removeChoiceText(section.body) : section.body));
      if (!statement || statement.length < 12) return;

      const topic = inferTopic(statement);
      const difficulty = inferDifficulty(section.number);
      const problem: ParsedProblem = {
        id,
        year,
        number: section.number,
        statement,
        assets: localizeAssets(verified?.assets ?? [], id),
        answer,
        answerType,
        choices: choices ?? { A: "A", B: "B", C: "C", D: "D", E: "E" },
        topic,
        difficulty,
        layer: inferLayer(section.number),
        solution: verified?.solution ?? buildSolution(answerType, answerLabel, topic),
        sourceFile: `datasets/textbooks/amc8-past-papers/source-pdfs/${year}AMC8.pdf`,
        notes: [
          `Original paper position: ${year} AMC8 Problem ${section.number}.`,
          verified ? `Verified from Random Math: ${verified.sourceUrl}.` : "",
          answerType === "manual" ? "Manual review required: answer key or complete answer choices were not reliably extracted." : "Auto-gradable from extracted answer key."
        ].filter(Boolean).join(" ")
      };

      parsed.push(problem);
      generatedIds.add(problem.id);
      generated += 1;
      if (problem.answerType === "multiple_choice") autoGradable += 1;
    });

    const verifiedOnly = [...verifiedProblems.values()]
      .filter((problem) => problem.year === year && !generatedIds.has(problem.id))
      .sort((left, right) => left.number - right.number);

    verifiedOnly.forEach((verified) => {
      const problem = fromVerifiedProblem(verified);
      parsed.push(problem);
      generatedIds.add(problem.id);
      generated += 1;
      autoGradable += 1;
    });

    diagnostics.push(`${year}: extracted sections ${usableSections.length}; generated ${generated}; auto-gradable ${autoGradable}; answer-key entries ${answers.size}; verified-only appended ${verifiedOnly.length}.`);
  });

  const promotionProblems = parsed.filter((problem) => problem.answerType === "multiple_choice");
  const stagingProblems = promotionProblems.map(toStagingProblem);
  const distractors = promotionProblems.flatMap(toDistractors);
  const explanations = promotionProblems.map(toExplanation);

  writeCsv(path.join(STAGING_DIR, "problem_staging.csv"), stagingProblems);
  writeCsv(path.join(STAGING_DIR, "distractors.csv"), distractors);
  writeCsv(path.join(STAGING_DIR, "example_explanations.csv"), explanations);
  fs.writeFileSync(path.join(DATASET_DIR, "bulk-problems.json"), `${JSON.stringify(parsed, null, 2)}\n`);
  fs.writeFileSync(path.join(REVIEW_DIR, "bulk-import-report.md"), buildReport(parsed, diagnostics));

  console.log(`Generated ${parsed.length} bulk AMC8 past-paper problem(s).`);
  console.log(`Auto-gradable: ${parsed.filter((problem) => problem.answerType === "multiple_choice").length}`);
  console.log(`Manual review: ${parsed.filter((problem) => problem.answerType === "manual").length}`);
  console.log(`Promotion-ready auto-gradable rows: ${promotionProblems.length}`);
  console.log(`Generated ${distractors.length} distractor row(s).`);
  console.log(`Generated ${explanations.length} explanation template(s).`);
}

function readVerifiedProblems() {
  if (!fs.existsSync(VERIFIED_PATH)) return new Map<string, VerifiedProblem>();

  const rows = JSON.parse(fs.readFileSync(VERIFIED_PATH, "utf8")) as VerifiedProblem[];
  return new Map(rows.map((problem) => [problem.id, problem]));
}

function fromVerifiedProblem(verified: VerifiedProblem): ParsedProblem {
  const topic = inferTopic(verified.statement);

  return {
    id: verified.id,
    year: verified.year,
    number: verified.number,
    statement: cleanStatement(verified.statement),
    answer: verified.answer,
    answerType: "multiple_choice",
    assets: localizeAssets(verified.assets ?? [], verified.id),
    choices: verified.choices,
    topic,
    difficulty: inferDifficulty(verified.number),
    layer: inferLayer(verified.number),
    solution: verified.solution,
    sourceFile: `datasets/textbooks/amc8-past-papers/source-pdfs/${verified.year}AMC8.pdf`,
    notes: [
      `Original paper position: ${verified.year} AMC8 Problem ${verified.number}.`,
      `Verified from Random Math: ${verified.sourceUrl}.`,
      "Auto-gradable from verified answer and choices."
    ].join(" ")
  };
}

function localizeAssets(assets: ProblemAsset[], problemId: string) {
  return assets.map((asset, index) => {
    const extension = path.extname(new URL(asset.url).pathname).split("?")[0] || ".jpg";
    const localName = `${problemId}_${asset.role}_${index + 1}${extension}`;
    const localPath = path.join(APP_PUBLIC_ASSET_DIR, localName);

    return fs.existsSync(localPath)
      ? {
          ...asset,
          url: `/problem-assets/amc8/${localName}`
        }
      : asset;
  });
}

function copySourcePdf(year: number) {
  const sourcePath = path.join(LOCAL_SOURCE_DIR, `${year}AMC8.pdf`);
  const targetPath = path.join(SOURCE_PDF_DIR, `${year}AMC8.pdf`);

  if (!fs.existsSync(sourcePath)) throw new Error(`Missing source PDF: ${sourcePath}`);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function extractText(pdfPath: string, textPath: string) {
  const script = [
    "from pypdf import PdfReader",
    "from pathlib import Path",
    "import sys",
    "reader = PdfReader(sys.argv[1])",
    "text = '\\n'.join(page.extract_text() or '' for page in reader.pages)",
    "Path(sys.argv[2]).write_text(text, encoding='utf-8')",
    "print(len(text))"
  ].join("\n");

  execFileSync(PYTHON, ["-c", script, pdfPath, textPath], { stdio: "pipe" });
  return fs.readFileSync(textPath, "utf8");
}

function splitProblems(text: string) {
  const normalized = stripBoilerplate(text);
  const problemStyle = normalized.match(/Problem\s+1\b/);
  const regex = problemStyle ? /(?:^|\n)\s*Problem\s+(\d{1,2})\b/g : /(?:^|\n)\s*(\d{1,2})\s+/g;
  const matches = [...normalized.matchAll(regex)]
    .map((match) => ({ number: Number(match[1]), index: match.index ?? 0, length: match[0].length }))
    .filter((match) => match.number >= 1 && match.number <= 25);
  const orderedMatches = problemStyle ? matches : selectMonotonicProblemMatches(matches);
  const sections: Array<{ number: number; body: string }> = [];

  orderedMatches.forEach((match, index) => {
    const next = orderedMatches[index + 1];
    const start = match.index + match.length;
    const end = next?.index ?? answerKeyStart(normalized);
    const body = normalized.slice(start, end).trim();

    if (!sections.some((section) => section.number === match.number)) {
      sections.push({ number: match.number, body });
    }
  });

  return sections.sort((left, right) => left.number - right.number);
}

function selectMonotonicProblemMatches(matches: Array<{ number: number; index: number; length: number }>) {
  const selected: Array<{ number: number; index: number; length: number }> = [];
  let expected = 1;

  for (const match of matches) {
    if (match.number !== expected) continue;
    selected.push(match);
    expected += 1;
    if (expected > 25) break;
  }

  return selected.length >= 20 ? selected : matches;
}

function findChoiceRuns(text: string) {
  const labels = [...text.matchAll(/\(([A-E])\)/g)].map((match) => ({
    label: match[1] as "A" | "B" | "C" | "D" | "E",
    index: match.index ?? 0,
    length: match[0].length
  }));
  const runs: Array<{ start: number; end: number }> = [];

  for (let index = 0; index <= labels.length - 5; index += 1) {
    const run = labels.slice(index, index + 5);
    if (!run.every((match, runIndex) => match.label === CHOICE_LABELS[runIndex])) continue;

    const nextRunStart = labels[index + 5]?.index ?? text.length;
    runs.push({ start: run[0].index, end: nextRunStart });
    index += 4;
  }

  return runs;
}

function extractOrderedChoices(text: string) {
  const runs = findChoiceRuns(text);
  const choices = new Map<number, ParsedProblem["choices"]>();

  runs.slice(0, 25).forEach((run, index) => {
    const runText = text.slice(run.start, run.end);
    const parsed = extractChoices(runText);
    if (parsed) choices.set(index + 1, parsed);
  });

  return choices;
}

function stripBoilerplate(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/www\.artofproblemsolving\.com\/community\/\S+/g, " ")
    .replace(/This file was downloaded from the AoPS Math Olympiad Resources Page Page \d+/gi, " ")
    .replace(/Contributors?:.*$/gim, " ")
    .replace(/Tel:.*$/gim, " ")
    .replace(/Email:.*$/gim, " ")
    .replace(/Page\s+\d+/g, " ")
    .replace(/USA\s*\n\s*AMC\s*8\s*\n\s*\d{4}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function answerKeyStart(text: string) {
  const candidates = [
    text.search(/Answer Key/i),
    text.search(/\n\s*Answers\s*\n/i),
    text.search(/\n\s*\d{4}\s+AMC\s+8\s+Answers/i)
  ].filter((index) => index >= 0);

  return candidates.length > 0 ? Math.min(...candidates) : text.length;
}

function extractAnswerKey(text: string, year: number) {
  const keyStart = answerKeyStartForYear(text, year);
  const answerText = keyStart < text.length ? text.slice(keyStart) : "";
  const answers = new Map<number, "A" | "B" | "C" | "D" | "E">();
  const regex = /(?:^|\s)(\d{1,2})\s*[\.\)]\s*([A-E])(?:\s|$)/g;

  for (const match of answerText.matchAll(regex)) {
    const number = Number(match[1]);
    const label = match[2] as "A" | "B" | "C" | "D" | "E";
    if (number >= 1 && number <= 25) answers.set(number, label);
  }

  return answers;
}

function answerKeyStartForYear(text: string, year: number) {
  const yearSpecific = text.search(new RegExp(`\\n\\s*${year}\\s+AMC\\s+8\\s+Answers`, "i"));
  if (yearSpecific >= 0) return yearSpecific;

  const answerKey = text.search(/Answer Key/i);
  if (answerKey >= 0) return answerKey;

  const genericAnswers = [...text.matchAll(/\n\s*Answers\s*\n/gi)]
    .map((match) => match.index ?? -1)
    .filter((index) => index > text.length * 0.6);

  return genericAnswers.length > 0 ? Math.min(...genericAnswers) : text.length;
}

function extractChoices(body: string): ParsedProblem["choices"] | null {
  const labels = [...body.matchAll(/\(([A-E])\)/g)].map((match) => ({
    label: match[1] as "A" | "B" | "C" | "D" | "E",
    index: match.index ?? 0,
    length: match[0].length
  }));

  const firstCompleteRun = findCompleteChoiceRun(labels);
  if (!firstCompleteRun) return null;

  const choices = {} as ParsedProblem["choices"];
  firstCompleteRun.forEach((match, index) => {
    const next = firstCompleteRun[index + 1];
    const valueStart = match.index + match.length;
    const valueEnd = next?.index ?? body.length;
    choices[match.label] = cleanChoice(body.slice(valueStart, valueEnd));
  });

  return CHOICE_LABELS.every((label) => choices[label]) ? choices : null;
}

function findCompleteChoiceRun(labels: Array<{ label: "A" | "B" | "C" | "D" | "E"; index: number; length: number }>) {
  for (let index = 0; index <= labels.length - 5; index += 1) {
    const run = labels.slice(index, index + 5);
    if (run.every((match, runIndex) => match.label === CHOICE_LABELS[runIndex])) return run;
  }

  return null;
}

function removeChoiceText(body: string) {
  const choiceIndex = body.search(/\(A\)/);
  return choiceIndex >= 0 ? body.slice(0, choiceIndex) : body;
}

function cleanStatement(value: string) {
  return cleanText(value)
    .replace(/\s+([,.;:?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanChoice(value: string) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function cleanText(value: string) {
  return value
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB00/g, "ff")
    .replace(/\u201d|\u201c/g, "\"")
    .replace(/\u2019|\u2018/g, "'")
    .replace(/\u2212/g, "-")
    .replace(/\u00D7/g, "x")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function inferTopic(statement: string): Topic {
  const text = statement.toLowerCase();

  if (hasAny(text, ["triangle", "square", "rectangle", "circle", "angle", "area", "perimeter", "cube", "coordinate", "diameter", "radius", "semicircle", "polygon", "shaded", "figure"])) return TOPICS.geometry;
  if (hasAny(text, ["probability", "how many ways", "arrange", "arrangement", "random", "choose", "different paths", "patterns", "password", "permutation", "combinations"])) return TOPICS.counting;
  if (hasAny(text, ["mean", "median", "mode", "average", "graph", "table", "survey", "percent of the students", "scores"])) return TOPICS.data;
  if (hasAny(text, ["percent", "ratio", "rate", "mph", "miles per hour", "fraction of", "discount", "tax", "price", "dollars", "cups", "recipe"])) return TOPICS.proportional;
  if (hasAny(text, ["divisible", "factor", "prime", "remainder", "multiple", "digit", "unit's digit", "ones digit", "integer", "whole numbers"])) return TOPICS.numberTheory;
  if (hasAny(text, ["solve", "equation", "expression", "value of x", "let", "function", "input", "output"])) return TOPICS.expressions;
  return TOPICS.numberSystems;
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function inferDifficulty(number: number) {
  if (number <= 5) return 2;
  if (number <= 12) return 3;
  if (number <= 20) return 4;
  return 5;
}

function inferLayer(number: number): Layer {
  if (number <= 10) return "Standard";
  if (number <= 20) return "Honors";
  if (number <= 23) return "AMC8";
  return "AMC8 Stretch";
}

function buildSolution(answerType: AnswerType, answerLabel: string | undefined, topic: Topic) {
  if (answerType === "multiple_choice" && answerLabel) {
    return `The extracted answer key gives choice ${answerLabel}. Use the ${topic.problemType.replace(/_/g, " ")} structure to verify the choice.`;
  }

  return "Manual review required before automatic answer checking; use the extracted choices and original PDF to confirm the answer.";
}

function toStagingProblem(problem: ParsedProblem): StagingProblem {
  const sequence = problem.topic.sequenceBase + (problem.year - 1900) * 100 + problem.number;

  return {
    id: problem.id,
    statement: problem.statement,
    answer: problem.answer,
    answer_type: problem.answerType,
    choices: Object.entries(problem.choices).map(([label, value]) => `${label}:${value}`).join("|"),
    difficulty: String(problem.difficulty),
    concepts: problem.topic.concepts.join(";"),
    skills: inferSkills(problem.topic).join(";"),
    patterns: problem.topic.cognitiveTags.join(";"),
    misconceptions: inferMisconceptions(problem.topic).join(";"),
    solution: problem.solution,
    course: "AMC8",
    theme: problem.topic.theme,
    chapter: problem.topic.chapter,
    chapter_title: problem.topic.chapterTitle,
    sequence: String(sequence),
    source_collection: SOURCE_COLLECTION,
    source_file: `${problem.sourceFile}; problem ${problem.number}`,
    taxonomy_layer: problem.layer,
    taxonomy_stage: "AMC8 Transfer",
    problem_type: problem.topic.problemType,
    cognitive_tags: problem.topic.cognitiveTags.join(";"),
    estimated_time_seconds: String(problem.difficulty <= 3 ? 90 : problem.difficulty === 4 ? 120 : 150),
    notes: [
      "Converted from local AMC8 historical past-paper PDF batch.",
      problem.assets?.length ? `ASSETS_JSON:${JSON.stringify(problem.assets)}` : "",
      problem.notes
    ].filter(Boolean).join(" ")
  };
}

function inferSkills(topic: Topic) {
  if (topic === TOPICS.geometry) return ["geometry_modeling"];
  if (topic === TOPICS.counting) return ["systematic_counting"];
  if (topic === TOPICS.data) return ["data_interpretation"];
  if (topic === TOPICS.proportional) return ["proportional_reasoning"];
  if (topic === TOPICS.numberTheory) return ["number_structure"];
  if (topic === TOPICS.expressions) return ["equation_solving"];
  return ["competition_problem_solving"];
}

function inferMisconceptions(topic: Topic) {
  if (topic === TOPICS.geometry) return ["formula_confusion", "diagram_misread", "unit_error", "radius_diameter_confusion"];
  if (topic === TOPICS.counting) return ["case_omission", "overcounting", "order_confusion", "structure_misread"];
  if (topic === TOPICS.data) return ["mean_median_confusion", "graph_misread", "wrong_total", "unit_error"];
  if (topic === TOPICS.proportional) return ["additive_ratio_error", "ratio_flip", "wrong_total", "scale_factor_error"];
  if (topic === TOPICS.numberTheory) return ["factor_misread", "divisibility_error", "place_value_error", "operation_error"];
  return ["operation_error", "structure_misread", "near_miss", "fluency_slip"];
}

function toDistractors(problem: ParsedProblem): DistractorRow[] {
  if (problem.answerType !== "multiple_choice") return [];

  const misconceptions = inferMisconceptions(problem.topic);
  return Object.entries(problem.choices)
    .filter(([, value]) => normalize(value) !== normalize(problem.answer))
    .map(([label, value], index) => ({
      problem_id: problem.id,
      choice_label: label,
      value,
      misconception: misconceptions[index % misconceptions.length] ?? "near_miss",
      cognitive_tag: problem.topic.cognitiveTags[index % problem.topic.cognitiveTags.length] ?? "operation_selection",
      explanation: `Choice ${label} is a plausible distractor for ${problem.topic.problemType.replace(/_/g, " ")}; compare it with the original AMC8 answer key.`
    }));
}

function toExplanation(problem: ParsedProblem): ExplanationRow {
  const conceptText = problem.topic.concepts.map((concept) => concept.replace(/_/g, " ")).join(", ");

  return {
    problem_id: problem.id,
    hint_1: `Identify the ${conceptText} structure before selecting an answer.`,
    hint_2: problem.answerType === "multiple_choice"
      ? "Use the answer choices to estimate, eliminate, and then verify."
      : "Check the original PDF or answer key before using this item for automatic scoring.",
    step_by_step: problem.solution,
    common_mistake: `A common mistake is ${inferMisconceptions(problem.topic)[0].replace(/_/g, " ")}.`,
    why_correct: problem.answerType === "multiple_choice"
      ? `The extracted key points to ${problem.answer}.`
      : "This historical item is present for coverage but still needs answer-key verification.",
    variant_idea: `Change one quantity and solve with the same ${problem.topic.problemType.replace(/_/g, " ")} model.`
  };
}

function writeCsv<T extends Record<string, string>>(filePath: string, rows: T[]) {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "");
    return;
  }

  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");

  fs.writeFileSync(filePath, `${content}\n`);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, "\"\"")}"`;
  return value;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/π/g, "pi").replace(/\s+/g, "").replace(/,/g, "").trim();
}

function buildReport(problems: ParsedProblem[], diagnostics: string[]) {
  const byYear = countBy(problems, (problem) => String(problem.year));
  const autoByYear = countBy(problems.filter((problem) => problem.answerType === "multiple_choice"), (problem) => String(problem.year));
  const manualByYear = countBy(problems.filter((problem) => problem.answerType === "manual"), (problem) => String(problem.year));
  const byChapter = countBy(problems, (problem) => problem.topic.chapterTitle);

  return `# AMC8 Historical Bulk Import Report

Source PDF coverage: 1985-2020 was found locally in \`${LOCAL_SOURCE_DIR}\`.

Curated years skipped by this bulk layer:

- ${[...EXISTING_CURATED_YEARS].join(", ")}

Generated rows: ${problems.length}

Auto-gradable rows: ${problems.filter((problem) => problem.answerType === "multiple_choice").length}

Manual-review rows: ${problems.filter((problem) => problem.answerType === "manual").length}

## By Year

${Object.keys(byYear).sort().map((year) => `- ${year}: ${byYear[year]} total, ${autoByYear[year] ?? 0} auto, ${manualByYear[year] ?? 0} manual`).join("\n")}

## By Topic Chapter

${Object.keys(byChapter).sort().map((chapter) => `- ${chapter}: ${byChapter[chapter]}`).join("\n")}

## Extraction Diagnostics

${diagnostics.map((line) => `- ${line}`).join("\n")}
`;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

main();
