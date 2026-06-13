import fs from "fs";
import path from "path";
import type { AnswerChoice, Problem } from "../packages/adaptive-engine";
import { buildExplanationReviewQueue, summarizeExplanationQuality } from "../apps/web/app/shared/explanationQuality";
import { buildProblemQualityAudit } from "../apps/web/app/shared/problemQuality";

type ExampleExplanation = {
  hint1?: string;
  hint2?: string;
  stepByStep?: string;
  commonMistake?: string;
  whyCorrect?: string;
  variantIdea?: string;
};

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const CONCEPTS_PATH = path.join(APP_DATA_DIR, "concepts.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const ISE_SOURCE = "ise_developmental_math_2e";

const VALID_ANSWER_TYPES = new Set(["numeric", "fraction", "symbolic", "text", "multiple_choice", "manual"]);
const VALID_LAYERS = new Set(["Foundation", "Standard", "Honors", "AMC8", "AMC8 Stretch"]);
const VALID_STAGES = new Set(["Foundation", "Bridge", "Algebra Readiness", "AMC8 Transfer"]);

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const concepts = readJson<Array<{ id: string }>>(CONCEPTS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  const errors: string[] = [];
  const warnings: string[] = [];

  validateProblems(problems, conceptIds, explanations, errors, warnings);
  validateIseCoverage(problems, explanations, errors, warnings);

  const summary = buildSummary(problems, explanations);
  printSummary(summary, warnings, errors);

  if (errors.length > 0) process.exit(1);
}

function validateProblems(
  problems: Problem[],
  conceptIds: Set<string>,
  explanations: Record<string, ExampleExplanation>,
  errors: string[],
  warnings: string[]
) {
  const ids = new Set<string>();

  problems.forEach((problem, index) => {
    const label = problem.id || `problem at index ${index}`;

    if (!problem.id) errors.push(`${label}: id is required`);
    if (ids.has(problem.id)) errors.push(`${problem.id}: duplicate problem id`);
    ids.add(problem.id);

    required(problem.statement, label, "statement", errors);
    required(problem.answer, label, "answer", problem.answerType === "manual" ? warnings : errors);
    required(problem.solution, label, "solution", warnings);
    required(problem.curriculum?.course, label, "curriculum.course", errors);
    required(problem.curriculum?.chapter, label, "curriculum.chapter", errors);
    required(problem.curriculum?.sourceCollection, label, "curriculum.sourceCollection", errors);

    if (!VALID_ANSWER_TYPES.has(problem.answerType)) {
      errors.push(`${label}: invalid answerType ${problem.answerType}`);
    }

    if (!Number.isInteger(problem.difficulty) || problem.difficulty < 1 || problem.difficulty > 5) {
      errors.push(`${label}: difficulty must be an integer from 1 to 5`);
    }

    if (!Array.isArray(problem.concepts) || problem.concepts.length === 0) {
      errors.push(`${label}: at least one concept is required`);
    } else {
      problem.concepts.forEach((concept) => {
        if (!conceptIds.has(concept)) errors.push(`${label}: unknown concept ${concept}`);
      });
    }

    (problem.prerequisiteConcepts ?? []).forEach((concept) => {
      if (!conceptIds.has(concept)) warnings.push(`${label}: unknown prerequisite concept ${concept}`);
    });

    if (!problem.taxonomy) {
      errors.push(`${label}: taxonomy is required`);
    } else {
      if (!VALID_LAYERS.has(problem.taxonomy.layer)) errors.push(`${label}: invalid taxonomy layer ${problem.taxonomy.layer}`);
      if (!VALID_STAGES.has(problem.taxonomy.stage)) errors.push(`${label}: invalid taxonomy stage ${problem.taxonomy.stage}`);
      required(problem.taxonomy.problemType, label, "taxonomy.problemType", errors);

      if (!Array.isArray(problem.taxonomy.cognitiveTags) || problem.taxonomy.cognitiveTags.length === 0) {
        errors.push(`${label}: taxonomy.cognitiveTags must not be empty`);
      }

      if (!Number.isInteger(problem.taxonomy.estimatedTimeSeconds) || problem.taxonomy.estimatedTimeSeconds <= 0) {
        errors.push(`${label}: taxonomy.estimatedTimeSeconds must be a positive integer`);
      }
    }

    validateMultipleChoice(problem, label, errors, warnings);

    if (!explanations[problem.id]) {
      warnings.push(`${label}: no example explanation is linked`);
    }
  });
}

function validateMultipleChoice(problem: Problem, label: string, errors: string[], warnings: string[]) {
  if (problem.answerType !== "multiple_choice") return;

  const choices = normalizeChoices(problem.choices);
  const labels = new Set<string>();

  if (choices.length < 2) errors.push(`${label}: multiple_choice needs at least two choices`);

  choices.forEach((choice) => {
    if (labels.has(choice.label)) errors.push(`${label}: duplicate choice label ${choice.label}`);
    labels.add(choice.label);
  });

  if (!choices.some((choice) => normalize(choice.value) === normalize(problem.answer))) {
    errors.push(`${label}: choices do not include the correct answer ${problem.answer}`);
  }

  const distractors = problem.distractors ?? [];
  const distractorIds = new Set(distractors.map((distractor) => distractor.id));

  choices.forEach((choice) => {
    if (!choice.distractorId) return;
    if (!distractorIds.has(choice.distractorId)) {
      errors.push(`${label}: choice ${choice.label} references missing distractor ${choice.distractorId}`);
    }
  });

  distractors.forEach((distractor) => {
    const choice = choices.find((item) => item.label === distractor.choiceLabel);

    if (!choice) {
      errors.push(`${label}: distractor ${distractor.id} points to missing choice ${distractor.choiceLabel}`);
      return;
    }

    if (normalize(choice.value) !== normalize(distractor.value)) {
      errors.push(`${label}: distractor ${distractor.id} value does not match choice ${choice.label}`);
    }

    if (normalize(distractor.value) === normalize(problem.answer)) {
      errors.push(`${label}: distractor ${distractor.id} matches the correct answer`);
    }

    required(distractor.misconception, label, `distractor ${distractor.id} misconception`, errors);
    required(distractor.cognitiveTag, label, `distractor ${distractor.id} cognitiveTag`, errors);
    required(distractor.explanation, label, `distractor ${distractor.id} explanation`, warnings);
  });

  const wrongChoiceCount = choices.filter((choice) => normalize(choice.value) !== normalize(problem.answer)).length;
  if (distractors.length < wrongChoiceCount) {
    warnings.push(`${label}: has ${wrongChoiceCount} wrong choices but only ${distractors.length} distractors`);
  }
}

function validateIseCoverage(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>,
  errors: string[],
  warnings: string[]
) {
  const iseProblems = problems.filter((problem) => problem.curriculum?.sourceCollection === ISE_SOURCE);
  const byCourse = countBy(iseProblems, (problem) => problem.curriculum.course);
  const byStage = countBy(iseProblems, (problem) => problem.taxonomy?.stage ?? "");
  const byLayer = countBy(iseProblems, (problem) => problem.taxonomy?.layer ?? "");
  const byChapter = countBy(iseProblems, (problem) => problem.curriculum.chapter);

  assertAtLeast(iseProblems.length, 1000, "ISE problem count", errors);
  assertAtLeast(Object.keys(byChapter).length, 20, "ISE chapter count", errors);
  assertAtLeast(byCourse["Pre-Algebra"] ?? 0, 500, "ISE Pre-Algebra coverage", errors);
  assertAtLeast(byCourse["Algebra 1"] ?? 0, 350, "ISE Algebra 1 readiness coverage", errors);
  assertAtLeast(byStage["Foundation"] ?? 0, 250, "ISE Foundation stage coverage", errors);
  assertAtLeast(byStage["AMC8 Transfer"] ?? 0, 250, "ISE AMC8 Transfer stage coverage", errors);
  assertAtLeast(byStage["Algebra Readiness"] ?? 0, 400, "ISE Algebra Readiness stage coverage", errors);
  assertAtLeast(byLayer.Foundation ?? 0, 300, "ISE Foundation layer coverage", errors);
  assertAtLeast(byLayer.Standard ?? 0, 350, "ISE Standard layer coverage", errors);
  assertAtLeast(byLayer.Honors ?? 0, 200, "ISE Honors layer coverage", errors);

  Object.entries(byChapter).forEach(([chapter, count]) => {
    if (count < 16) warnings.push(`${chapter}: low ISE chapter coverage (${count} problems)`);
  });

  iseProblems.forEach((problem) => {
    const explanation = explanations[problem.id];
    if (!explanation) {
      errors.push(`${problem.id}: ISE problem is missing an explanation template`);
      return;
    }

    required(explanation.hint1, problem.id, "explanation.hint1", warnings);
    required(explanation.hint2, problem.id, "explanation.hint2", warnings);
    required(explanation.stepByStep, problem.id, "explanation.stepByStep", errors);
    required(explanation.commonMistake, problem.id, "explanation.commonMistake", warnings);
    required(explanation.whyCorrect, problem.id, "explanation.whyCorrect", warnings);
  });
}

function buildSummary(problems: Problem[], explanations: Record<string, ExampleExplanation>) {
  const iseProblems = problems.filter((problem) => problem.curriculum?.sourceCollection === ISE_SOURCE);
  const explanationQuality = summarizeExplanationQuality(problems, explanations);
  const explanationReviewQueue = buildExplanationReviewQueue(problems, explanations);
  const qualityAudit = buildProblemQualityAudit(problems, explanations);

  return {
    totalProblems: problems.length,
    autoGradable: problems.filter((problem) => problem.isAutoGradable).length,
    multipleChoice: problems.filter((problem) => problem.answerType === "multiple_choice").length,
    explanations: Object.keys(explanations).length,
    courses: countBy(problems, (problem) => problem.curriculum?.course ?? ""),
    stages: countBy(problems, (problem) => problem.taxonomy?.stage ?? ""),
    layers: countBy(problems, (problem) => problem.taxonomy?.layer ?? ""),
    explanationQuality,
    explanationReviewQueue,
    qualityAudit,
    ise: {
      total: iseProblems.length,
      chapters: Object.keys(countBy(iseProblems, (problem) => problem.curriculum.chapter)).length,
      courses: countBy(iseProblems, (problem) => problem.curriculum.course),
      stages: countBy(iseProblems, (problem) => problem.taxonomy?.stage ?? ""),
      layers: countBy(iseProblems, (problem) => problem.taxonomy?.layer ?? "")
    }
  };
}

function printSummary(summary: ReturnType<typeof buildSummary>, warnings: string[], errors: string[]) {
  console.log("Problem quality check");
  console.log(`- Problems: ${summary.totalProblems}`);
  console.log(`- Auto-gradable: ${summary.autoGradable}`);
  console.log(`- Multiple choice: ${summary.multipleChoice}`);
  console.log(`- Explanations: ${summary.explanations}`);
  console.log(`- Explanation quality avg: ${summary.explanationQuality.averageScore}/100`);
  console.log(`- Explanation quality: ${formatCounts(summary.explanationQuality.counts)}`);
  console.log(`- Explanation review queue: ${summary.explanationReviewQueue.totalReviewItems}`);
  console.log(`- Quality readiness score: ${summary.qualityAudit.readinessScore}/100`);
  console.log(`- Full distractor coverage: ${summary.qualityAudit.fullDistractorCoverage}/${summary.qualityAudit.multipleChoice}`);
  console.log(`- Remote assets: ${summary.qualityAudit.remoteAssets}`);
  console.log(`- Thin chapters (<20 problems): ${summary.qualityAudit.thinChapters.length}`);
  console.log(`- Thin concepts (<5 problems): ${summary.qualityAudit.thinConcepts.length}`);
  console.log(`- ISE problems: ${summary.ise.total}`);
  console.log(`- ISE chapters: ${summary.ise.chapters}`);
  console.log(`- ISE courses: ${formatCounts(summary.ise.courses)}`);
  console.log(`- ISE stages: ${formatCounts(summary.ise.stages)}`);
  console.log(`- ISE layers: ${formatCounts(summary.ise.layers)}`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Errors: ${errors.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings");
    warnings.slice(0, 25).forEach((warning) => console.log(`- ${warning}`));
    if (warnings.length > 25) console.log(`- ... ${warnings.length - 25} more warning(s)`);
  }

  if (summary.explanationReviewQueue.batches.length > 0) {
    console.log("\nTop explanation review batches");
    summary.explanationReviewQueue.batches.slice(0, 5).forEach((batch, index) => {
      const issues = batch.topIssues.map((item) => `${item.issue} (${item.count})`).join("; ");
      console.log(
        `${index + 1}. ${batch.title} | ${batch.sourceCollection} | ${batch.count} item(s) | avg ${batch.averageScore}/100 | priority ${batch.priorityScore}${issues ? ` | ${issues}` : ""}`
      );
    });
  }

  if (summary.qualityAudit.thinChapters.length > 0) {
    console.log("\nTop chapter backfill targets");
    summary.qualityAudit.thinChapters.slice(0, 8).forEach((chapter, index) => {
      console.log(`${index + 1}. ${chapter.course} · ${chapter.chapterTitle} | ${chapter.count}/20 | ${chapter.sourceCollection}`);
    });
  }

  if (summary.qualityAudit.thinConcepts.length > 0) {
    console.log("\nTop concept backfill targets");
    summary.qualityAudit.thinConcepts.slice(0, 8).forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.concept} | ${concept.count}/5`);
    });
  }

  if (summary.qualityAudit.nextQualityMoves.length > 0) {
    console.log("\nRecommended quality moves");
    summary.qualityAudit.nextQualityMoves.forEach((move, index) => {
      console.log(`${index + 1}. [${move.priority}] ${move.title} | ${move.label} | ${move.reason}`);
    });
  }

  if (errors.length > 0) {
    console.log("\nErrors");
    errors.forEach((error) => console.log(`- ${error}`));
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function normalizeChoices(choices: Problem["choices"]): AnswerChoice[] {
  return (choices ?? []).map((choice, index) => {
    if (typeof choice === "string") {
      return {
        label: String.fromCharCode(65 + index),
        value: choice,
        text: choice
      };
    }

    return choice;
  });
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || "(blank)";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function assertAtLeast(actual: number, expected: number, label: string, errors: string[]) {
  if (actual < expected) errors.push(`${label}: expected at least ${expected}, found ${actual}`);
}

function required(value: unknown, label: string, field: string, collection: string[]) {
  if (value === undefined || value === null || value === "") collection.push(`${label}: ${field} is required`);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function formatCounts(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => `${key} ${count}`)
    .join(", ");
}

main();
