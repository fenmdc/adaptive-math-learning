import type { SimulationLog } from "./types";
import problemsData from "../../data/problems.json";
import type { Problem } from "../../../../packages/adaptive-engine";
import { initialAssessmentBlueprint, selectDiagnosticProblems, type AssessmentSlot } from "../diagnostic/initialAssessment";

export type ConceptSummary = {
  concept: string;
  score: number;
  weakCount: number;
};

export type SessionSummary = {
  attempts: number;
  accuracy: number;
  remediationCount: number;
  averageResponseTimeSeconds: number;
  averageConfidence: number;
  strongConcepts: ConceptSummary[];
  weakConcepts: ConceptSummary[];
  nextRecommendation: string;
};

export type DomainProfile = {
  domain: string;
  attempts: number;
  accuracy: number;
  averageMastery: number;
  readiness: "Ready" | "Developing" | "Needs Review";
  concepts: string[];
  weakConcepts: string[];
  strands: string[];
};

export function summarizeSession(logs: SimulationLog[]): SessionSummary {
  const attempts = logs.length;
  const correctCount = logs.filter((log) => log.correct).length;
  const remediationCount = logs.filter((log) => log.remediation).length;
  const averageResponseTimeSeconds = average(logs.map((log) => log.responseTimeSeconds ?? 0).filter(Boolean));
  const averageConfidence = average(logs.map((log) => log.confidence ?? 0).filter(Boolean));
  const latestMastery = logs.at(-1)?.mastery ?? {};
  const weakCounts = countWeakConcepts(logs);
  const conceptSummaries = Object.entries(latestMastery)
    .map(([concept, score]) => ({
      concept,
      score,
      weakCount: weakCounts[concept] ?? 0
    }))
    .sort((a, b) => a.score - b.score);

  const weakConcepts = conceptSummaries
    .filter((item) => item.score < 0.55 || item.weakCount > 0)
    .sort((a, b) => b.weakCount - a.weakCount || a.score - b.score)
    .slice(0, 4);

  const strongConcepts = [...conceptSummaries]
    .filter((item) => item.score >= 0.62 && item.weakCount === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    attempts,
    accuracy: attempts === 0 ? 0 : Math.round((correctCount / attempts) * 100),
    remediationCount,
    averageResponseTimeSeconds,
    averageConfidence,
    strongConcepts,
    weakConcepts,
    nextRecommendation: buildNextRecommendation(weakConcepts, strongConcepts, remediationCount)
  };
}

export function summarizeDomainProfile(logs: SimulationLog[]): DomainProfile[] {
  const slotById = Object.fromEntries(initialAssessmentBlueprint.map((slot) => [slot.id, slot]));
  const slotByProblem = Object.fromEntries(
    selectDiagnosticProblems(initialAssessmentBlueprint, problemsData as Problem[]).map((item) => [
      item.problem.id,
      item.slot
    ])
  );
  const groups: Record<string, SimulationLog[]> = {};

  logs.forEach((log) => {
    const slot = getLogSlot(log, slotById, slotByProblem);
    const domain = slot?.domain ?? inferDomain(log.concepts[0]);
    groups[domain] = [...(groups[domain] ?? []), log];
  });

  return Object.entries(groups)
    .map(([domain, domainLogs]) => {
      const correctCount = domainLogs.filter((log) => log.correct).length;
      const concepts = unique(domainLogs.flatMap((log) => log.concepts));
      const weakConcepts = unique(domainLogs.flatMap((log) => log.weakConcepts));
      const strands = unique(
        domainLogs
          .map((log) => getLogSlot(log, slotById, slotByProblem)?.strand)
          .filter((strand): strand is string => Boolean(strand))
      );
      const latestMastery = domainLogs.at(-1)?.mastery ?? {};
      const masteryValues = concepts.map((concept) => latestMastery[concept] ?? 0.5);
      const averageMastery = average(masteryValues);
      const accuracy = Math.round((correctCount / domainLogs.length) * 100);

      return {
        domain,
        attempts: domainLogs.length,
        accuracy,
        averageMastery,
        readiness: getReadiness(accuracy, averageMastery, weakConcepts.length),
        concepts,
        weakConcepts,
        strands
      };
    })
    .sort((a, b) => readinessRank(a.readiness) - readinessRank(b.readiness) || a.domain.localeCompare(b.domain));
}

function getLogSlot(
  log: SimulationLog,
  slotById: Record<string, AssessmentSlot>,
  slotByProblem: Record<string, AssessmentSlot>
) {
  return (log.diagnosticSlot ? slotById[log.diagnosticSlot] : undefined) ?? slotByProblem[log.problem];
}

function countWeakConcepts(logs: SimulationLog[]) {
  const counts: Record<string, number> = {};

  logs.forEach((log) => {
    log.weakConcepts.forEach((concept) => {
      counts[concept] = (counts[concept] ?? 0) + 1;
    });
  });

  return counts;
}

function inferDomain(concept: string | undefined) {
  if (!concept) return "Unclassified";
  if (concept.startsWith("arith_")) return "Arithmetic";
  if (concept.startsWith("prealg_")) return "Pre-Algebra";
  if (concept.startsWith("alg_")) return "Algebra";
  if (concept.startsWith("geo_")) return "Geometry";
  if (concept.startsWith("nt_")) return "Number Theory";
  if (concept.startsWith("counting_")) return "Counting & Probability";
  if (concept.startsWith("stats_")) return "Statistics";
  return "Unclassified";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getReadiness(accuracy: number, averageMastery: number, weakCount: number): DomainProfile["readiness"] {
  if (accuracy >= 75 && averageMastery >= 0.62 && weakCount === 0) return "Ready";
  if (accuracy >= 50 && averageMastery >= 0.45) return "Developing";
  return "Needs Review";
}

function readinessRank(readiness: DomainProfile["readiness"]) {
  if (readiness === "Needs Review") return 0;
  if (readiness === "Developing") return 1;
  return 2;
}

function buildNextRecommendation(
  weakConcepts: ConceptSummary[],
  strongConcepts: ConceptSummary[],
  remediationCount: number
) {
  if (weakConcepts.length > 0) {
    const primary = weakConcepts[0];
    return `Start with ${primary.concept}: mastery is ${Math.round(
      primary.score * 100
    )}% and it appeared as a weak concept ${primary.weakCount} time(s).`;
  }

  if (remediationCount > 0) {
    return "Review the remediation steps, then try a short mixed practice set.";
  }

  if (strongConcepts.length > 0) {
    return `Build on ${strongConcepts[0].concept} with a slightly harder follow-up problem.`;
  }

  return "Complete a few practice problems to generate a learning recommendation.";
}
