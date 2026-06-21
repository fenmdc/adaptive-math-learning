import fs from "fs";
import path from "path";

type ColumnType = "topic_overview" | "worked_example" | "thinking_training" | "competition_boost" | "unknown";

type QuestionCandidate = {
  localNo: string;
  prompt: string;
  hasAnalysis: boolean;
  hasSolution: boolean;
};

type ParsedBlock = {
  id: string;
  grade: string;
  sourceFile: string;
  pageStart: number;
  pageEnd: number;
  lessonNo: number | null;
  lessonTitle: string;
  column: ColumnType;
  rawHeading: string;
  text: string;
  questionCandidates: QuestionCandidate[];
};

type CleanedBlock = ParsedBlock & {
  cleanedColumn: ColumnType | "front_matter" | "lesson_heading";
  cleaningAction: "kept" | "reclassified" | "flagged";
  confidence: "high" | "medium" | "low";
  reviewPriority: "normal" | "medium" | "high";
  reviewReasons: string[];
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const CLEANED_DIR = path.join(DATASET_DIR, "review", "cleaned");
const DEFAULT_GRADES = ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

function main() {
  const grades = readGrades();
  const summaryFileName = readArg("--summary") ?? (sameGrades(grades, DEFAULT_GRADES) ? "elementary-cleaning-summary.md" : `${grades.join("-")}-cleaning-summary.md`);
  fs.mkdirSync(CLEANED_DIR, { recursive: true });
  const allGrades = grades.map((grade) => {
    const blocks = readBlocks(grade);
    const cleaned = blocks.map(cleanBlock);
    writeGradeOutputs(grade, cleaned);
    return { grade, cleaned };
  });

  fs.writeFileSync(path.join(CLEANED_DIR, summaryFileName), renderSummary(allGrades, summaryFileName));

  console.log("Jian Zi Sheng review cleaning");
  allGrades.forEach(({ grade, cleaned }) => {
    const reclassified = cleaned.filter((block) => block.cleaningAction === "reclassified").length;
    const highPriority = cleaned.filter((block) => block.reviewPriority === "high").length;
    console.log(`- ${grade}: ${cleaned.length} blocks, ${reclassified} reclassified, ${highPriority} high-priority review`);
  });
  console.log(`- Summary: ${path.relative(process.cwd(), path.join(CLEANED_DIR, summaryFileName))}`);
  console.log(`- Output: ${path.relative(process.cwd(), CLEANED_DIR)}`);
}

function readBlocks(grade: string) {
  const blockPath = path.join(DATASET_DIR, "parsed", grade, "column_blocks.json");
  if (!fs.existsSync(blockPath)) throw new Error(`Missing parsed blocks: ${blockPath}`);
  return JSON.parse(fs.readFileSync(blockPath, "utf8")) as ParsedBlock[];
}

function cleanBlock(block: ParsedBlock): CleanedBlock {
  const normalized = normalize(block.text);
  const reasons: string[] = [];
  let cleanedColumn: CleanedBlock["cleanedColumn"] = block.column;
  let confidence: CleanedBlock["confidence"] = block.column === "unknown" ? "low" : "high";

  if (block.column === "unknown") {
    if (block.lessonNo === null || /数学类子生高分题库|全和音关子生|PRBLE|珊分题关/.test(normalized)) {
      cleanedColumn = "front_matter";
      confidence = "medium";
      reasons.push("front matter or OCR artifact before a stable lesson");
    } else if (block.questionCandidates.length === 0 && block.text.length < 80 && /第\s*\d+\s*讲/.test(block.rawHeading)) {
      cleanedColumn = "lesson_heading";
      confidence = "medium";
      reasons.push("short lesson heading without exercise body");
    } else if (/分析|解\s|答案|答[:：]/.test(normalized) && block.questionCandidates.length <= 2) {
      cleanedColumn = "worked_example";
      confidence = block.text.length > 120 ? "medium" : "low";
      reasons.push("contains analysis/solution markers typical of worked examples");
    } else if (block.questionCandidates.length >= 3) {
      cleanedColumn = "thinking_training";
      confidence = "medium";
      reasons.push("contains multiple numbered exercise candidates");
    } else if (/竞赛|强化|挑战|能力提升/.test(normalized)) {
      cleanedColumn = "competition_boost";
      confidence = "medium";
      reasons.push("contains competition or challenge marker");
    } else if (/概述|知识|方法|规律|要点/.test(normalized) && block.questionCandidates.length === 0) {
      cleanedColumn = "topic_overview";
      confidence = "medium";
      reasons.push("contains topic overview or method marker");
    } else {
      reasons.push("unknown block still needs manual review");
    }
  }

  if (isUpperGrade(block.grade) && block.column !== "worked_example" && /分析|解\s|答案|答[:：]/.test(normalized)) {
    reasons.push("upper-grade possible worked-example content");
    if (cleanedColumn === block.column) confidence = confidence === "high" ? "medium" : confidence;
  }

  if (block.text.length < 60) reasons.push("very short OCR block");
  if (/[A-Za-z]{8,}|[¢§]|Rite|Riise|MBER|TALS|CRA|Bubs|nana|zana|SBE/.test(block.text)) {
    reasons.push("OCR noise signature");
  }

  const action = cleanedColumn !== block.column ? "reclassified" : reasons.length > 0 ? "flagged" : "kept";
  const reviewPriority = priority(block, cleanedColumn, reasons);

  return {
    ...block,
    cleanedColumn,
    cleaningAction: action,
    confidence,
    reviewPriority,
    reviewReasons: reasons
  };
}

function priority(block: ParsedBlock, cleanedColumn: CleanedBlock["cleanedColumn"], reasons: string[]): CleanedBlock["reviewPriority"] {
  if (cleanedColumn === "unknown") return "high";
  if (isUpperGrade(block.grade) && reasons.includes("upper-grade possible worked-example content")) return "high";
  if (reasons.some((reason) => reason.includes("OCR noise"))) return "medium";
  if (cleanedColumn === "front_matter" || cleanedColumn === "lesson_heading") return "medium";
  return "normal";
}

function writeGradeOutputs(grade: string, blocks: CleanedBlock[]) {
  fs.writeFileSync(path.join(CLEANED_DIR, `${grade}-cleaned-blocks.json`), `${JSON.stringify(blocks, null, 2)}\n`);
  fs.writeFileSync(path.join(CLEANED_DIR, `${grade}-cleaning-report.md`), renderGradeReport(grade, blocks));
}

function renderGradeReport(grade: string, blocks: CleanedBlock[]) {
  const byOriginal = countBy(blocks, (block) => block.column);
  const byCleaned = countBy(blocks, (block) => block.cleanedColumn);
  const highPriority = blocks
    .filter((block) => block.reviewPriority === "high")
    .sort((a, b) => a.pageStart - b.pageStart)
    .slice(0, 30);

  return [
    `# ${grade} Review Cleaning Report`,
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Column Distribution",
    "",
    "Original:",
    ...Object.entries(byOriginal).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "Cleaned:",
    ...Object.entries(byCleaned).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## High Priority Review",
    "",
    ...highPriority.flatMap((block) => [
      `### ${block.id} · ${block.column} -> ${block.cleanedColumn} · pages ${block.pageStart}-${block.pageEnd}`,
      "",
      `- Lesson: ${block.lessonNo ?? "unknown"} ${block.lessonTitle}`,
      `- Confidence: ${block.confidence}`,
      `- Reasons: ${block.reviewReasons.join("; ") || "none"}`,
      `- Question candidates: ${block.questionCandidates.length}`,
      "",
      "```text",
      block.text.slice(0, 900),
      "```",
      ""
    ]),
    ""
  ].join("\n");
}

function renderSummary(rows: Array<{ grade: string; cleaned: CleanedBlock[] }>, summaryFileName: string) {
  return [
    "# Jian Zi Sheng Review Cleaning Summary",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Summary file: ${summaryFileName}`,
    "",
    "This review layer only creates cleaned review artifacts. It does not overwrite parsed OCR blocks and does not write promoted app problems.",
    "",
    "| Grade | Blocks | Original unknown | Cleaned unknown | Reclassified | High-priority review | Worked examples before | Worked examples after |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(({ grade, cleaned }) => {
      const original = countBy(cleaned, (block) => block.column);
      const after = countBy(cleaned, (block) => block.cleanedColumn);
      return `| ${grade} | ${cleaned.length} | ${original.unknown ?? 0} | ${after.unknown ?? 0} | ${cleaned.filter((block) => block.cleaningAction === "reclassified").length} | ${cleaned.filter((block) => block.reviewPriority === "high").length} | ${original.worked_example ?? 0} | ${after.worked_example ?? 0} |`;
    }),
    "",
    "## Notes",
    "",
    "- Reclassification is heuristic and review-facing only.",
    "- `front_matter` and `lesson_heading` blocks are treated as non-problem material.",
    "- Upper-grade possible worked-example blocks are deliberately high priority because the first parser can under-count worked examples in denser books.",
    "- Use the cleaned blocks as source signals for small pilot generation, then manually review before promotion.",
    ""
  ].join("\n");
}

function isUpperGrade(grade: string) {
  const match = grade.match(/grade(\d+)/);
  return match ? Number(match[1]) >= 5 : false;
}

function readGrades() {
  const value = readArg("--grades");
  if (!value) return DEFAULT_GRADES;
  return value.split(",").map((grade) => grade.trim()).filter(Boolean);
}

function sameGrades(left: string[], right: string[]) {
  return left.length === right.length && left.every((grade, index) => grade === right[index]);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

main();
