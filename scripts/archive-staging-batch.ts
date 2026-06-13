import fs from "fs";
import path from "path";

type ArchiveFile = {
  fileName: string;
  required: boolean;
};

const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const ARCHIVE_ROOT = path.join(STAGING_DIR, "archive");
const FILES: ArchiveFile[] = [
  { fileName: "problem_staging.csv", required: true },
  { fileName: "distractors.csv", required: true },
  { fileName: "example_explanations.csv", required: true },
  { fileName: "import_notes.md", required: false },
  { fileName: "aops_prealgebra_import.md", required: false }
];

function main() {
  const problemPath = path.join(STAGING_DIR, "problem_staging.csv");
  const problemStats = getCsvStats(problemPath);

  if (problemStats.rows === 0) {
    console.log("Staging archive");
    console.log("- Active staging is already empty.");
    return;
  }

  const sourceCollection = detectSourceCollection(problemPath) ?? "unknown-source";
  const archiveDirName = `${todayStamp()}-${slugify(sourceCollection)}`;
  const archiveDir = uniqueArchiveDir(path.join(ARCHIVE_ROOT, archiveDirName));

  fs.mkdirSync(archiveDir, { recursive: true });

  const archivedFiles = FILES.flatMap((file) => {
    const sourcePath = path.join(STAGING_DIR, file.fileName);
    if (!fs.existsSync(sourcePath)) {
      if (file.required) throw new Error(`Missing required staging file: ${file.fileName}`);
      return [];
    }

    const targetPath = path.join(archiveDir, file.fileName);
    fs.copyFileSync(sourcePath, targetPath);
    return [file.fileName];
  });

  const stats = {
    problems: problemStats.rows,
    distractors: getCsvStats(path.join(STAGING_DIR, "distractors.csv")).rows,
    explanations: getCsvStats(path.join(STAGING_DIR, "example_explanations.csv")).rows
  };

  fs.writeFileSync(
    path.join(archiveDir, "archive-summary.md"),
    buildSummary({
      archiveDir,
      archivedFiles,
      sourceCollection,
      stats
    })
  );

  resetCsvToHeader(path.join(STAGING_DIR, "problem_staging.csv"));
  resetCsvToHeader(path.join(STAGING_DIR, "distractors.csv"));
  resetCsvToHeader(path.join(STAGING_DIR, "example_explanations.csv"));

  console.log("Staging archive");
  console.log(`- Archived source collection: ${sourceCollection}`);
  console.log(`- Problem rows: ${stats.problems}`);
  console.log(`- Distractor rows: ${stats.distractors}`);
  console.log(`- Explanation rows: ${stats.explanations}`);
  console.log(`- Archive: ${path.relative(process.cwd(), archiveDir)}`);
  console.log("- Active staging CSVs reset to header-only.");
}

function buildSummary({
  archiveDir,
  archivedFiles,
  sourceCollection,
  stats
}: {
  archiveDir: string;
  archivedFiles: string[];
  sourceCollection: string;
  stats: { problems: number; distractors: number; explanations: number };
}) {
  return `# Staging Archive

Archived at (UTC): ${new Date().toISOString()}
Local archive date: ${todayStamp()}

## Batch

- Source collection: ${sourceCollection}
- Problem rows: ${stats.problems}
- Distractor rows: ${stats.distractors}
- Explanation rows: ${stats.explanations}
- Archive path: ${path.relative(process.cwd(), archiveDir)}

## Reason

This batch has already been promoted into the active app problem bank. The
active staging CSVs were reset to header-only so the next import batch can be
validated without duplicate-id warnings from completed rows.

## Files

${archivedFiles.map((fileName) => `- ${fileName}`).join("\n")}
`;
}

function getCsvStats(filePath: string) {
  if (!fs.existsSync(filePath)) return { rows: 0, header: "" };

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((line, index, allLines) => line.length > 0 || index < allLines.length - 1);
  const header = lines[0] ?? "";

  return {
    rows: Math.max(0, lines.length - 1),
    header
  };
}

function detectSourceCollection(problemPath: string) {
  const content = fs.readFileSync(problemPath, "utf8").trim();
  const [headerLine, firstRow] = content.split(/\r?\n/);
  if (!headerLine || !firstRow) return null;

  const headers = parseCsvLine(headerLine);
  const values = parseCsvLine(firstRow);
  const index = headers.indexOf("source_collection");
  return index >= 0 ? values[index] : null;
}

function resetCsvToHeader(filePath: string) {
  const { header } = getCsvStats(filePath);
  if (!header) throw new Error(`Cannot reset ${path.basename(filePath)} because it has no header`);

  fs.writeFileSync(filePath, `${header}\n`);
}

function todayStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "staging-batch";
}

function uniqueArchiveDir(baseDir: string) {
  if (!fs.existsSync(baseDir)) return baseDir;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${baseDir}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Could not allocate a unique archive directory for ${baseDir}`);
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

main();
