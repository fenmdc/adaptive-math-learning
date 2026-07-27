import { getProblemLanguage } from "../learning-catalog";
import { adaptLegacyProblem, loadLegacyProblems, type LegacyProblem } from "../problem-bank/legacy";
import type { MockExamConfig, MockExamPaper } from "./scoring";

export { scoreMockExam } from "./scoring";
export type { MockExamConfig, MockExamId, MockExamPaper } from "./scoring";

export const MOCK_EXAMS: MockExamConfig[] = [
  {
    id: "sat-math",
    title: "SAT Math Simulation",
    shortTitle: "SAT Math",
    course: "SAT Math",
    questionCount: 44,
    timeMinutes: 70,
    format: "33 multiple-choice and 11 student-produced responses",
    scoring: "accuracy",
    modules: [
      { title: "Math Module 1", questionCount: 22, timeMinutes: 35 },
      { title: "Math Module 2", questionCount: 22, timeMinutes: 35 },
    ],
  },
  {
    id: "amc8",
    title: "AMC 8 Simulation",
    shortTitle: "AMC 8",
    course: "AMC8",
    questionCount: 25,
    timeMinutes: 40,
    format: "25 multiple-choice questions",
    scoring: "amc8",
    modules: [{ title: "AMC 8 Contest", questionCount: 25, timeMinutes: 40 }],
  },
  {
    id: "amc10",
    title: "AMC 10 Simulation",
    shortTitle: "AMC 10",
    course: "AMC10",
    questionCount: 25,
    timeMinutes: 75,
    format: "25 multiple-choice questions",
    scoring: "amc-advanced",
    modules: [{ title: "AMC 10 Contest", questionCount: 25, timeMinutes: 75 }],
  },
  {
    id: "amc12",
    title: "AMC 12 Simulation",
    shortTitle: "AMC 12",
    course: "AMC12",
    questionCount: 25,
    timeMinutes: 75,
    format: "25 multiple-choice questions",
    scoring: "amc-advanced",
    modules: [{ title: "AMC 12 Contest", questionCount: 25, timeMinutes: 75 }],
  },
];

export function getMockExamConfig(id: string | undefined) {
  return MOCK_EXAMS.find((exam) => exam.id === id);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function selectSeeded(problems: LegacyProblem[], count: number, seed: string) {
  return problems
    .map((problem) => ({ problem, rank: hash(`${seed}:${problem.id}`) }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, count)
    .map(({ problem }) => problem);
}

export function createMockExamPaper(config: MockExamConfig, seed = `${config.id}:default`, root = process.cwd()): MockExamPaper {
  const eligible = loadLegacyProblems(root)
    .filter((problem) => getProblemLanguage(problem) === "en")
    .filter((problem) => problem.curriculum?.course === config.course)
    .filter((problem) => problem.isAutoGradable);
  let selected: LegacyProblem[];

  if (config.id === "sat-math") {
    const multipleChoice = selectSeeded(eligible.filter((problem) => problem.answerType === "multiple_choice"), 33, `${seed}:mc`);
    const producedResponse = selectSeeded(
      eligible.filter((problem) => ["numeric", "fraction", "symbolic"].includes(problem.answerType)),
      11,
      `${seed}:spr`,
    );
    selected = [...multipleChoice, ...producedResponse];
  } else {
    selected = selectSeeded(eligible.filter((problem) => problem.answerType === "multiple_choice"), config.questionCount, seed)
      .sort((left, right) => left.difficulty - right.difficulty || left.id.localeCompare(right.id));
  }

  return {
    config,
    seed,
    problems: selected.slice(0, config.questionCount).map((problem) => adaptLegacyProblem(problem, root)),
  };
}
