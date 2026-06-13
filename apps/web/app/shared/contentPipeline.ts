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
  chapterCount: number;
  stageCount: number;
  layerCount: number;
};

export type ContentPipelineReport = {
  generatedAt: string;
  readinessScore: number;
  status: "Ready" | "Watch" | "Needs Repair";
  summary: string;
  problemQuality: ProblemQualityAudit;
  staging: StagingSnapshot;
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
  const readinessScore = scorePipeline(problemQuality, diagnosticGate, staging);
  const status = pipelineStatus(readinessScore);
  const nextActions = buildNextActions(problemQuality, diagnosticGate, staging);

  return {
    generatedAt: new Date().toISOString(),
    readinessScore,
    status,
    summary: buildSummary(status, readinessScore, problemQuality, diagnosticGate, staging),
    problemQuality,
    staging,
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
    .map(([sourceCollection, items]) => ({
      sourceCollection,
      problems: items.length,
      autoGradableRate: percent(items.filter((problem) => problem.isAutoGradable).length, items.length),
      explanationRate: percent(items.filter((problem) => Boolean(explanations[problem.id])).length, items.length),
      chapterCount: new Set(items.map((problem) => problem.curriculum.chapter)).size,
      stageCount: new Set(items.map((problem) => problem.taxonomy?.stage ?? "Unlabeled")).size,
      layerCount: new Set(items.map((problem) => problem.taxonomy?.layer ?? "Unlabeled")).size
    }))
    .sort((a, b) => b.problems - a.problems || a.sourceCollection.localeCompare(b.sourceCollection));
}

function scorePipeline(
  problemQuality: ProblemQualityAudit,
  diagnosticGate: ContentPipelineReport["diagnosticGate"],
  staging: StagingSnapshot
) {
  const diagnosticScore = diagnosticGate.ready ? 100 : percent(diagnosticGate.selectedSlots, diagnosticGate.totalSlots);
  const stagingPenalty = staging.problemRows > 0 ? 3 : 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(problemQuality.readinessScore * 0.72 + diagnosticScore * 0.23 + 5 - stagingPenalty)
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
  staging: StagingSnapshot
) {
  return `${status}: pipeline readiness ${readinessScore}/100, problem quality ${problemQuality.readinessScore}/100, diagnostic slots ${diagnosticGate.selectedSlots}/${diagnosticGate.totalSlots}, staging rows ${staging.problemRows}.`;
}

function buildNextActions(
  problemQuality: ProblemQualityAudit,
  diagnosticGate: ContentPipelineReport["diagnosticGate"],
  staging: StagingSnapshot
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

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      title: "Prepare the next source batch",
      reason: "The current production bank is healthy; the next useful step is controlled source expansion."
    });
  }

  return actions.slice(0, 5);
}
