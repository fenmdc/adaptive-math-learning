import fs from "fs";
import path from "path";
import type { Problem } from "../packages/adaptive-engine";

type ExampleExplanation = {
  hint1: string;
  hint2: string;
  stepByStep: string;
  commonMistake: string;
  whyCorrect: string;
  variantIdea: string;
};

const PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const EXPLANATIONS_PATH = path.join(process.cwd(), "apps/web/data/exampleExplanations.json");
const SEED_SOURCES = new Set(["seed", "amc8_seed", "local_seed_from_imo_folder"]);

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const incoming = Object.fromEntries(
    problems
      .filter((problem) => SEED_SOURCES.has(problem.curriculum.sourceCollection))
      .filter((problem) => !explanations[problem.id])
      .map((problem) => [problem.id, buildExplanation(problem)])
  );
  const merged = { ...explanations, ...incoming };

  fs.writeFileSync(EXPLANATIONS_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Backfilled ${Object.keys(incoming).length} seed explanation template(s).`);
  console.log(`${Object.keys(merged).length} total explanation template(s).`);
}

function buildExplanation(problem: Problem): ExampleExplanation {
  const conceptText = formatList(problem.concepts);
  const skillText = formatList(problem.skills);
  const answerText = problem.answer || problem.solution || "the stated rule";
  const solutionText = problem.solution || `The expected answer is ${answerText}.`;
  const misconception = problem.misconceptions[0]?.replace(/_/g, " ") || "using the wrong operation or rule";
  const typeText = problem.taxonomy?.problemType?.replace(/_/g, " ") || "this problem type";

  return {
    hint1: `Identify the ${conceptText} idea being tested before calculating.`,
    hint2: skillText
      ? `Use ${skillText}, then compare your result with the answer form requested.`
      : `Work from the given quantities and keep the requested answer form in mind.`,
    stepByStep: `Read the prompt: ${problem.statement} Use the core relation for ${conceptText}. ${solutionText} Therefore the answer is ${answerText}.`,
    commonMistake: `A common mistake is ${misconception}, especially when ${typeText} is mixed with quick computation.`,
    whyCorrect: `This answer is correct because it follows the tagged concept path (${conceptText}) and matches the stored solution: ${solutionText}.`,
    variantIdea: `Try a nearby version by changing one number or condition while keeping the same ${conceptText} structure.`
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function formatList(values: string[]) {
  return values.length > 0 ? values.map((value) => value.replace(/_/g, " ")).join(", ") : "target concept";
}

main();
