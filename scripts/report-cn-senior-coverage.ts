import fs from "fs";
import path from "path";
import type { Problem } from "../packages/adaptive-engine";
import type { ExampleExplanation } from "../apps/web/app/shared/explanationQuality";

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const REPORTS_DIR = path.join(process.cwd(), "datasets/reports");
const COVERAGE_REPORT_PATH = path.join(REPORTS_DIR, "cn-senior-coverage-v0.md");
const QUALITY_REPORT_PATH = path.join(REPORTS_DIR, "cn-senior-subjective-quality-v0.md");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const SUBJECTIVE_SOURCE = "subjective_samples_v0";
const GRADES = ["高一", "高二", "高三", "未分级高中"];

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const seniorProblems = problems.filter(isCnSenior);
  const seniorSubjective = seniorProblems.filter((problem) => problem.curriculum.sourceCollection === SUBJECTIVE_SOURCE);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(COVERAGE_REPORT_PATH, buildCoverageReport(seniorProblems, explanations));
  fs.writeFileSync(QUALITY_REPORT_PATH, buildSubjectiveQualityReport(seniorSubjective));

  console.log("CN senior coverage reports");
  console.log(`- Senior problems: ${seniorProblems.length}`);
  console.log(`- Senior subjective samples: ${seniorSubjective.length}`);
  console.log(`- Coverage report: ${path.relative(process.cwd(), COVERAGE_REPORT_PATH)}`);
  console.log(`- Quality report: ${path.relative(process.cwd(), QUALITY_REPORT_PATH)}`);
}

function buildCoverageReport(items: Problem[], explanations: Record<string, ExampleExplanation>) {
  const generatedAt = new Date().toISOString();
  const autoGradable = items.filter((item) => item.isAutoGradable).length;
  const manual = items.filter((item) => item.answerType === "manual").length;
  const multipleChoice = items.filter((item) => item.answerType === "multiple_choice").length;
  const explained = items.filter((item) => Boolean(explanations[item.id])).length;
  const byGrade = countBy(items, getGrade);
  const bySource = countBy(items, (item) => item.curriculum.sourceCollection);
  const byTheme = countBy(items, (item) => item.curriculum.theme);
  const byChapter = buildChapterRows(items);
  const byLayer = countBy(items, (item) => item.taxonomy?.layer ?? "Unlabeled");
  const byStage = countBy(items, (item) => item.taxonomy?.stage ?? "Unlabeled");
  const byMode = countBy(items, (item) => item.responseSchema?.mode ?? item.answerType);
  const byConcept = countFlat(items, (item) => item.concepts ?? []);
  const byCognitiveTag = countFlat(items, (item) => item.taxonomy?.cognitiveTags ?? []);
  const nextMoves = buildCoverageNextMoves(items, byChapter, byConcept);
  const subjectiveChapterRows = byChapter.filter((row) => row.manual > 0);
  const subjectiveMin = Math.min(...subjectiveChapterRows.map((row) => row.count));
  const subjectiveMax = Math.max(...subjectiveChapterRows.map((row) => row.count));

  return [
    "# CN Senior High Math Coverage Report v0",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Executive Summary",
    "",
    `- CN Senior High Math problems: ${items.length}`,
    `- Auto-gradable: ${autoGradable}/${items.length}`,
    `- Manual / subjective: ${manual}/${items.length}`,
    `- Multiple choice: ${multipleChoice}/${items.length}`,
    `- Explanation templates linked: ${explained}/${items.length}`,
    `- Chapter keys covered: ${byChapter.length}`,
    "",
    `The senior-high bank is now in pilot-stable shape. It includes earlier auto-gradable Chinese senior content plus a subjective chapter-test layer for functions, quadratics, trigonometry, sequences, analytic geometry, derivatives, and probability/statistics. Current subjective chapters range from ${subjectiveMin} to ${subjectiveMax} problems, so the priority is to preserve the diagnostic-to-mini-session loop while gradually raising chapter depth toward 16-20 problems.`,
    "",
    "## Grade Coverage",
    "",
    toTable(["Grade", "Problems", "Status"], gradeRows(byGrade)),
    "",
    "## Chapter Coverage",
    "",
    toTable(
      ["Grade", "Course", "Chapter", "Problems", "Manual", "Auto", "Status"],
      byChapter.map((row) => [
        row.grade,
        row.course,
        row.chapterTitle,
        String(row.count),
        String(row.manual),
        String(row.autoGradable),
        row.count >= 20 ? "usable" : row.count >= 8 ? "pilot" : "thin"
      ])
    ),
    "",
    "## Source Collections",
    "",
    toTable(["Source collection", "Problems"], entries(bySource).map(([key, value]) => [key, String(value)])),
    "",
    "## Theme Coverage",
    "",
    toTable(["Theme", "Problems"], entries(byTheme).map(([key, value]) => [key, String(value)])),
    "",
    "## Taxonomy Coverage",
    "",
    "### Layers",
    "",
    toTable(["Layer", "Problems"], entries(byLayer).map(([key, value]) => [key, String(value)])),
    "",
    "### Stages",
    "",
    toTable(["Stage", "Problems"], entries(byStage).map(([key, value]) => [key, String(value)])),
    "",
    "### Response Modes",
    "",
    toTable(["Mode / answer type", "Problems"], entries(byMode).map(([key, value]) => [key, String(value)])),
    "",
    "### Concepts",
    "",
    toTable(["Concept", "Problems"], entries(byConcept).map(([key, value]) => [key, String(value)])),
    "",
    "### Cognitive Tags",
    "",
    toTable(["Cognitive tag", "Problems"], entries(byCognitiveTag).map(([key, value]) => [key, String(value)])),
    "",
    "## Recommended Next Moves",
    "",
    ...nextMoves.map((move) => `- ${move}`),
    ""
  ].join("\n");
}

function buildSubjectiveQualityReport(items: Problem[]) {
  const generatedAt = new Date().toISOString();
  const chapterRows = buildSubjectiveChapterQualityRows(items);
  const balanced = chapterRows.filter((row) => row.status === "balanced").length;
  const byLayer = countBy(items, (item) => item.taxonomy?.layer ?? "Unlabeled");
  const byStage = countBy(items, (item) => item.taxonomy?.stage ?? "Unlabeled");
  const byDifficulty = countBy(items, (item) => String(item.difficulty));
  const byMode = countBy(items, (item) => item.responseSchema?.mode ?? item.answerType);
  const minChapterCount = Math.min(...chapterRows.map((row) => row.count));
  const maxChapterCount = Math.max(...chapterRows.map((row) => row.count));

  return [
    "# CN Senior Subjective Quality Layer Report v0",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Summary",
    "",
    `- Senior subjective problems: ${items.length}`,
    `- Subjective chapters: ${chapterRows.length}`,
    `- Balanced chapter profiles: ${balanced}/${chapterRows.length}`,
    "",
    `Each current senior subjective chapter has ${minChapterCount === maxChapterCount ? minChapterCount : `${minChapterCount}-${maxChapterCount}`} problems intended for the chapter-test loop. A balanced chapter has at least 2 Foundation, 3 Standard, and 3 Honors items, so Practice can sample a stable ladder before giving chapter feedback.`,
    "",
    "## Overall Distribution",
    "",
    "### Layers",
    "",
    toTable(["Layer", "Problems"], entries(byLayer).map(([key, value]) => [key, String(value)])),
    "",
    "### Stages",
    "",
    toTable(["Stage", "Problems"], entries(byStage).map(([key, value]) => [key, String(value)])),
    "",
    "### Difficulty",
    "",
    toTable(["Difficulty", "Problems"], entries(byDifficulty).map(([key, value]) => [key, String(value)])),
    "",
    "### Response Modes",
    "",
    toTable(["Mode", "Problems"], entries(byMode).map(([key, value]) => [key, String(value)])),
    "",
    "## Chapter Profiles",
    "",
    toTable(
      ["Grade", "Chapter", "Count", "Layers", "Stages", "Difficulty", "Modes", "Status"],
      chapterRows.map((row) => [
        row.grade,
        row.chapterTitle,
        String(row.count),
        formatCounts(row.layers),
        formatCounts(row.stages),
        formatCounts(row.difficulties),
        formatCounts(row.modes),
        row.status
      ])
    ),
    "",
    "## Next Decision",
    "",
    "Senior content is ready for the same steady expansion rhythm used in junior high: keep each chapter balanced, use Diagnostic follow-up mini sessions to validate repair, then raise priority chapters toward 16-20 problems.",
    ""
  ].join("\n");
}

function buildCoverageNextMoves(
  items: Problem[],
  chapterRows: ReturnType<typeof buildChapterRows>,
  byConcept: Record<string, number>
) {
  const moves: string[] = [];
  const thinChapters = chapterRows.filter((row) => row.count < 20);
  const pilotStableChapters = chapterRows.filter((row) => row.manual > 0 && row.count >= 12 && row.count < 20);
  const missingTrigonometry = !items.some((item) => /三角|trig/i.test(`${item.curriculum.theme} ${item.curriculum.chapterTitle}`));
  const thinCalculus = (byConcept.alg_functions ?? 0) < 40;
  const thinGeometry = (byConcept.geo_coordinate_geometry ?? 0) < 12;

  if (pilotStableChapters.length > 0) {
    moves.push(`Raise the ${pilotStableChapters.length} pilot-stable senior subjective chapter(s) from 12 toward 16-20 problems while keeping the layer mix balanced.`);
  } else if (thinChapters.length > 0) {
    moves.push(`Raise the ${thinChapters.length} thin senior chapter(s) toward the 20-problem coverage floor.`);
  }
  if (missingTrigonometry) {
    moves.push("Add a high-school trigonometry chapter next, because it is a major gap between functions/geometry and calculus readiness.");
  }
  if (thinCalculus) {
    moves.push("Deepen functions and derivative tasks before adding harder calculus-style comprehensive questions.");
  }
  if (thinGeometry) {
    moves.push("Expand analytic geometry with conic-section and line-circle mixed problems.");
  }

  return moves.length > 0 ? moves : ["Current senior pilot has no immediate structural gaps; expand by user priority."];
}

function buildChapterRows(items: Problem[]) {
  const groups = new Map<string, Problem[]>();

  items.forEach((item) => {
    groups.set(item.curriculum.chapter, [...(groups.get(item.curriculum.chapter) ?? []), item]);
  });

  return [...groups.values()]
    .map((chapterItems) => {
      const first = chapterItems[0];
      return {
        autoGradable: chapterItems.filter((item) => item.isAutoGradable).length,
        chapter: first.curriculum.chapter,
        chapterTitle: first.curriculum.chapterTitle,
        count: chapterItems.length,
        course: first.curriculum.course,
        grade: getGrade(first),
        manual: chapterItems.filter((item) => item.answerType === "manual").length,
        sequence: first.curriculum.sequence
      };
    })
    .sort((left, right) => left.sequence - right.sequence || left.chapterTitle.localeCompare(right.chapterTitle, "zh-Hans-CN"));
}

function buildSubjectiveChapterQualityRows(items: Problem[]) {
  const groups = new Map<string, Problem[]>();

  items.forEach((item) => {
    groups.set(item.curriculum.chapter, [...(groups.get(item.curriculum.chapter) ?? []), item]);
  });

  return [...groups.values()]
    .map((chapterItems) => {
      const first = chapterItems[0];
      const layers = countBy(chapterItems, (item) => item.taxonomy?.layer ?? "Unlabeled");
      const stages = countBy(chapterItems, (item) => item.taxonomy?.stage ?? "Unlabeled");
      const difficulties = countBy(chapterItems, (item) => String(item.difficulty));
      const modes = countBy(chapterItems, (item) => item.responseSchema?.mode ?? item.answerType);
      const advanced = (layers.Honors ?? 0) + (layers.AMC8 ?? 0) + (layers["AMC8 Stretch"] ?? 0);
      const balanced =
        chapterItems.length >= 8 &&
        (layers.Foundation ?? 0) >= 2 &&
        (layers.Standard ?? 0) >= 3 &&
        advanced >= 3;

      return {
        chapterTitle: first.curriculum.chapterTitle,
        count: chapterItems.length,
        difficulties,
        grade: getGrade(first),
        layers,
        modes,
        sequence: first.curriculum.sequence,
        stages,
        status: balanced ? "balanced" : "needs review"
      };
    })
    .sort((left, right) => left.sequence - right.sequence || left.chapterTitle.localeCompare(right.chapterTitle, "zh-Hans-CN"));
}

function isCnSenior(problem: Problem) {
  return problem.locale?.curriculumSystem === "CN" && problem.curriculum?.course === "CN Senior High Math";
}

function getGrade(problem: Problem) {
  const text = `${problem.curriculum.chapterTitle} ${problem.curriculum.theme} ${problem.curriculum.chapter} ${problem.locale?.gradeBand ?? ""}`;
  if (/高一|grade10|g10/i.test(text)) return "高一";
  if (/高二|grade11|g11/i.test(text)) return "高二";
  if (/高三|grade12|g12/i.test(text)) return "高三";
  return "未分级高中";
}

function gradeRows(byGrade: Record<string, number>) {
  return GRADES.flatMap((grade) => {
    const count = byGrade[grade] ?? 0;
    if (count === 0 && grade === "未分级高中") return [];
    const status = count >= 80 ? "usable" : count >= 24 ? "pilot-stable" : count >= 8 ? "pilot" : "thin";
    return [[grade, String(count), status]];
  });
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || "Unlabeled";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function countFlat<T>(items: T[], getValues: (item: T) => string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    getValues(item).forEach((value) => {
      counts[value] = (counts[value] ?? 0) + 1;
    });
    return counts;
  }, {});
}

function entries(record: Record<string, number>) {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right, "zh-Hans-CN"));
}

function formatCounts(record: Record<string, number>) {
  return entries(record)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ");
}

function toTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

main();
