import fs from "fs";
import path from "path";
import {
  auditDiagnosticBlueprint,
  initialAssessmentBlueprint,
  selectDiagnosticProblems
} from "../apps/web/app/diagnostic/initialAssessment";
import type { ExampleExplanation } from "../apps/web/app/shared/explanationQuality";
import type { Problem } from "../packages/adaptive-engine";

type CleanedBlock = {
  id: string;
  cleanedColumn: string;
  confidence: "high" | "medium" | "low";
  lessonNo: number | null;
  questionCandidates: Array<{ localNo: string; prompt: string }>;
  reviewPriority: "normal" | "medium" | "high";
};

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const REPORTS_DIR = path.join(process.cwd(), "datasets/reports");
const REPORT_PATH = path.join(REPORTS_DIR, "cn-junior-coverage-v0.md");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const JIANZISHENG_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const CLEANED_DIR = path.join(JIANZISHENG_DIR, "review/cleaned");
const JUNIOR_DIR = path.join(JIANZISHENG_DIR, "junior");
const GRADES = ["七年级", "八年级", "九年级"];
const MIN_CHAPTER_BANK_FLOOR = 20;
const DIAGNOSTIC_CONCEPTS = [
  "arith_integers",
  "prealg_expressions",
  "prealg_simplification",
  "alg_linear_equations",
  "alg_linear_inequalities",
  "geo_triangle_angles",
  "alg_functions",
  "alg_graphing",
  "geo_coordinate_geometry",
  "geo_pythagorean",
  "geo_similarity",
  "alg_quadratics",
  "geo_circles",
  "geo_arc_length",
  "counting_probability",
  "stats_mean",
  "stats_range"
];

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const items = problems.filter(isCnJunior);
  const report = buildReport(items, problems, explanations);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, report);

  console.log("CN junior coverage report");
  console.log(`- Problems: ${items.length}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

function buildReport(
  items: Problem[],
  allProblems: Problem[],
  explanations: Record<string, ExampleExplanation>
) {
  const generatedAt = new Date().toISOString();
  const autoGradable = items.filter((item) => item.isAutoGradable).length;
  const multipleChoice = items.filter((item) => item.answerType === "multiple_choice").length;
  const explained = items.filter((item) => Boolean(explanations[item.id])).length;
  const fullDistractors = items.filter(hasFullDistractorCoverage).length;
  const latexAuthored = items.filter(hasLatex).length;
  const byGrade = countBy(items, getGrade);
  const chapterCoverage = buildChapterCoverage(items);
  const thinChapterKeys = chapterCoverage.filter((item) => item.count < MIN_CHAPTER_BANK_FLOOR);
  const byTheme = countBy(items, (item) => item.curriculum.theme);
  const bySource = countBy(items, (item) => item.curriculum.sourceCollection);
  const byProblemType = countBy(items, (item) => item.taxonomy?.problemType ?? "unknown");
  const byLayer = countBy(items, (item) => item.taxonomy?.layer ?? "unknown");
  const byStage = countBy(items, (item) => item.taxonomy?.stage ?? "unknown");
  const byConcept = countFlat(items, (item) => item.concepts ?? []);
  const byCognitiveTag = countFlat(items, (item) => item.taxonomy?.cognitiveTags ?? []);
  const sourceAvailability = buildSourceAvailability();
  const diagnosticItems = selectDiagnosticProblems(initialAssessmentBlueprint, allProblems);
  const diagnosticAudit = auditDiagnosticBlueprint(initialAssessmentBlueprint, allProblems, diagnosticItems);
  const cnDiagnosticItems = diagnosticItems.filter((item) => item.problem.locale?.curriculumSystem === "CN");
  const diagnosticConceptRows = DIAGNOSTIC_CONCEPTS.map((concept) => [
    concept,
    String(byConcept[concept] ?? 0),
    (byConcept[concept] ?? 0) >= 12 ? "stable" : (byConcept[concept] ?? 0) >= 6 ? "usable" : "thin"
  ]);
  const thinSignals = buildThinSignals({
    byGrade,
    byConcept,
    byProblemType,
    diagnosticAudit,
    sourceAvailability
  });

  return [
    "# CN Junior High Math Coverage Report v0",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Executive Summary",
    "",
    `- CN Junior High Math problems: ${items.length}`,
    `- Auto-gradable: ${autoGradable}/${items.length}`,
    `- Multiple choice: ${multipleChoice}/${items.length}`,
    `- Explanation templates linked: ${explained}/${items.length}`,
    `- Full distractor coverage: ${fullDistractors}/${multipleChoice}`,
    `- LaTeX-authored items: ${latexAuthored}/${items.length}`,
    `- Chapter keys covered: ${chapterCoverage.length}`,
    `- Chapter exercise-bank floor: ${thinChapterKeys.length === 0 ? `complete (min ${MIN_CHAPTER_BANK_FLOOR})` : `${thinChapterKeys.length} below ${MIN_CHAPTER_BANK_FLOOR}`}`,
    `- Diagnostic slots selected: ${diagnosticAudit.selectedCount}/${diagnosticAudit.slotCount}`,
    `- CN diagnostic slots selected: ${cnDiagnosticItems.length}`,
    "",
    "The junior-high bank is now ready for diagnostic sampling across Grade 7, Grade 8, and Grade 9. Grade 7 covers rational numbers, expressions, equations, inequalities, coordinate-plane basics, and foundational geometry. Grade 8 covers linear functions, coordinate geometry, similarity, congruence, angle chasing, and Pythagorean transfer. Grade 9 covers quadratic functions/equations, circles, similarity, probability, and statistics.",
    "",
    "## Grade Coverage",
    "",
    toTable(["Grade", "Problems", "Status"], gradeRows(byGrade)),
    "",
    "## Theme Coverage",
    "",
    toTable(["Theme", "Problems"], entries(byTheme).map(([key, count]) => [key, String(count)])),
    "",
    "## Chapter Coverage",
    "",
    toTable(
      ["Grade", "Chapter key", "Display title", "Problems", "Status"],
      chapterCoverage.map((item) => [
        item.grade,
        item.chapter,
        item.chapterTitle,
        String(item.count),
        item.count >= MIN_CHAPTER_BANK_FLOOR ? "complete" : "thin"
      ])
    ),
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
    "## Diagnostic Concept Readiness",
    "",
    toTable(["Concept", "CN junior problems", "Status"], diagnosticConceptRows),
    "",
    "## Diagnostic CN Slot Mapping",
    "",
    toTable(
      ["Slot", "Problem", "Chapter", "Source"],
      cnDiagnosticItems.map((item) => [
        item.slot.id,
        item.problem.id,
        item.problem.curriculum.chapterTitle,
        item.problem.curriculum.sourceCollection
      ])
    ),
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
    "1. Keep Grade 7-9 diagnostic slots representative; use them as placement probes rather than a full CN junior exam.",
    "2. Add a later CN diagnostic mode switch if the product needs a dedicated Chinese-track entrance assessment.",
    "3. Continue quality review on generated explanations where symbolic expressions look mechanically formatted.",
    "4. Prepare the next expansion decision: either Grade 7 proof-style geometry depth or Grade 9 quadratic/circle mixed applications.",
    ""
  ].join("\n");
}

function isCnJunior(problem: Problem) {
  return problem.locale?.curriculumSystem === "CN" && problem.curriculum?.course === "CN Junior High Math";
}

function getGrade(problem: Problem) {
  const title = problem.curriculum?.chapterTitle ?? "";
  const match = title.match(/([七八九])年级/);
  if (match) return `${match[1]}年级`;

  const gradeBand = problem.locale?.gradeBand ?? "";
  const gradeMatch = gradeBand.match(/Grade\s*([789])/i);
  if (gradeMatch) return `${"七八九"[Number(gradeMatch[1]) - 7]}年级`;

  return "未分级初中";
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
  return [...GRADES, "未分级初中"].flatMap((grade) => {
    const count = byGrade[grade] ?? 0;
    if (count === 0 && grade === "未分级初中") return [];
    const status = count >= 120 ? "diagnostic-stable" : count >= 60 ? "usable" : count >= 20 ? "pilot" : "thin";
    return [[grade, String(count), status]];
  });
}

function buildChapterCoverage(items: Problem[]) {
  const groups = new Map<
    string,
    {
      chapter: string;
      chapterTitleCounts: Map<string, number>;
      count: number;
      gradeCounts: Map<string, number>;
    }
  >();

  items.forEach((item) => {
    const key = `${item.curriculum.course}::${item.curriculum.chapter}`;
    const current =
      groups.get(key) ??
      {
        chapter: item.curriculum.chapter,
        chapterTitleCounts: new Map<string, number>(),
        count: 0,
        gradeCounts: new Map<string, number>()
      };
    const title = item.curriculum.chapterTitle || item.curriculum.chapter;
    const grade = getGrade(item);

    current.count += 1;
    current.chapterTitleCounts.set(title, (current.chapterTitleCounts.get(title) ?? 0) + 1);
    current.gradeCounts.set(grade, (current.gradeCounts.get(grade) ?? 0) + 1);
    groups.set(key, current);
  });

  return [...groups.values()]
    .map((item) => ({
      chapter: item.chapter,
      chapterTitle: dominantMapKey(item.chapterTitleCounts),
      count: item.count,
      grade: dominantMapKey(item.gradeCounts)
    }))
    .sort(
      (a, b) =>
        gradeSortValue(a.grade) - gradeSortValue(b.grade) ||
        a.count - b.count ||
        a.chapterTitle.localeCompare(b.chapterTitle, "zh-Hans-CN") ||
        a.chapter.localeCompare(b.chapter)
    );
}

function dominantMapKey(counts: Map<string, number>) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))[0]?.[0] ?? "unknown";
}

function gradeSortValue(grade: string) {
  const index = [...GRADES, "未分级初中"].indexOf(grade);
  return index >= 0 ? index : GRADES.length + 1;
}

function buildSourceAvailability() {
  if (!fs.existsSync(CLEANED_DIR)) return [];

  const usedByGrade = readUsedSourceBlocksByGrade();

  return [
    ["grade7", "七年级"],
    ["grade8", "八年级"],
    ["grade9", "九年级"]
  ].map(([gradeKey, grade]) => {
    const filePath = path.join(CLEANED_DIR, `${gradeKey}-cleaned-blocks.json`);
    if (!fs.existsSync(filePath)) {
      return {
        grade,
        candidates: 0,
        used: usedByGrade.get(gradeKey)?.size ?? 0,
        remaining: 0
      };
    }

    const blocks = readJson<CleanedBlock[]>(filePath);
    const candidates = blocks.filter(isUsableSourceBlock);
    const used = usedByGrade.get(gradeKey)?.size ?? 0;

    return {
      grade,
      candidates: candidates.length,
      used,
      remaining: Math.max(0, candidates.length - used)
    };
  });
}

function readUsedSourceBlocksByGrade() {
  const byGrade = new Map<string, Set<string>>();
  if (!fs.existsSync(JUNIOR_DIR)) return byGrade;

  const files = findFiles(JUNIOR_DIR, "pilot-source-blocks.json");
  files.forEach((filePath) => {
    const gradeKey = inferGradeKeyFromPath(filePath);
    if (!gradeKey) return;
    const blocks = readJson<CleanedBlock[]>(filePath);
    if (!byGrade.has(gradeKey)) byGrade.set(gradeKey, new Set());
    blocks.forEach((block) => byGrade.get(gradeKey)?.add(block.id));
  });

  return byGrade;
}

function inferGradeKeyFromPath(filePath: string) {
  const match = filePath.match(/junior\/(grade[789])-/);
  return match?.[1] ?? null;
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
  byGrade,
  byConcept,
  byProblemType,
  diagnosticAudit,
  sourceAvailability
}: {
  byGrade: Record<string, number>;
  byConcept: Record<string, number>;
  byProblemType: Record<string, number>;
  diagnosticAudit: ReturnType<typeof auditDiagnosticBlueprint>;
  sourceAvailability: ReturnType<typeof buildSourceAvailability>;
}) {
  const signals: string[] = [];
  const missingConcepts = DIAGNOSTIC_CONCEPTS.filter((concept) => !byConcept[concept]);
  const thinConcepts = DIAGNOSTIC_CONCEPTS.filter((concept) => (byConcept[concept] ?? 0) > 0 && (byConcept[concept] ?? 0) < 6);
  const missingProblemTypes = [
    "cn_linear_function_evaluation",
    "cn_coordinate_pythagorean_distance",
    "cn_similarity_scale_factor",
    "cn_quadratic_axis",
    "cn_circle_arc_length",
    "cn_probability_complement",
    "cn_statistics_missing_value"
  ].filter((type) => !byProblemType[type]);

  if ((byGrade["七年级"] ?? 0) < 120) {
    signals.push(`Grade 7 is still thin for a full junior-high track: ${byGrade["七年级"] ?? 0} item(s).`);
  }

  if (missingConcepts.length > 0) {
    signals.push(`Missing diagnostic-ready concepts: ${missingConcepts.join(", ")}.`);
  }

  if (thinConcepts.length > 0) {
    signals.push(`Thin diagnostic-ready concepts below 6 items: ${thinConcepts.map((concept) => `${concept} (${byConcept[concept]})`).join(", ")}.`);
  }

  if (missingProblemTypes.length > 0) {
    signals.push(`Missing junior problem families: ${missingProblemTypes.join(", ")}.`);
  }

  if (diagnosticAudit.missingFallbacks.length > 0) {
    signals.push(`Diagnostic slots missing selected items: ${diagnosticAudit.missingFallbacks.join(", ")}.`);
  }

  const lowSourcePools = sourceAvailability.filter((item) => item.remaining < 16);
  if (lowSourcePools.length > 0) {
    signals.push(`Low remaining cleaned source-block pool for: ${lowSourcePools.map((item) => `${item.grade} (${item.remaining})`).join(", ")}.`);
  }

  return signals.length > 0 ? signals : ["No blocking coverage gaps detected for the current junior-high pilot scope."];
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
  return Object.entries(value).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hans-CN"));
}

function toTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
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
