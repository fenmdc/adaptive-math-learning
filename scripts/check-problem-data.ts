import fs from "node:fs";
import path from "node:path";

import { loadProblemBank, parseCsv } from "../packages/problem-bank";

const root = process.cwd();
const problemRecords = parseCsv(
  fs.readFileSync(path.join(root, "datasets", "problems", "problems.csv"), "utf8"),
);
const conceptRecords = parseCsv(
  fs.readFileSync(path.join(root, "datasets", "concepts", "concepts.csv"), "utf8"),
);
const conceptIds = new Set(conceptRecords.map((record) => record.id));
const problemIds = problemRecords.map((record) => record.id);
const duplicateIds = problemIds.filter((id, index) => problemIds.indexOf(id) !== index);
const missingConcepts = [...new Set(
  problemRecords
    .flatMap((record) => record.concepts.split(";").filter(Boolean))
    .filter((concept) => !conceptIds.has(concept)),
)];
const bank = loadProblemBank(root);
const invalidProblems = bank.problems.filter(
  (problem) => problem.choices.length !== 4 || new Set(problem.choices).size !== 4 || !problem.choices.includes(problem.answer),
);
const unsupportedProblems = bank.problems.filter(
  (problem) => problem.hint.length < 20
    || problem.explanation.length < 30
    || problem.misconceptionFeedback.length < 20
    || problem.choices.some((choice) => choice.startsWith("Option ")),
);
const reviewedProblems = bank.problems.filter((problem) => problem.reviewStatus === "reviewed");
const terseReviewedProblems = reviewedProblems.filter((problem) => problem.statement.length < 25);

const failures = [
  duplicateIds.length ? `Duplicate problem IDs: ${duplicateIds.join(", ")}` : "",
  missingConcepts.length ? `Missing concept references: ${missingConcepts.join(", ")}` : "",
  invalidProblems.length ? `Invalid answer choices: ${invalidProblems.map((problem) => problem.id).join(", ")}` : "",
  unsupportedProblems.length ? `Incomplete learning support: ${unsupportedProblems.map((problem) => problem.id).join(", ")}` : "",
  reviewedProblems.length !== bank.problems.length ? `Not every answerable problem is reviewed: ${reviewedProblems.length}/${bank.problems.length}` : "",
  terseReviewedProblems.length ? `Reviewed problem statements are too terse: ${terseReviewedProblems.map((problem) => problem.id).join(", ")}` : "",
].filter(Boolean);

if (failures.length) {
  console.error("Problem data check failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(
  `Problem data check passed: ${bank.problems.length}/${bank.totalRecords} answerable, ${bank.skippedRecords} skipped, ${reviewedProblems.length} reviewed, ${conceptIds.size} concepts.`,
);
