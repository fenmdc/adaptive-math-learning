export type AnswerCheckResult = {
  correct: boolean;
  comparable: boolean;
  normalizedExpected: string;
  normalizedSubmitted: string;
  reason: string;
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
