import type { Distractor, Problem, RecommendationExplanation } from "../../../../packages/adaptive-engine";

export type SimulationLog = {
  step: number;
  problem: string;
  statement: string;
  concepts: string[];
  difficulty: number;
  taxonomy?: Problem["taxonomy"];
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Distractor;
  diagnosticSlot?: string;
  diagnosticStage?: string;
  assessmentGoal?: string;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts?: string[];
  prerequisiteGaps?: Array<{
    concept: string;
    targetConcept: string;
    depth: number;
    mastery: number;
  }>;
  remediation: boolean;
  nextProblem: string;
  mastery: Record<string, number>;
  recommendationReason: string;
  recommendationExplanation?: RecommendationExplanation;
  recommendationScore?: number;
  responseTimeSeconds?: number;
  confidence?: number;
};
