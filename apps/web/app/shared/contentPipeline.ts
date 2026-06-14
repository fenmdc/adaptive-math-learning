import type { Problem } from "../../../../packages/adaptive-engine";
import { auditDiagnosticBlueprint, initialAssessmentBlueprint, selectDiagnosticProblems } from "../diagnostic/initialAssessment";
import { DIAGNOSTIC_CALIBRATION_TARGETS } from "./diagnosticCalibration";
import { type ExampleExplanation } from "./explanationQuality";
import { buildProblemQualityAudit, percent, type ProblemQualityAudit } from "./problemQuality";

export type StagingSnapshot = {
  distractorRows: number;
  explanationRows: number;
  problemRows: number;
};

export type SourceCollectionHealth = {
  sourceCollection: string;
  problems: number;
  autoGradableRate: number;
  explanationRate: number;
  distractorCoverageRate: number;
  localAssetRate: number;
  chapterCount: number;
  stageCount: number;
  layerCount: number;
  status: "ready" | "watch" | "repair";
};

export type ContentPipelineReport = {
  generatedAt: string;
  readinessScore: number;
  status: "Ready" | "Watch" | "Needs Repair";
  summary: string;
  problemQuality: ProblemQualityAudit;
  staging: StagingSnapshot;
  gates: Array<{
    key: string;
    label: string;
    score: number;
    status: "ready" | "watch" | "repair";
    target: string;
    detail: string;
  }>;
  importReadiness: {
    ready: boolean;
    status: "Ready for next batch" | "Prepare with caution" | "Hold imports";
    checklist: Array<{
      label: string;
      passed: boolean;
      detail: string;
    }>;
  };
  diagnosticGate: {
    selectedSlots: number;
    totalSlots: number;
    stageCoverage: Array<{ stage: string; selected: number; expected: number; minimum: number }>;
    ready: boolean;
  };
  sourceCollections: SourceCollectionHealth[];
  nextActions: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    reason: string;
  }>;
};

export function buildContentPipelineReport({
  explanations,
  problems,
  staging
}: {
  explanations: Record<string, ExampleExplanation>;
  problems: Problem[];
  staging: StagingSnapshot;
}): ContentPipelineReport {
  const problemQuality = buildProblemQualityAudit(problems, explanations);
  const diagnosticGate = buildDiagnosticGate(problems);
  const sourceCollections = buildSourceCollectionHealth(problems, explanations);
  const gates = buildPipelineGates(problemQuality, diagnosticGate, staging);
  const importReadiness = buildImportReadiness(gates, staging);
  const readinessScore = scorePipeline(gates);
  const status = pipelineStatus(readinessScore);
  const nextActions = buildNextActions(problemQuality, diagnosticGate, staging, importReadiness);

  return {
    generatedAt: new Date().toISOString(),
    readinessScore,
    status,
    summary: buildSummary(status, readinessScore, problemQuality, diagnosticGate, staging, importReadiness),
    problemQuality,
    staging,
    gates,
    importReadiness,
    diagnosticGate,
    sourceCollections,
    nextActions
  };
}

function buildDiagnosticGate(problems: Problem[]): ContentPipelineReport["diagnosticGate"] {
  const selectedItems = selectDiagnosticProblems(initialAssessmentBlueprint, problems);
  const audit = auditDiagnosticBlueprint(initialAssessmentBlueprint, problems, selectedItems);
  const stageCoverage = DIAGNOSTIC_CALIBRATION_TARGETS.map((target) => {
    const selected = audit.stageCounts[target.stage] ?? 0;
    const expected = audit.expectedSlotsByStage[target.stage] ?? target.minEvidenceSlots;

    return {
      stage: target.stage,
      selected,
      expected,
      minimum: target.minEvidenceSlots
    };
  });

  return {
    selectedSlots: audit.selectedCount,
    totalSlots: audit.slotCount,
    stageCoverage,
    ready: audit.missingFallbacks.length === 0 && stageCoverage.every((stage) => stage.selected >= stage.minimum)
  };
}

function buildSourceCollectionHealth(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
): SourceCollectionHealth[] {
  const groups = new Map<string, Problem[]>();

  problems.forEach((problem) => {
    const key = problem.curriculum.sourceCollection || problem.source || "unknown";
    groups.set(key, [...(groups.get(key) ?? []), problem]);
  });

  return [...groups.entries()]
    .map(([sourceCollection, items]) => {
      const multipleChoiceItems = items.filter((problem) => problem.answerType === "multiple_choice");
      const explanationRate = percent(items.filter((problem) => Boolean(explanations[problem.id])).length, items.length);
      const autoGradableRate = percent(items.filter((problem) => problem.isAutoGradable).length, items.length);
      const distractorCoverageRate =
        multipleChoiceItems.length > 0
          ? percent(multipleChoiceItems.filter(hasFullDistractorCoverage).length, multipleChoiceItems.length)
          : 100;
      const localAssetRate = percent(
        items.filter((problem) => (problem.assets ?? []).every((asset) => !/^https?:\/\//i.test(asset.url))).length,
        items.length
      );
      const healthScore = Math.round(
        autoGradableRate * 0.28 + explanationRate * 0.28 + distractorCoverageRate * 0.24 + localAssetRate * 0.2
      );

      return {
        sourceCollection,
        problems: items.length,
        autoGradableRate,
        explanationRate,
        distractorCoverageRate,
        localAssetRate,
        chapterCount: new Set(items.map((problem) => problem.curriculum.chapter)).size,
        stageCount: new Set(items.map((problem) => problem.taxonomy?.stage ?? "Unlabeled")).size,
        layerCount: new Set(items.map((problem) => problem.taxonomy?.layer ?? "Unlabeled")).size,
        status: gateStatus(healthScore)
      };
    })
    .sort((a, b) => b.problems - a.problems || a.sourceCollection.localeCompare(b.sourceCollection));
}

function buildPipelineGates(
  problemQuality: ProblemQualityAudit,
  diagnosticGate: ContentPipelineReport["diagnosticGate"],
  staging: StagingSnapshot
) {
  const autoGradableRate = percent(problemQuality.autoGradable, problemQuality.totalProblems);
  const correctChoiceRate = percent(problemQuality.answerReadyMultipleChoice, problemQuality.multipleChoice);
  const distractorRate = percent(problemQuality.fullDistractorCoverage, problemQuality.multipleChoice);
  const chapterCoverageRate = percent(problemQuality.chapterCount - problemQuality.thinChapters.length, problemQuality.chapterCount);
  const conceptCoverageRate = percent(problemQuality.conceptCount - problemQuality.thinConcepts.length, problemQuality.conceptCount);
  const localAssetRate = percent(problemQuality.totalProblems - problemQuality.remoteAssets, problemQuality.totalProblems);
  const diagnosticScore = diagnosticGate.ready ? 100 : percent(diagnosticGate.selectedSlots, diagnosticGate.totalSlots);
  const stagingScore = staging.problemRows === 0 ? 100 : staging.problemRows <= 50 ? 82 : 68;

  return [
    buildGate("auto-gradability", "Auto-Gradability", autoGradableRate, "100% auto-checkable", `${problemQuality.autoGradable}/${problemQuality.totalProblems} active problems are auto-gradable.`),
    buildGate("multiple-choice-answer-key", "Multiple Choice Keys", correctChoiceRate, "100% answer included in choices", `${problemQuality.answerReadyMultipleChoice}/${problemQuality.multipleChoice} multiple-choice problems include the normalized correct answer.`),
    buildGate("distractor-coverage", "Distractor Coverage", distractorRate, "100% wrong choices explained", `${problemQuality.fullDistractorCoverage}/${problemQuality.multipleChoice} multiple-choice problems have full distractor coverage.`),
    buildGate("explanation-quality", "Explanation Quality", problemQuality.explanationQuality.averageScore, "95+/100 average quality", `${problemQuality.explanationQuality.counts.complete}/${problemQuality.totalProblems} explanations are complete.`),
    buildGate("asset-locality", "Offline Asset Locality", localAssetRate, "100% local image assets", `${problemQuality.remoteAssets} remote asset(s) remain.`),
    buildGate("chapter-coverage", "Chapter Coverage Floor", chapterCoverageRate, "20+ problems per chapter", `${problemQuality.thinChapters.length}/${problemQuality.chapterCount} chapter(s) are below the coverage floor.`),
    buildGate("concept-coverage", "Concept Coverage Floor", conceptCoverageRate, "5+ problems per concept", `${problemQuality.thinConcepts.length}/${problemQuality.conceptCount} concept(s) are below the coverage floor.`),
    buildGate("diagnostic-calibration", "Diagnostic Calibration", diagnosticScore, "All calibrated slots filled", `${diagnosticGate.selectedSlots}/${diagnosticGate.totalSlots} diagnostic slots selected.`),
    buildGate("staging-hygiene", "Staging Hygiene", stagingScore, "0 active rows after promotion", `${staging.problemRows} problem row(s), ${staging.distractorRows} distractor row(s), and ${staging.explanationRows} explanation row(s) are currently staged.`)
  ];
}

function buildGate(
  key: string,
  label: string,
  score: number,
  target: string,
  detail: string
): ContentPipelineReport["gates"][number] {
  return {
    key,
    label,
    score,
    status: gateStatus(score),
    target,
    detail
  };
}

function gateStatus(score: number): "ready" | "watch" | "repair" {
  if (score >= 95) return "ready";
  if (score >= 82) return "watch";
  return "repair";
}

function buildImportReadiness(
  gates: ContentPipelineReport["gates"],
  staging: StagingSnapshot
): ContentPipelineReport["importReadiness"] {
  const requiredGateKeys = new Set([
    "auto-gradability",
    "multiple-choice-answer-key",
    "distractor-coverage",
    "explanation-quality",
    "diagnostic-calibration",
    "staging-hygiene"
  ]);
  const requiredGates = gates.filter((gate) => requiredGateKeys.has(gate.key));
  const repairGates = requiredGates.filter((gate) => gate.status === "repair");
  const watchGates = requiredGates.filter((gate) => gate.status === "watch");
  const ready = repairGates.length === 0 && staging.problemRows === 0;

  return {
    ready,
    status: ready && watchGates.length === 0 ? "Ready for next batch" : ready ? "Prepare with caution" : "Hold imports",
    checklist: [
      {
        label: "Active staging is clean",
        passed: staging.problemRows === 0 && staging.distractorRows === 0 && staging.explanationRows === 0,
        detail: `${staging.problemRows} problem row(s) are waiting in active staging.`
      },
      {
        label: "No repair-level production gates",
        passed: repairGates.length === 0,
        detail: repairGates.length === 0 ? "All required gates are watch or ready." : `${repairGates.length} required gate(s) need repair.`
      },
      {
        label: "Diagnostic remains calibrated",
        passed: gates.find((gate) => gate.key === "diagnostic-calibration")?.status === "ready",
        detail: gates.find((gate) => gate.key === "diagnostic-calibration")?.detail ?? "Diagnostic gate not available."
      },
      {
        label: "Explanations and distractors are production-ready",
        passed: ["explanation-quality", "distractor-coverage"].every(
          (key) => gates.find((gate) => gate.key === key)?.status === "ready"
        ),
        detail: "Practice feedback quality should remain complete before adding more source rows."
      }
    ]
  };
}

function scorePipeline(gates: ContentPipelineReport["gates"]) {
  const weights: Record<string, number> = {
    "auto-gradability": 0.12,
    "multiple-choice-answer-key": 0.12,
    "distractor-coverage": 0.14,
    "explanation-quality": 0.16,
    "asset-locality": 0.08,
    "chapter-coverage": 0.1,
    "concept-coverage": 0.08,
    "diagnostic-calibration": 0.14,
    "staging-hygiene": 0.06
  };
  const weightedScore = gates.reduce((sum, gate) => sum + gate.score * (weights[gate.key] ?? 0), 0);

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(weightedScore)
    )
  );
}

function pipelineStatus(score: number): ContentPipelineReport["status"] {
  if (score >= 95) return "Ready";
  if (score >= 82) return "Watch";
  return "Needs Repair";
}

function buildSummary(
  status: ContentPipelineReport["status"],
  readinessScore: number,
  problemQuality: ProblemQualityAudit,
  diagnosticGate: ContentPipelineReport["diagnosticGate"],
  staging: StagingSnapshot,
  importReadiness: ContentPipelineReport["importReadiness"]
) {
  return `${status}: pipeline readiness ${readinessScore}/100, problem quality ${problemQuality.readinessScore}/100, diagnostic slots ${diagnosticGate.selectedSlots}/${diagnosticGate.totalSlots}, staging rows ${staging.problemRows}, import status ${importReadiness.status}.`;
}

function buildNextActions(
  problemQuality: ProblemQualityAudit,
  diagnosticGate: ContentPipelineReport["diagnosticGate"],
  staging: StagingSnapshot,
  importReadiness: ContentPipelineReport["importReadiness"]
): ContentPipelineReport["nextActions"] {
  const actions: ContentPipelineReport["nextActions"] = [];

  if (!diagnosticGate.ready) {
    actions.push({
      priority: "high",
      title: "Repair diagnostic blueprint coverage",
      reason: "At least one diagnostic stage is below its minimum calibrated evidence target."
    });
  }

  if (problemQuality.nextQualityMoves.length > 0) {
    problemQuality.nextQualityMoves.slice(0, 3).forEach((move) => {
      actions.push({
        priority: move.priority,
        title: move.title,
        reason: move.reason
      });
    });
  }

  if (staging.problemRows > 0) {
    actions.push({
      priority: "medium",
      title: "Review current staging batch",
      reason: `${staging.problemRows} problem row(s), ${staging.distractorRows} distractor row(s), and ${staging.explanationRows} explanation row(s) are present in staging.`
    });
  }

  if (!importReadiness.ready) {
    actions.push({
      priority: "medium",
      title: "Clear import readiness blockers",
      reason: importReadiness.checklist.find((item) => !item.passed)?.detail ?? "At least one import readiness check is not passing."
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      title: "Prepare the next source batch",
      reason: "The current production bank is healthy; the next useful step is controlled source expansion."
    });
  }

  return actions.slice(0, 5);
}

function hasFullDistractorCoverage(problem: Problem) {
  const choices = normalizeChoices(problem.choices);
  const wrongChoices = choices.filter((choice) => normalize(choice.value) !== normalize(problem.answer));
  const distractors = problem.distractors ?? [];

  return wrongChoices.every((choice) =>
    choice.distractorId
      ? distractors.some((distractor) => distractor.id === choice.distractorId)
      : distractors.some((distractor) => distractor.choiceLabel === choice.label)
  );
}

function normalizeChoices(choices: Problem["choices"]) {
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

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}
