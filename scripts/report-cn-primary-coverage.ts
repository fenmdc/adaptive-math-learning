import fs from "fs";
import path from "path";
import type { Problem } from "../packages/adaptive-engine";

type ExampleExplanation = {
  hint1?: string;
  hint2?: string;
  stepByStep?: string;
  commonMistake?: string;
  whyCorrect?: string;
  variantIdea?: string;
};

type CleanedBlock = {
  id: string;
  cleanedColumn: string;
  confidence: "high" | "medium" | "low";
  lessonNo: number | null;
  pageStart: number;
  questionCandidates: Array<{ localNo: string; prompt: string }>;
  reviewPriority: "normal" | "medium" | "high";
};

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const REPORTS_DIR = path.join(process.cwd(), "datasets/reports");
const REPORT_PATH = path.join(REPORTS_DIR, "cn-primary-coverage-v0.md");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const JIANZISHENG_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const CLEANED_DIR = path.join(JIANZISHENG_DIR, "review/cleaned");
const PILOT_DIR = path.join(JIANZISHENG_DIR, "pilot");
const GRADES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const items = problems.filter(isCnPrimary);
  const report = buildReport(items, explanations);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, report);

  console.log("CN primary coverage report");
  console.log(`- Problems: ${items.length}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

function buildReport(items: Problem[], explanations: Record<string, ExampleExplanation>) {
  const generatedAt = new Date().toISOString();
  const autoGradable = items.filter((item) => item.isAutoGradable).length;
  const multipleChoice = items.filter((item) => item.answerType === "multiple_choice").length;
  const explained = items.filter((item) => Boolean(explanations[item.id])).length;
  const latexAuthored = items.filter(hasLatex).length;
  const fullDistractors = items.filter(hasFullDistractorCoverage).length;
  const byGrade = countBy(items, getGrade);
  const byChapter = countBy(items, (item) => item.curriculum.chapterTitle);
  const bySource = countBy(items, (item) => item.curriculum.sourceCollection);
  const byProblemType = countBy(items, (item) => item.taxonomy?.problemType ?? "unknown");
  const byLayer = countBy(items, (item) => item.taxonomy?.layer ?? "unknown");
  const byStage = countBy(items, (item) => item.taxonomy?.stage ?? "unknown");
  const byConcept = countFlat(items, (item) => item.concepts ?? []);
  const byCognitiveTag = countFlat(items, (item) => item.taxonomy?.cognitiveTags ?? []);
  const sourceAvailability = buildSourceAvailability();
  const thinSignals = buildThinSignals({
    byChapter,
    byConcept,
    byProblemType,
    sourceAvailability
  });

  return [
    "# CN Primary Math Coverage Report v0",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Executive Summary",
    "",
    `- CN Primary Math problems: ${items.length}`,
    `- Auto-gradable: ${autoGradable}/${items.length}`,
    `- Multiple choice: ${multipleChoice}/${items.length}`,
    `- Explanation templates linked: ${explained}/${items.length}`,
    `- Full distractor coverage: ${fullDistractors}/${multipleChoice}`,
    `- LaTeX-authored items: ${latexAuthored}/${items.length}`,
    "",
    "The current elementary bank is quantity-stable for a pilot: each named grade band has roughly 82 items, and all items are auto-gradable with explanations. The main limitation is not count; it is taxonomy breadth. The bank is still concentrated in six reusable problem families: number patterns, two-step arithmetic word problems, remainders, rectangle area, fraction computation, and percent word problems.",
    "",
    "## Grade Coverage",
    "",
    toTable(["Grade", "Problems", "Status"], gradeRows(byGrade)),
    "",
    "## Chapter Coverage",
    "",
    toTable(["Chapter", "Problems"], entries(byChapter).map(([key, count]) => [key, String(count)])),
    "",
    "## Source Collections",
    "",
    toTable(["Source collection", "Problems"], entries(bySource).map(([key, count]) => [key, String(count)])),
    "",
    "## Taxonomy Coverage",
    "",
    "### Problem Types",
    "",
    toTable(["Problem type", "Problems"], entries(byProblemType).map(([key, count]) => [key, String(count)])),
    "",
    "### Layers",
    "",
    toTable(["Layer", "Problems"], entries(byLayer).map(([key, count]) => [key, String(count)])),
    "",
    "### Stages",
    "",
    toTable(["Stage", "Problems"], entries(byStage).map(([key, count]) => [key, String(count)])),
    "",
    "### Concepts",
    "",
    toTable(["Concept", "Problems"], entries(byConcept).map(([key, count]) => [key, String(count)])),
    "",
    "### Cognitive Tags",
    "",
    toTable(["Cognitive tag", "Problems"], entries(byCognitiveTag).map(([key, count]) => [key, String(count)])),
    "",
    "## Source Block Availability",
    "",
    sourceAvailability.length > 0
      ? toTable(
          ["Grade", "Usable cleaned blocks", "Used blocks", "Remaining blocks", "Signal"],
          sourceAvailability.map((item) => [
            item.grade,
            String(item.candidates),
            String(item.used),
            String(item.remaining),
            item.remaining <= 0 ? "exhausted" : item.remaining < 16 ? "low" : "available"
          ])
        )
      : "No cleaned source-block review files were found.",
    "",
    "## Coverage Gaps",
    "",
    ...thinSignals.map((signal) => `- ${signal}`),
    "",
    "## Recommended Next Moves",
    "",
    "1. Stop adding more same-template elementary batches until the next generator pass adds new problem families.",
    "2. Add elementary problem families for perimeter, angles, unit conversion, simple statistics, counting, and equation-style unknowns.",
    "3. Treat grade 6 source blocks as exhausted in the current cleaned-review pipeline; broaden OCR review criteria or move to junior-high parsing before further grade 6 expansion.",
    "4. Keep the current balanced six-grade elementary bank as a stable pilot set while preparing the junior-high import path.",
    ""
  ].join("\n");
}

function isCnPrimary(problem: Problem) {
  return problem.locale?.curriculumSystem === "CN" && problem.curriculum?.course === "CN Primary Math";
}

function getGrade(problem: Problem) {
  const title = problem.curriculum?.chapterTitle ?? "";
  const match = title.match(/([一二三四五六])年级/);
  if (match) return `${match[1]}年级`;

  const chapter = problem.curriculum?.chapter ?? "";
  const chapterMatch = chapter.match(/g([1-6])/);
  if (chapterMatch) return `${"一二三四五六"[Number(chapterMatch[1]) - 1]}年级`;

  return "未分级小学";
}

function hasLatex(problem: Problem) {
  const choiceText = (problem.choices ?? []).map(choiceValue).join(" ");
  return /\$/.test([problem.statement, problem.solution, problem.answer, choiceText].join(" "));
}

function hasFullDistractorCoverage(problem: Problem) {
  if (problem.answerType !== "multiple_choice") return true;
  const wrongChoices = (problem.choices ?? []).filter((choice) => normalize(choiceValue(choice)) !== normalize(problem.answer));
  return (problem.distractors ?? []).length >= wrongChoices.length;
}

function choiceValue(choice: NonNullable<Problem["choices"]>[number]) {
  return typeof choice === "string" ? choice : choice.text ?? choice.value;
}

function gradeRows(byGrade: Record<string, number>) {
  return [...GRADES, "未分级小学"].flatMap((grade) => {
    const count = byGrade[grade] ?? 0;
    if (count === 0 && grade === "未分级小学") return [];
    const status = count >= 80 ? "pilot-stable" : count >= 40 ? "usable" : "thin";
    return [[grade, String(count), status]];
  });
}

function buildSourceAvailability() {
  if (!fs.existsSync(CLEANED_DIR)) return [];

  const usedByGrade = readUsedSourceBlocksByGrade();

  return ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6"].map((grade, index) => {
    const filePath = path.join(CLEANED_DIR, `${grade}-cleaned-blocks.json`);
    if (!fs.existsSync(filePath)) {
      return {
        grade: GRADES[index],
        candidates: 0,
        used: usedByGrade.get(grade)?.size ?? 0,
        remaining: 0
      };
    }

    const blocks = readJson<CleanedBlock[]>(filePath);
    const candidates = blocks.filter(isUsableSourceBlock);
    const used = usedByGrade.get(grade)?.size ?? 0;

    return {
      grade: GRADES[index],
      candidates: candidates.length,
      used,
      remaining: Math.max(0, candidates.length - used)
    };
  });
}

function readUsedSourceBlocksByGrade() {
  const byGrade = new Map<string, Set<string>>();
  if (!fs.existsSync(PILOT_DIR)) return byGrade;

  const files = findFiles(PILOT_DIR, "pilot-source-blocks.json");
  files.forEach((filePath) => {
    const raw = readJson<Record<string, CleanedBlock[]> | CleanedBlock[]>(filePath);
    const entries = Array.isArray(raw)
      ? [["unknown", raw] as const]
      : Object.entries(raw);

    entries.forEach(([grade, blocks]) => {
      if (!byGrade.has(grade)) byGrade.set(grade, new Set());
      blocks.forEach((block) => byGrade.get(grade)?.add(block.id));
    });
  });

  return byGrade;
}

function isUsableSourceBlock(block: CleanedBlock) {
  return (
    ["thinking_training", "competition_boost", "worked_example"].includes(block.cleanedColumn) &&
    block.reviewPriority !== "high" &&
    block.lessonNo !== null &&
    block.questionCandidates.length > 0
  );
}

function buildThinSignals({
  byChapter,
  byConcept,
  byProblemType,
  sourceAvailability
}: {
  byChapter: Record<string, number>;
  byConcept: Record<string, number>;
  byProblemType: Record<string, number>;
  sourceAvailability: ReturnType<typeof buildSourceAvailability>;
}) {
  const signals: string[] = [];
  const missingProblemTypes = [
    "cn_perimeter_measurement",
    "cn_angle_geometry",
    "cn_unit_conversion",
    "cn_data_statistics",
    "cn_counting_combinatorics",
    "cn_equation_unknown"
  ].filter((type) => !byProblemType[type]);

  if (missingProblemTypes.length > 0) {
    signals.push(`Missing elementary problem families: ${missingProblemTypes.join(", ")}.`);
  }

  const missingConcepts = ["geo_perimeter", "geo_angles", "measurement_units", "data_statistics", "counting_principle", "prealg_equations"]
    .filter((concept) => !byConcept[concept]);
  if (missingConcepts.length > 0) {
    signals.push(`Missing or unrepresented concepts: ${missingConcepts.join(", ")}.`);
  }

  const thinChapters = entries(byChapter).filter(([, count]) => count < 40);
  if (thinChapters.length > 0) {
    signals.push(`Thin chapters below 40 items: ${thinChapters.map(([chapter, count]) => `${chapter} (${count})`).join(", ")}.`);
  }

  const exhausted = sourceAvailability.filter((item) => item.remaining <= 0);
  if (exhausted.length > 0) {
    signals.push(`Cleaned source-block pool exhausted for: ${exhausted.map((item) => item.grade).join(", ")}.`);
  }

  return signals.length > 0 ? signals : ["No blocking coverage gaps detected for the current pilot scope."];
}

function findFiles(root: string, fileName: string) {
  const output: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;

    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      fs.readdirSync(current).forEach((name) => stack.push(path.join(current, name)));
    } else if (path.basename(current) === fileName) {
      output.push(current);
    }
  }

  return output;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function countFlat<T>(items: T[], getKeys: (item: T) => string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    getKeys(item).forEach((key) => {
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, {});
}

function entries(value: Record<string, number>) {
  return Object.entries(value).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function toTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" |")} |`,
    `| ${headers.map(() => "---").join(" |")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

main();
