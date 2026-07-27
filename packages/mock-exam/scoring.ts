import type { PracticeProblem } from "../problem-bank/types";

export type MockExamId = "sat-math" | "amc8" | "amc10" | "amc12";

export type MockExamConfig = {
  id: MockExamId;
  title: string;
  shortTitle: string;
  course: string;
  questionCount: number;
  timeMinutes: number;
  format: string;
  scoring: "accuracy" | "amc8" | "amc-advanced";
  modules: Array<{ title: string; questionCount: number; timeMinutes: number }>;
};

export type MockExamPaper = {
  config: MockExamConfig;
  seed: string;
  problems: PracticeProblem[];
};

export function normalizeExamAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function scoreMockExam(config: MockExamConfig, problems: PracticeProblem[], answers: Record<string, string>) {
  const correct = problems.filter((problem) => normalizeExamAnswer(answers[problem.id] ?? "") === normalizeExamAnswer(problem.answer)).length;
  const blank = problems.filter((problem) => !normalizeExamAnswer(answers[problem.id] ?? "")).length;
  const incorrect = problems.length - correct - blank;
  const points = config.scoring === "amc-advanced"
    ? correct * 6 + blank * 1.5
    : correct;

  return {
    correct,
    blank,
    incorrect,
    points,
    maxPoints: config.scoring === "amc-advanced" ? problems.length * 6 : problems.length,
    accuracy: problems.length ? Math.round((correct / problems.length) * 100) : 0,
  };
}
