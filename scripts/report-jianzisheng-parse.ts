import fs from "fs";
import path from "path";

type ParsedBlock = {
  id: string;
  grade: string;
  sourceFile: string;
  pageStart: number;
  pageEnd: number;
  lessonNo: number | null;
  lessonTitle: string;
  column: string;
  rawHeading: string;
  text: string;
  questionCandidates: Array<{
    localNo: string;
    prompt: string;
    hasAnalysis: boolean;
    hasSolution: boolean;
  }>;
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");

function main() {
  const grade = readArg("--grade") ?? "grade1";
  const parsedPath = path.join(DATASET_DIR, "parsed", grade, "column_blocks.json");
  if (!fs.existsSync(parsedPath)) throw new Error(`Parsed blocks not found: ${parsedPath}`);

  const blocks = JSON.parse(fs.readFileSync(parsedPath, "utf8")) as ParsedBlock[];
  const reportPath = path.join(DATASET_DIR, "review", `${grade}-ocr-parse-report.md`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderReport(grade, blocks));

  console.log("Jian Zi Sheng parse report");
  console.log(`- Grade: ${grade}`);
  console.log(`- Blocks: ${blocks.length}`);
  console.log(`- Questions: ${blocks.reduce((sum, block) => sum + block.questionCandidates.length, 0)}`);
  console.log(`- Report: ${path.relative(process.cwd(), reportPath)}`);
}

function renderReport(grade: string, blocks: ParsedBlock[]) {
  const questionCount = blocks.reduce((sum, block) => sum + block.questionCandidates.length, 0);
  const byColumn = countBy(blocks, (block) => block.column);
  const byLesson = [...groupBy(blocks, (block) => String(block.lessonNo ?? "unknown")).entries()]
    .sort(([a], [b]) => Number(a || 999) - Number(b || 999));
  const reviewBlocks = blocks
    .map((block) => ({ block, score: reviewRiskScore(block) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.block.pageStart - b.block.pageStart)
    .slice(0, 20);

  return [
    `# ${grade} OCR Parse Report`,
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Blocks: ${blocks.length}`,
    `- Question candidates: ${questionCount}`,
    `- Page range: ${Math.min(...blocks.map((block) => block.pageStart))}-${Math.max(...blocks.map((block) => block.pageEnd))}`,
    "",
    "## Column Distribution",
    "",
    ...Object.entries(byColumn).map(([column, count]) => `- ${formatColumn(column)} (${column}): ${count}`),
    "",
    "## Lesson Distribution",
    "",
    ...byLesson.map(([lesson, lessonBlocks]) => {
      const count = lessonBlocks.reduce((sum, block) => sum + block.questionCandidates.length, 0);
      const columns = countBy(lessonBlocks, (block) => block.column);
      return `- Lesson ${lesson}: ${lessonBlocks.length} blocks, ${count} question candidates, ${Object.entries(columns).map(([key, value]) => `${formatColumn(key)} ${value}`).join(", ")}`;
    }),
    "",
    "## Review Queue",
    "",
    ...reviewBlocks.flatMap(({ block, score }) => [
      `### ${block.id} · ${formatColumn(block.column)} · pages ${block.pageStart}-${block.pageEnd}`,
      "",
      `- Risk score: ${score}`,
      `- Lesson: ${block.lessonNo ?? "unknown"} ${block.lessonTitle}`,
      `- Raw heading: ${block.rawHeading}`,
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

function reviewRiskScore(block: ParsedBlock) {
  let score = 0;
  if (block.column === "unknown") score += 5;
  if (block.lessonNo === null) score += 4;
  if (block.text.length < 60) score += 3;
  if (block.questionCandidates.length === 0 && ["thinking_training", "competition_boost", "worked_example"].includes(block.column)) score += 3;
  if (/[A-Za-z]{8,}|[¢§]|Rite|Riise|MBER|TALS|CRA/.test(block.text)) score += 2;
  return score;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return groups;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function formatColumn(column: string) {
  const labels: Record<string, string> = {
    competition_boost: "竞赛强化",
    thinking_training: "思维训练",
    topic_overview: "专题概述",
    unknown: "未标注",
    worked_example: "典型例题"
  };

  return labels[column] ?? column;
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
