export type PracticeProblem = {
  id: string;
  statement: string;
  answer: string;
  choices: string[];
  difficulty: number;
  concepts: string[];
  conceptLabel: string;
  conceptLabels: Record<string, string>;
  skills: string[];
  patterns: string[];
  misconception?: string;
  misconceptionFeedback: string;
  hint: string;
  explanation: string;
  answerType?: string;
  isAutoGradable?: boolean;
  source?: string;
  course?: string;
  asset?: { url: string; alt: string };
  reviewStatus: "draft" | "reviewed" | "imported";
};

export type ProblemBank = {
  totalRecords: number;
  skippedRecords: number;
  problems: PracticeProblem[];
};
