import fs from "fs";
import path from "path";

type ExplanationRow = {
  problem_id: string;
  hint_1: string;
  hint_2: string;
  step_by_step: string;
  common_mistake: string;
  why_correct: string;
  variant_idea: string;
};

const SOURCE_PATH = path.join(process.cwd(), "datasets/staging/example_explanations.csv");
const TARGET_PATH = path.join(process.cwd(), "apps/web/data/exampleExplanations.json");

function main() {
  const rows = readCsv<ExplanationRow>(SOURCE_PATH);
  const explanations = Object.fromEntries(
    rows
      .filter((row) => row.problem_id)
      .map((row) => [
        row.problem_id,
        {
          hint1: row.hint_1,
          hint2: row.hint_2,
          stepByStep: row.step_by_step,
          commonMistake: row.common_mistake,
          whyCorrect: row.why_correct,
          variantIdea: row.variant_idea
        }
      ])
  );

  fs.writeFileSync(TARGET_PATH, `${JSON.stringify(explanations, null, 2)}\n`);
  console.log(`Synced ${Object.keys(explanations).length} explanation template(s) to apps/web/data/exampleExplanations.json`);
}

function readCsv<T extends Record<string, string>>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) return [];

  const [headerLine, ...rows] = content.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""])) as T);
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
