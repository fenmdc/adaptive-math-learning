import fs from "fs";
import path from "path";
import type { Problem, ProblemAsset } from "../packages/adaptive-engine";

type AssetRecord = {
  problemId: string;
  year: string;
  number: string;
  course: string;
  chapter: string;
  layer: string;
  role: ProblemAsset["role"];
  index: number;
  originalUrl: string;
  finalUrl: string;
  localPath: string;
  status: "local" | "downloaded" | "remote" | "failed";
  error?: string;
};

type DownloadResult = {
  ok: boolean;
  error?: string;
};

const SOURCE_COLLECTION = "amc8_past_papers_bulk";
const APP_PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const PUBLIC_ASSET_DIR = path.join(process.cwd(), "apps/web/public/problem-assets/amc8");
const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/amc8-past-papers");
const REVIEW_DIR = path.join(DATASET_DIR, "review");
const MANIFEST_PATH = path.join(REVIEW_DIR, "asset-manifest.json");
const REPORT_PATH = path.join(REVIEW_DIR, "asset-quality-report.md");
const REQUEST_TIMEOUT_MS = 12000;

async function main() {
  fs.mkdirSync(PUBLIC_ASSET_DIR, { recursive: true });
  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const problems = readJson<Problem[]>(APP_PROBLEMS_PATH);
  const records: AssetRecord[] = [];
  let changed = false;

  for (const problem of problems) {
    if (problem.curriculum?.sourceCollection !== SOURCE_COLLECTION) continue;
    if (!problem.assets || problem.assets.length === 0) continue;

    const nextAssets: ProblemAsset[] = [];
    for (let index = 0; index < problem.assets.length; index += 1) {
      const asset = problem.assets[index];
      const localName = localAssetName(problem.id, asset, index);
      const localPath = path.join(PUBLIC_ASSET_DIR, localName);
      const localUrl = `/problem-assets/amc8/${localName}`;
      const baseRecord = buildRecord(problem, asset, index, localPath);

      if (asset.url === localUrl && fs.existsSync(localPath)) {
        records.push({ ...baseRecord, finalUrl: localUrl, status: "local" });
        nextAssets.push(asset);
        continue;
      }

      if (fs.existsSync(localPath)) {
        records.push({ ...baseRecord, finalUrl: localUrl, status: "local" });
        nextAssets.push({ ...asset, url: localUrl });
        changed = true;
        continue;
      }

      if (!/^https?:\/\//i.test(asset.url)) {
        records.push({
          ...baseRecord,
          finalUrl: asset.url,
          status: "failed",
          error: "Local asset path is referenced but the file is missing."
        });
        nextAssets.push(asset);
        continue;
      }

      const download = await downloadAsset(asset.url, localPath);
      if (download.ok) {
        records.push({ ...baseRecord, finalUrl: localUrl, status: "downloaded" });
        nextAssets.push({ ...asset, url: localUrl });
        changed = true;
      } else {
        const error = download.error;
        records.push({
          ...baseRecord,
          finalUrl: asset.url,
          status: "remote",
          error
        });
        nextAssets.push(asset);
      }
    }

    problem.assets = nextAssets;
  }

  if (changed) {
    fs.writeFileSync(APP_PROBLEMS_PATH, `${JSON.stringify(problems, null, 2)}\n`);
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(buildManifest(records), null, 2)}\n`);
  fs.writeFileSync(REPORT_PATH, buildReport(records));

  const summary = summarize(records);
  console.log("AMC8 asset sync");
  console.log(`- Assets: ${summary.total}`);
  console.log(`- Local: ${summary.local}`);
  console.log(`- Downloaded: ${summary.downloaded}`);
  console.log(`- Still remote: ${summary.remote}`);
  console.log(`- Failed local references: ${summary.failed}`);
  console.log(`- Problems with external dependencies: ${summary.externalProblems}`);
  console.log(`- Updated app problems: ${changed ? "yes" : "no"}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

function buildRecord(problem: Problem, asset: ProblemAsset, index: number, localPath: string): Omit<AssetRecord, "finalUrl" | "status" | "error"> {
  const match = problem.id.match(/amc8_(\d{4})_p(\d{2})/);

  return {
    problemId: problem.id,
    year: match?.[1] ?? "",
    number: match?.[2] ?? "",
    course: problem.curriculum.course,
    chapter: problem.curriculum.chapter,
    layer: problem.taxonomy?.layer ?? "",
    role: asset.role,
    index: index + 1,
    originalUrl: asset.url,
    localPath: path.relative(process.cwd(), localPath)
  };
}

function localAssetName(problemId: string, asset: ProblemAsset, index: number) {
  const extension = extensionFor(asset.url);
  return `${problemId}_${asset.role}_${index + 1}${extension}`;
}

function extensionFor(url: string) {
  try {
    const ext = path.extname(new URL(url, "https://wiki.randommath.com").pathname);
    return ext || ".jpg";
  } catch {
    return ".jpg";
  }
}

async function downloadAsset(url: string, outputPath: string): Promise<DownloadResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 AdaptiveMathLearningAssetSync/0.1",
        "referer": "https://wiki.randommath.com/"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: `Unexpected content-type ${contentType || "unknown"}` };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 128) return { ok: false, error: `Image response too small (${bytes.length} bytes)` };

    fs.writeFileSync(outputPath, bytes);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function buildManifest(records: AssetRecord[]) {
  const summary = summarize(records);

  return {
    generatedAt: new Date().toISOString(),
    sourceCollection: SOURCE_COLLECTION,
    summary,
    externalDependencies: records.filter((record) => record.status === "remote" || record.status === "failed"),
    assets: records
  };
}

function buildReport(records: AssetRecord[]) {
  const summary = summarize(records);
  const byYear = countBy(records, (record) => record.year || "unknown");
  const remoteRecords = records.filter((record) => record.status === "remote" || record.status === "failed");

  return `# AMC8 Past-Paper Asset Quality Report

Source collection: \`${SOURCE_COLLECTION}\`

Generated at: ${new Date().toISOString()}

## Summary

- Total AMC8 bulk image assets: ${summary.total}
- Problems with image assets: ${summary.problemsWithAssets}
- Local assets already available: ${summary.local}
- Downloaded in this sync: ${summary.downloaded}
- Still dependent on external URLs: ${summary.remote}
- Broken local references: ${summary.failed}
- Problems with external dependencies: ${summary.externalProblems}
- Local asset directory: \`apps/web/public/problem-assets/amc8\`

## Coverage By Year

${Object.keys(byYear).sort().map((year) => `- ${year}: ${byYear[year]} asset(s)`).join("\n")}

## External Dependencies

${remoteRecords.length > 0
  ? remoteRecords.map((record) => `- ${record.problemId} ${record.role} #${record.index}: ${record.finalUrl}${record.error ? ` (${record.error})` : ""}`).join("\n")
  : "- none"}
`;
}

function summarize(records: AssetRecord[]) {
  const externalRecords = records.filter((record) => record.status === "remote" || record.status === "failed");

  return {
    total: records.length,
    problemsWithAssets: new Set(records.map((record) => record.problemId)).size,
    local: records.filter((record) => record.status === "local").length,
    downloaded: records.filter((record) => record.status === "downloaded").length,
    remote: records.filter((record) => record.status === "remote").length,
    failed: records.filter((record) => record.status === "failed").length,
    externalProblems: new Set(externalRecords.map((record) => record.problemId)).size
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
