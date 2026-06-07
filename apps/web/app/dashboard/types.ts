export type SimulationLog = {
  step: number;
  problem: string;
  statement: string;
  concepts: string[];
  difficulty: number;
  correct: boolean;
  weakConcepts: string[];
  fluencyConcepts?: string[];
  remediation: boolean;
  nextProblem: string;
  mastery: Record<string, number>;
  recommendationReason: string;
  recommendationScore?: number;
  responseTimeSeconds?: number;
  confidence?: number;
};
