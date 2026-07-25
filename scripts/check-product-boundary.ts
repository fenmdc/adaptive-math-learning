import fs from "node:fs";
import path from "node:path";

const runtimeRoots = ["app", "packages", "scripts"];
const forbiddenTerms = [
  "ABRSM",
  "music theory",
  "Bible Study Note",
  "book catalog",
  "scientific-paper knowledge base",
];
const ignoredFiles = new Set([path.join("scripts", "check-product-boundary.ts")]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);

function collectFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath);
    return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

const violations = runtimeRoots
  .filter((root) => fs.existsSync(root))
  .flatMap(collectFiles)
  .filter((file) => !ignoredFiles.has(file))
  .flatMap((file) => {
    const content = fs.readFileSync(file, "utf8");
    return forbiddenTerms
      .filter((term) => content.toLowerCase().includes(term.toLowerCase()))
      .map((term) => `${file}: contains forbidden cross-product term "${term}"`);
  });

if (violations.length) {
  console.error("Product boundary check failed:\n" + violations.join("\n"));
  process.exit(1);
}

console.log(`Product boundary check passed across ${runtimeRoots.join(", ")}.`);
