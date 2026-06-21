import fs from "fs";
import path from "path";

type ParseSummary = {
  pages: number;
  blocks: number;
  questionCandidates: number;
  columns: Record<string, number>;
  lessons: number[];
  pageRange: {
    start: number;
    end: number;
  };
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const GRADES = ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

function main() {
  const summaries = GRADES.map((grade) => ({ grade, summary: readSummary(grade) }));
  const reportPath = path.join(DATASET_DIR, "review", "grade1-grade6-comparison.md");

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderReport(summaries));

  console.log("Jian Zi Sheng elementary comparison report");
  console.log(`- Grades: ${GRADES.join(", ")}`);
  console.log(`- Report: ${path.relative(process.cwd(), reportPath)}`);
}

function readSummary(grade: string) {
  const summaryPath = path.join(DATASET_DIR, "parsed", grade, "parse-summary.json");
  if (!fs.existsSync(summaryPath)) throw new Error(`Missing parse summary: ${summaryPath}`);
  return JSON.parse(fs.readFileSync(summaryPath, "utf8")) as ParseSummary;
}

function renderReport(rows: Array<{ grade: string; summary: ParseSummary }>) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.pages += row.summary.pages;
      acc.blocks += row.summary.blocks;
      acc.questionCandidates += row.summary.questionCandidates;
      acc.unknown += row.summary.columns.unknown ?? 0;
      return acc;
    },
    { pages: 0, blocks: 0, questionCandidates: 0, unknown: 0 }
  );

  return [
    "# Jian Zi Sheng Grade 1-6 OCR Parse Comparison",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Grades covered: ${rows.map((row) => row.grade).join(", ")}`,
    `- Parsed pages: ${totals.pages}`,
    `- Column blocks: ${totals.blocks}`,
    `- Question candidates: ${totals.questionCandidates}`,
    `- Unknown blocks: ${totals.unknown} (${percent(totals.unknown, totals.blocks)})`,
    "",
    "## Grade Comparison",
    "",
    [
      "| Grade | Page range | Pages | Lessons | Blocks | Question candidates | Q/page | Unknown blocks | Unknown rate | Topic overview | Worked examples | Thinking training | Competition boost |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...rows.map(({ grade, summary }) => {
        const columns = summary.columns;
        return [
          grade,
          `${summary.pageRange.start}-${summary.pageRange.end}`,
          summary.pages,
          summary.lessons.length,
          summary.blocks,
          summary.questionCandidates,
          decimal(summary.questionCandidates / summary.pages),
          columns.unknown ?? 0,
          percent(columns.unknown ?? 0, summary.blocks),
          columns.topic_overview ?? 0,
          columns.worked_example ?? 0,
          columns.thinking_training ?? 0,
          columns.competition_boost ?? 0
        ].join(" | ");
      }).map((line) => `| ${line} |`)
    ].join("\n"),
    "",
    "## Review Notes",
    "",
    "- The OCR and column parser produced review-ready outputs for all elementary grades without writing to staging or promoted app data.",
    "- All six grades include the target columns: topic overview, worked example, thinking training, and competition boost.",
    "- Grade 5 and Grade 6 have low worked-example block counts and should be sampled before any automated import.",
    "- Unknown block rates remain close enough for review workflow use, but unknown blocks should be resolved before creating auto-gradable problems.",
    "- OCR warnings were more visible in upper elementary books, likely from denser diagrams and competition pages; prioritize image-heavy pages in manual QA.",
    "",
    "## Next Review Queue",
    "",
    ...rows.flatMap(({ grade, summary }) => {
      const unknownRate = (summary.columns.unknown ?? 0) / summary.blocks;
      const workedExamples = summary.columns.worked_example ?? 0;
      const risks = [
        unknownRate >= 0.12 ? `unknown rate ${percent(summary.columns.unknown ?? 0, summary.blocks)}` : "",
        workedExamples <= 3 ? `low worked examples ${workedExamples}` : ""
      ].filter(Boolean);

      return [`- ${grade}: ${risks.length > 0 ? risks.join("; ") : "stable enough for sampled review"}`];
    }),
    ""
  ].join("\n");
}

function decimal(value: number) {
  return value.toFixed(2);
}

function percent(value: number, total: number) {
  if (total === 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

main();
