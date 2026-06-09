import type { AnswerChoice, Distractor } from "./index";

export type AnswerCheckResult = {
  correct: boolean;
  comparable: boolean;
  normalizedExpected: string;
  normalizedSubmitted: string;
  reason: string;
  selectedChoiceLabel?: string;
  selectedChoiceValue?: string;
  selectedDistractor?: Distractor;
};

const EPSILON = 1e-9;

export function checkAnswer(submitted: string, expected: string): AnswerCheckResult {
  const normalizedSubmitted = normalizeAnswer(submitted);
  const normalizedExpected = normalizeAnswer(expected);

  if (!normalizedExpected) {
    return {
      correct: false,
      comparable: false,
      normalizedExpected,
      normalizedSubmitted,
      reason: "This problem needs a manually defined answer before automatic checking."
    };
  }

  if (!normalizedSubmitted) {
    return {
      correct: false,
      comparable: true,
      normalizedExpected,
      normalizedSubmitted,
      reason: "No answer was submitted."
    };
  }

  if (normalizedSubmitted === normalizedExpected) {
    return {
      correct: true,
      comparable: true,
      normalizedExpected,
      normalizedSubmitted,
      reason: "Exact normalized match."
    };
  }

  const submittedNumber = parseNumericAnswer(normalizedSubmitted);
  const expectedNumber = parseNumericAnswer(normalizedExpected);

  if (submittedNumber !== null && expectedNumber !== null) {
    const correct = Math.abs(submittedNumber - expectedNumber) < EPSILON;
    return {
      correct,
      comparable: true,
      normalizedExpected,
      normalizedSubmitted,
      reason: correct ? "Numerically equivalent." : "Numeric values differ."
    };
  }

  const submittedExpression = normalizeSymbolicAnswer(normalizedSubmitted);
  const expectedExpression = normalizeSymbolicAnswer(normalizedExpected);
  const correct = submittedExpression === expectedExpression;

  return {
    correct,
    comparable: true,
    normalizedExpected: expectedExpression,
    normalizedSubmitted: submittedExpression,
    reason: correct ? "Equivalent symbolic form." : "Symbolic forms differ."
  };
}

export function checkProblemAnswer(input: {
  submitted: string;
  expected: string;
  choices?: Array<string | AnswerChoice>;
  distractors?: Distractor[];
}): AnswerCheckResult {
  const choice = resolveChoice(input.submitted, input.choices ?? []);
  const submittedAnswer = choice?.value ?? input.submitted;
  const result = checkAnswer(submittedAnswer, input.expected);
  const selectedDistractor = choice?.distractorId
    ? input.distractors?.find((distractor) => distractor.id === choice.distractorId)
    : input.distractors?.find((distractor) => normalizeAnswer(distractor.choiceLabel) === normalizeAnswer(choice?.label ?? ""));

  if (!choice) return result;

  return {
    ...result,
    selectedChoiceLabel: choice.label,
    selectedChoiceValue: choice.value,
    selectedDistractor,
    reason: result.correct
      ? `Choice ${choice.label} matches the expected answer.`
      : selectedDistractor
        ? `Choice ${choice.label} maps to distractor: ${selectedDistractor.misconception}.`
        : `Choice ${choice.label} does not match the expected answer.`
  };
}

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/π/g, "pi")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeSymbolicAnswer(value: string) {
  return value
    .replace(/\*/g, "")
    .replace(/\^1(?!\d)/g, "")
    .replace(/1([a-z])/g, "$1");
}

function parseNumericAnswer(value: string) {
  if (!value) return null;

  const fractionMatch = value.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const piMatch = value.match(/^(-?\d+(?:\.\d+)?|-\d*|\d*)pi$/);
  if (piMatch) {
    const coefficient = parseCoefficient(piMatch[1]);
    return coefficient * Math.PI;
  }

  return null;
}

function parseCoefficient(value: string) {
  if (!value) return 1;
  if (value === "-") return -1;
  return Number(value);
}

function resolveChoice(submitted: string, choices: Array<string | AnswerChoice>) {
  const normalizedSubmitted = normalizeAnswer(submitted);
  if (!normalizedSubmitted || choices.length === 0) return undefined;

  return choices
    .map(normalizeChoice)
    .find((choice) =>
      normalizeAnswer(choice.label) === normalizedSubmitted ||
      normalizeAnswer(choice.value) === normalizedSubmitted ||
      normalizeAnswer(choice.text) === normalizedSubmitted
    );
}

function normalizeChoice(choice: string | AnswerChoice): AnswerChoice {
  if (typeof choice !== "string") return choice;

  const match = choice.match(/^([A-E])[\).\s:-]+(.+)$/i);
  const label = match?.[1]?.toUpperCase() ?? "";
  const value = (match?.[2] ?? choice).trim();

  return {
    label,
    value,
    text: value
  };
}
