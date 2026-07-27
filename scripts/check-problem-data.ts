import fs from "node:fs";
import path from "node:path";

import { loadProblemBank, parseCsv } from "../packages/problem-bank";
import {
  loadLegacyProblems,
  loadProblemBankExplanations,
  loadProblemBankProblems,
  SUPPLEMENT_DATASET_IDS,
} from "../packages/problem-bank/legacy";

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
const legacyProblems = loadLegacyProblems(root);
const integratedProblems = loadProblemBankProblems(root);
const integratedExplanations = loadProblemBankExplanations(root);
const integratedIds = integratedProblems.map((problem) => problem.id);
const duplicateIntegratedIds = integratedIds.filter((id, index) => integratedIds.indexOf(id) !== index);
const supplementProblems = integratedProblems.slice(legacyProblems.length);
type SupplementManifest = {
  datasetId: string;
  counts: {
    problems: number;
    explanations: number;
    autoGradable: number;
    manualReview: number;
    themes: Record<string, number>;
    difficulty: Record<string, number>;
  };
};
const supplementBatches = SUPPLEMENT_DATASET_IDS.map((datasetId) => {
  const supplementRoot = path.join(root, "datasets", "problem-bank", "supplements", datasetId);
  return {
    datasetId,
    problems: JSON.parse(fs.readFileSync(path.join(supplementRoot, "problems.json"), "utf8")) as typeof supplementProblems,
    explanations: JSON.parse(fs.readFileSync(path.join(supplementRoot, "example-explanations.json"), "utf8")) as Record<string, unknown>,
    manifest: JSON.parse(fs.readFileSync(path.join(supplementRoot, "manifest.json"), "utf8")) as SupplementManifest,
  };
});
const invalidSupplements = supplementProblems.filter((problem) =>
  problem.reviewStatus !== "reviewed"
    || problem.isAutoGradable !== true
    || problem.answerType === "manual"
    || problem.choices?.length !== 5
    || new Set(problem.choices.map((choice) => choice.value ?? choice.text)).size !== 5
    || !problem.choices.some((choice) => (choice.value ?? choice.text) === problem.answer)
    || problem.curriculum?.course !== "CN Olympiad Lite"
    || !problem.locale || typeof problem.locale !== "object"
    || !("language" in problem.locale) || problem.locale.language !== "zh-CN"
    || !integratedExplanations[problem.id]?.hint1
    || !integratedExplanations[problem.id]?.hint2
    || !integratedExplanations[problem.id]?.stepByStep
    || !integratedExplanations[problem.id]?.commonMistake
    || !integratedExplanations[problem.id]?.whyCorrect,
);
function countBy<T>(values: T[], key: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const name = key(value);
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
}
function sameCounts(left: Record<string, number>, right: Record<string, number>) {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  return keys.every((key) => left[key] === right[key]);
}
const invalidSupplementManifests = supplementBatches.filter(({ datasetId, problems, explanations, manifest }) => {
  const problemIds = new Set(problems.map((problem) => problem.id));
  const explanationIds = new Set(Object.keys(explanations));
  return manifest.datasetId !== datasetId
    || manifest.counts.problems !== problems.length
    || manifest.counts.explanations !== explanationIds.size
    || manifest.counts.autoGradable !== problems.filter((problem) => problem.isAutoGradable).length
    || manifest.counts.manualReview !== problems.filter((problem) => !problem.isAutoGradable).length
    || !sameCounts(manifest.counts.themes, countBy(problems, (problem) => String(problem.curriculum?.theme)))
    || !sameCounts(manifest.counts.difficulty, countBy(problems, (problem) => String(problem.difficulty)))
    || problemIds.size !== problems.length
    || problemIds.size !== explanationIds.size
    || [...problemIds].some((id) => !explanationIds.has(id));
});

const failures = [
  duplicateIds.length ? `Duplicate problem IDs: ${duplicateIds.join(", ")}` : "",
  missingConcepts.length ? `Missing concept references: ${missingConcepts.join(", ")}` : "",
  invalidProblems.length ? `Invalid answer choices: ${invalidProblems.map((problem) => problem.id).join(", ")}` : "",
  unsupportedProblems.length ? `Incomplete learning support: ${unsupportedProblems.map((problem) => problem.id).join(", ")}` : "",
  reviewedProblems.length !== bank.problems.length ? `Not every answerable problem is reviewed: ${reviewedProblems.length}/${bank.problems.length}` : "",
  terseReviewedProblems.length ? `Reviewed problem statements are too terse: ${terseReviewedProblems.map((problem) => problem.id).join(", ")}` : "",
  duplicateIntegratedIds.length ? `Duplicate integrated problem IDs: ${[...new Set(duplicateIntegratedIds)].join(", ")}` : "",
  invalidSupplements.length ? `Invalid supplement problems: ${invalidSupplements.map((problem) => problem.id).join(", ")}` : "",
  invalidSupplementManifests.length ? `Invalid supplement manifests: ${invalidSupplementManifests.map((batch) => batch.datasetId).join(", ")}` : "",
].filter(Boolean);

if (failures.length) {
  console.error("Problem data check failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(
  `Problem data check passed: ${bank.problems.length}/${bank.totalRecords} core answerable, ${reviewedProblems.length} core reviewed, ${legacyProblems.length} legacy, ${supplementProblems.length} reviewed supplements across ${supplementBatches.length} batches, ${integratedProblems.length} integrated.`,
);
