import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const PDF_PATH = "/Users/fenmdc/Documents/IMO-中小学奥数/AoPS/01-Prealgebra.pdf";
const ANSWER_PDF_PATH = "/Users/fenmdc/Documents/IMO-中小学奥数/AoPS/01-Prealgebra 答案.pdf";
const OUTPUT_DIR = path.join(process.cwd(), "datasets/staging/raw_extracts/aops_prealgebra");
const BIN_DIR = "/Users/fenmdc/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin";
const PDFTOPPM = path.join(BIN_DIR, "pdftoppm");
const PDFINFO = path.join(BIN_DIR, "pdfinfo");

type ExtractTarget = {
  kind: "book" | "answers";
  pdfPath: string;
  from: number;
  to: number;
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const target: ExtractTarget = {
    kind: args.kind,
    pdfPath: args.kind === "answers" ? ANSWER_PDF_PATH : PDF_PATH,
    from: args.from,
    to: args.to
  };

  if (!fs.existsSync(target.pdfPath)) {
    throw new Error(`PDF not found: ${target.pdfPath}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const pageCount = getPageCount(target.pdfPath);

  if (target.from < 1 || target.to > pageCount || target.from > target.to) {
    throw new Error(`Invalid page range ${target.from}-${target.to}. ${target.kind} PDF has ${pageCount} pages.`);
  }

  const prefix = path.join(OUTPUT_DIR, `${target.kind}_p`);
  execFileSync(PDFTOPPM, [
    "-png",
    "-r",
    String(args.dpi),
    "-f",
    String(target.from),
    "-l",
    String(target.to),
    target.pdfPath,
    prefix
  ], { stdio: "inherit" });

  const generated = expectedOutputFiles(target, pageCount).filter((file) =>
    fs.existsSync(path.join(OUTPUT_DIR, file))
  );
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  const manifest = {
    source: target.pdfPath,
    kind: target.kind,
    extractedAt: new Date().toISOString(),
    pageRange: [target.from, target.to],
    dpi: args.dpi,
    files: generated
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Extracted ${generated.length} image(s) to ${OUTPUT_DIR}`);
  console.log(`Manifest: ${manifestPath}`);
}

function expectedOutputFiles(target: ExtractTarget, pageCount: number) {
  const width = String(pageCount).length;
  const files: string[] = [];

  for (let page = target.from; page <= target.to; page += 1) {
    files.push(`${target.kind}_p-${String(page).padStart(width, "0")}.png`);
  }

  return files;
}

function parseArgs(args: string[]) {
  const from = Number(readArg(args, "--from") ?? "1");
  const to = Number(readArg(args, "--to") ?? String(from));
  const dpi = Number(readArg(args, "--dpi") ?? "180");
  const kind = readArg(args, "--kind") === "answers" ? "answers" : "book";

  return {
    kind: kind as "book" | "answers",
    from,
    to,
    dpi
  };
}

function readArg(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function getPageCount(pdfPath: string) {
  const output = execFileSync(PDFINFO, [pdfPath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Unable to read page count from ${pdfPath}`);
  return Number(match[1]);
}

main();
