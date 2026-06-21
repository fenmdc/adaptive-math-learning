import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

type GradeConfig = {
  grade: string;
  sourceFile: string;
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const LOCAL_SOURCE_DIR = "/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12";
const GRADE_CONFIGS: GradeConfig[] = [
  { grade: "grade1", sourceFile: "尖子生高分题库1年级.pdf" },
  { grade: "grade2", sourceFile: "尖子生高分题库2年级.pdf" },
  { grade: "grade3", sourceFile: "尖子生高分题库3年级.pdf" },
  { grade: "grade4", sourceFile: "尖子生高分题库4年级.pdf" },
  { grade: "grade5", sourceFile: "尖子生高分题库5年级.pdf" },
  { grade: "grade6", sourceFile: "尖子生高分题库6年级.pdf" },
  { grade: "grade7", sourceFile: "尖子生高分题库7年级.pdf" },
  { grade: "grade8", sourceFile: "尖子生高分题库8年级.pdf" },
  { grade: "grade9", sourceFile: "尖子生高分题库9年级.pdf" },
  { grade: "grade10", sourceFile: "尖子生高分题库高一.pdf" },
  { grade: "grade11", sourceFile: "尖子生高分题库高二.pdf" },
  { grade: "grade12", sourceFile: "尖子生高分题库高三.pdf" }
];

function main() {
  const grade = readArg("--grade") ?? "grade1";
  const pages = readArg("--pages") ?? "1-end";
  const contentStartPage = readArg("--content-start-page") ?? "7";
  const jobs = readArg("--jobs") ?? "2";
  const config = GRADE_CONFIGS.find((item) => item.grade === grade);
  if (!config) throw new Error(`Unknown grade ${grade}. Use one of: ${GRADE_CONFIGS.map((item) => item.grade).join(", ")}`);

  const sourcePath = path.join(LOCAL_SOURCE_DIR, config.sourceFile);
  const ocrDir = path.join(DATASET_DIR, "ocr", grade);
  const parsedDir = path.join(DATASET_DIR, "parsed", grade);
  const sidecarName = pages === "1-end" ? "full.txt" : `pages-${pages.replace(/[^0-9a-z-]+/gi, "-")}.txt`;
  const sidecarPath = path.join(ocrDir, sidecarName);

  fs.mkdirSync(ocrDir, { recursive: true });
  fs.mkdirSync(parsedDir, { recursive: true });

  console.log("Jian Zi Sheng OCR");
  console.log(`- Grade: ${grade}`);
  console.log(`- Source: ${sourcePath}`);
  console.log(`- Pages: ${pages}`);
  console.log(`- Sidecar: ${path.relative(process.cwd(), sidecarPath)}`);

  run("ocrmypdf", [
    "-l",
    "chi_sim+eng",
    "--pages",
    pages,
    "--sidecar",
    sidecarPath,
    "--output-type",
    "none",
    "--skip-text",
    "--jobs",
    jobs,
    sourcePath,
    "-"
  ]);

  run("npx", [
    "ts-node",
    "scripts/parse-jianzisheng-ocr.ts",
    "--grade",
    grade,
    "--input",
    sidecarPath,
    "--page-start",
    pageStart(pages),
    "--source-file",
    config.sourceFile,
    "--content-start-page",
    contentStartPage,
    "--output",
    parsedDir
  ]);
}

function pageStart(pages: string) {
  const match = pages.match(/^(\d+)/);
  return match?.[1] ?? "1";
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
