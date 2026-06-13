import fs from "fs";
import path from "path";
import type { Problem } from "../packages/adaptive-engine";
import { buildContentPipelineReport, type ContentPipelineReport } from "../apps/web/app/shared/contentPipeline";
import type { ExampleExplanation } from "../apps/web/app/shared/explanationQuality";

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const REPORTS_DIR = path.join(process.cwd(), "datasets/reports");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const REPORT_PATH = path.join(REPORTS_DIR, "content-pipeline-v1.md");

function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const report = buildContentPipelineReport({
    problems,
    explanations,
    staging: {
      problemRows: countCsvRows(path.join(STAGING_DIR, "problem_staging.csv")),
      distractorRows: countCsvRows(path.join(STAGING_DIR, "distractors.csv")),
      explanationRows: countCsvRows(path.join(STAGING_DIR, "example_explanations.csv"))
    }
  });

  fs.writeFileSync(REPORT_PATH, buildMarkdownReport(report));

  console.log("Content pipeline check");
  console.log(`- Status: ${report.status}`);
  console.log(`- Pipeline readiness: ${report.readinessScore}/100`);
  console.log(`- Problem readiness: ${report.problemQuality.readinessScore}/100`);
  console.log(`- Diagnostic slots: ${report.diagnosticGate.selectedSlots}/${report.diagnosticGate.totalSlots}`);
  console.log(`- Source collections: ${report.sourceCollections.length}`);
  console.log(`- Staging rows: ${report.staging.problemRows}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`- Warnings: ${report.status === "Ready" ? 0 : report.nextActions.length}`);
  console.log(`- Errors: ${report.status === "Needs Repair" ? 1 : 0}`);

  if (report.status === "Needs Repair") process.exit(1);
}

function buildMarkdownReport(report: ContentPipelineReport) {
  return `# Content Pipeline v1 Report

Generated at: ${report.generatedAt}

## Summary

- Status: ${report.status}
- Pipeline readiness: ${report.readinessScore}/100
- Problem quality readiness: ${report.problemQuality.readinessScore}/100
- Problems: ${report.problemQuality.totalProblems}
- Auto-gradable: ${report.problemQuality.autoGradable}/${report.problemQuality.totalProblems}
- Multiple choice: ${report.problemQuality.multipleChoice}
- Full distractor coverage: ${report.problemQuality.fullDistractorCoverage}/${report.problemQuality.multipleChoice}
- Explanation quality: ${report.problemQuality.explanationQuality.averageScore}/100
- Remote assets: ${report.problemQuality.remoteAssets}
- Thin chapters: ${report.problemQuality.thinChapters.length}
- Thin concepts: ${report.problemQuality.thinConcepts.length}

${report.summary}

## Diagnostic Gate

- Slots selected: ${report.diagnosticGate.selectedSlots}/${report.diagnosticGate.totalSlots}
- Ready: ${report.diagnosticGate.ready ? "yes" : "no"}

${report.diagnosticGate.stageCoverage.map((stage) => `- ${stage.stage}: ${stage.selected}/${stage.expected} selected, minimum ${stage.minimum}`).join("\n")}

## Staging Snapshot

- Problem rows: ${report.staging.problemRows}
- Distractor rows: ${report.staging.distractorRows}
- Explanation rows: ${report.staging.explanationRows}

## Source Collections

${report.sourceCollections.map((source) => `- ${source.sourceCollection}: ${source.problems} problem(s), ${source.chapterCount} chapter(s), ${source.autoGradableRate}% auto-gradable, ${source.explanationRate}% explained`).join("\n")}

## Next Actions

${report.nextActions.map((action, index) => `${index + 1}. [${action.priority}] ${action.title}: ${action.reason}`).join("\n")}
`;
}

function countCsvRows(filePath: string) {
  if (!fs.existsSync(filePath)) return 0;

  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) return 0;

  return Math.max(0, content.split(/\r?\n/).length - 1);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

main();
