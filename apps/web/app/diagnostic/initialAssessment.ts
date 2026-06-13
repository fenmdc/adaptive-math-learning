import type { Problem } from "../../../../packages/adaptive-engine";
import { buildExpectedSlotsByStage, type CalibrationStage } from "../shared/diagnosticCalibration";

export type AssessmentStage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";

export type AssessmentSlot = {
  id: string;
  stage: AssessmentStage;
  domain: string;
  strand: string;
  goal: string;
  reason: string;
  concepts: string[];
  difficultyRange: [number, number];
  fallbackProblemId: string;
  courseFocus?: string;
  preferredSourceCollection?: string;
  chapterFocus?: string;
  taxonomyStageFocus?: AssessmentStage;
};

export type SelectedAssessmentItem = {
  slot: AssessmentSlot;
  problem: Problem;
  selectionReason: string;
};

export type DiagnosticBlueprintAudit = {
  expectedSlotsByStage: Record<CalibrationStage, number>;
  missingFallbacks: string[];
  selectedCount: number;
  slotCount: number;
  stageCounts: Record<CalibrationStage, number>;
};

export const initialAssessmentBlueprint: AssessmentSlot[] = [
  {
    id: "integer-fluency",
    stage: "Foundation",
    domain: "Arithmetic",
    strand: "Signed-number operations",
    goal: "Check integer fluency before algebraic manipulation.",
    reason: "Sign errors can look like algebra gaps, so this is the first prerequisite anchor.",
    concepts: ["arith_integers"],
    difficultyRange: [1, 2],
    fallbackProblemId: "ise_devmath_integer_001",
    courseFocus: "Pre-Algebra",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-02-integers",
    taxonomyStageFocus: "Foundation"
  },
  {
    id: "fraction-decimal-fluency",
    stage: "Foundation",
    domain: "Arithmetic",
    strand: "Fractions and decimals",
    goal: "Check whether the learner can operate across fraction and decimal forms.",
    reason: "Fractions and decimals sit underneath ratios, probability, slope, and percent work.",
    concepts: ["arith_fractions", "arith_decimals"],
    difficultyRange: [2, 3],
    fallbackProblemId: "ise_devmath_dec_001",
    courseFocus: "Pre-Algebra",
    preferredSourceCollection: "ise_developmental_math_2e",
    taxonomyStageFocus: "Foundation"
  },
  {
    id: "ratio-proportion",
    stage: "Foundation",
    domain: "Arithmetic",
    strand: "Ratios and proportions",
    goal: "Check proportional reasoning through a short rate problem.",
    reason: "Proportional thinking connects Pre-Algebra, linear functions, geometry scale, and AMC8 word problems.",
    concepts: ["arith_ratios", "arith_proportions"],
    difficultyRange: [2, 3],
    fallbackProblemId: "ise_devmath_ratio_001",
    courseFocus: "Pre-Algebra",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-06-ratio-proportion",
    taxonomyStageFocus: "Foundation"
  },
  {
    id: "percent-reasoning",
    stage: "Foundation",
    domain: "Arithmetic",
    strand: "Percent reasoning",
    goal: "Check percent as a multiplicative relationship.",
    reason: "Percent mistakes often reveal fraction, ratio, or decimal conversion gaps.",
    concepts: ["arith_percentages", "arith_ratios"],
    difficultyRange: [2, 3],
    fallbackProblemId: "ise_devmath_percent_001",
    courseFocus: "Pre-Algebra",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-07-percents",
    taxonomyStageFocus: "Foundation"
  },
  {
    id: "exponent-sense",
    stage: "Foundation",
    domain: "Arithmetic",
    strand: "Exponents",
    goal: "Check whether powers are interpreted as repeated multiplication.",
    reason: "Exponent sense supports number theory, scientific notation, and later algebraic rules.",
    concepts: ["arith_exponents"],
    difficultyRange: [2, 3],
    fallbackProblemId: "ise_devmath_sci_001",
    courseFocus: "Pre-Algebra",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-13-exponents-polynomials",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "substitution",
    stage: "Bridge",
    domain: "Pre-Algebra",
    strand: "Substitution",
    goal: "Check evaluation of expressions after assigning a variable.",
    reason: "Substitution separates symbol meaning from equation solving.",
    concepts: ["prealg_substitution", "prealg_expressions"],
    difficultyRange: [2, 3],
    fallbackProblemId: "prealg_p001",
    courseFocus: "Pre-Algebra"
  },
  {
    id: "combining-like-terms",
    stage: "Bridge",
    domain: "Pre-Algebra",
    strand: "Simplification",
    goal: "Check whether like terms are combined correctly.",
    reason: "Combining terms is the fastest signal for expression fluency before linear equations.",
    concepts: ["prealg_simplification", "prealg_expressions"],
    difficultyRange: [2, 3],
    fallbackProblemId: "prealg_p005",
    courseFocus: "Pre-Algebra"
  },
  {
    id: "distributive-property",
    stage: "Bridge",
    domain: "Pre-Algebra",
    strand: "Distributive reasoning",
    goal: "Check expansion and distribution across parentheses.",
    reason: "Distribution is a common hidden prerequisite for equations, factoring intuition, and AMC8 algebra.",
    concepts: ["prealg_expressions", "prealg_simplification"],
    difficultyRange: [3, 4],
    fallbackProblemId: "prealg_p007",
    courseFocus: "Pre-Algebra"
  },
  {
    id: "word-to-expression",
    stage: "Bridge",
    domain: "Pre-Algebra",
    strand: "Language to symbols",
    goal: "Check translation from verbal math language into an expression.",
    reason: "Word-to-symbol translation is a key bottleneck in multi-step word problems.",
    concepts: ["prealg_word_to_equation", "prealg_expressions"],
    difficultyRange: [2, 3],
    fallbackProblemId: "prealg_p003",
    courseFocus: "Pre-Algebra"
  },
  {
    id: "one-step-equations",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "One-step equations",
    goal: "Check inverse-operation fluency in a simple linear equation.",
    reason: "One-step equations tell us whether remediation should stay pre-algebraic or move forward.",
    concepts: ["alg_linear_equations"],
    difficultyRange: [2, 2],
    fallbackProblemId: "ise_devmath_eq1_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-03-equations",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "two-step-equations",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "Two-step equations",
    goal: "Check whether equation solving survives two sequential inverse operations.",
    reason: "Two-step equations expose sign, order, and arithmetic gaps more clearly than one-step items.",
    concepts: ["alg_linear_equations", "prealg_simplification", "arith_integers"],
    difficultyRange: [3, 4],
    fallbackProblemId: "ise_devmath_eq2_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-03-equations",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "function-evaluation",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "Functions",
    goal: "Check function notation or rule evaluation.",
    reason: "Functions are the bridge from equation procedures into Algebra 1 structure.",
    concepts: ["alg_functions", "alg_graphing", "prealg_substitution"],
    difficultyRange: [2, 3],
    fallbackProblemId: "ise_devmath_line_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-11-graphing-lines",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "inequality-graphing-readiness",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "Linear inequalities",
    goal: "Probe readiness for Algebra 1 inequality solving.",
    reason: "Inequality items reveal whether inverse operations are being applied with attention to relation direction.",
    concepts: ["alg_linear_inequalities", "alg_linear_equations"],
    difficultyRange: [3, 4],
    fallbackProblemId: "ise_devmath_ineq_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-10-linear-equations-inequalities",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "systems-structure",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "Systems of equations",
    goal: "Check whether two linear relationships can be combined structurally.",
    reason: "Systems are a higher Algebra 1 readiness signal: students must see cancellation or structure, not just solve one equation.",
    concepts: ["alg_systems", "alg_linear_equations"],
    difficultyRange: [4, 4],
    fallbackProblemId: "ise_devmath_system_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-12-systems",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "factoring-structure",
    stage: "Algebra Readiness",
    domain: "Algebra",
    strand: "Factoring and quadratics",
    goal: "Check whether quadratic structure can be recognized from sum-product relationships.",
    reason: "Factoring is an early warning signal for whether Algebra 1 readiness has moved beyond linear procedures.",
    concepts: ["alg_factoring", "alg_quadratics"],
    difficultyRange: [4, 4],
    fallbackProblemId: "ise_devmath_factor_001",
    courseFocus: "Algebra 1",
    preferredSourceCollection: "ise_developmental_math_2e",
    chapterFocus: "ise-devmath-14-factoring",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "area-perimeter",
    stage: "AMC8 Transfer",
    domain: "Geometry",
    strand: "Measurement",
    goal: "Check formula selection for area and perimeter.",
    reason: "Geometry measurement reveals whether the learner distinguishes dimension, formula, and units.",
    concepts: ["geo_area", "geo_perimeter"],
    difficultyRange: [2, 3],
    fallbackProblemId: "amc8_p042",
    courseFocus: "AMC8"
  },
  {
    id: "triangle-angles",
    stage: "AMC8 Transfer",
    domain: "Geometry",
    strand: "Angle relationships",
    goal: "Check deduction from triangle angle facts.",
    reason: "Angle questions are compact tests of fact recall plus one-step reasoning.",
    concepts: ["geo_triangle_angles"],
    difficultyRange: [2, 3],
    fallbackProblemId: "amc8_p004",
    courseFocus: "AMC8"
  },
  {
    id: "circle-pythagorean",
    stage: "AMC8 Transfer",
    domain: "Geometry",
    strand: "Circles and right triangles",
    goal: "Probe geometry transfer beyond basic measurement.",
    reason: "Circle and right-triangle items show whether formula knowledge transfers under a new shape context.",
    concepts: ["geo_circles", "geo_pythagorean"],
    difficultyRange: [4, 5],
    fallbackProblemId: "amc8_p076",
    courseFocus: "AMC8"
  },
  {
    id: "factor-gcd",
    stage: "AMC8 Transfer",
    domain: "Number Theory",
    strand: "Factors and GCD",
    goal: "Check factor structure rather than only computation.",
    reason: "Factorization is a prerequisite for GCD, LCM, divisibility shortcuts, and divisor counting.",
    concepts: ["nt_factorization", "nt_gcd", "nt_primes"],
    difficultyRange: [3, 4],
    fallbackProblemId: "amc8_p024",
    courseFocus: "AMC8"
  },
  {
    id: "lcm-remainders",
    stage: "AMC8 Transfer",
    domain: "Number Theory",
    strand: "LCM and remainders",
    goal: "Check number theory operations that require structural thinking.",
    reason: "Remainders and LCM detect whether the learner can move beyond direct arithmetic.",
    concepts: ["nt_lcm", "nt_remainders", "nt_modular"],
    difficultyRange: [3, 4],
    fallbackProblemId: "amc8_p090",
    courseFocus: "AMC8"
  },
  {
    id: "counting-probability",
    stage: "AMC8 Transfer",
    domain: "Counting & Probability",
    strand: "Sample spaces",
    goal: "Check whether outcomes are modeled before calculating.",
    reason: "Counting and probability expose modeling habits that ordinary arithmetic practice can miss.",
    concepts: ["counting_probability", "counting_principle"],
    difficultyRange: [3, 4],
    fallbackProblemId: "amc8_p081",
    courseFocus: "AMC8"
  },
  {
    id: "statistics-transfer",
    stage: "AMC8 Transfer",
    domain: "Statistics",
    strand: "Data and transfer",
    goal: "Check data-position reasoning and readiness for mixed AMC8 questions.",
    reason: "A statistics endpoint gives the diagnostic one final broad transfer signal.",
    concepts: ["stats_median", "stats_mean", "stats_range", "stats_mode"],
    difficultyRange: [2, 4],
    fallbackProblemId: "amc8_p038",
    courseFocus: "AMC8"
  }
];

export function selectDiagnosticProblems(
  blueprint: AssessmentSlot[],
  problems: Problem[]
): SelectedAssessmentItem[] {
  const usedProblemIds = new Set<string>();

  return blueprint
    .map((slot) => {
      const selected = selectDiagnosticProblem(slot, problems, usedProblemIds);

      if (!selected) return null;
      usedProblemIds.add(selected.problem.id);

      return selected;
    })
    .filter((item): item is SelectedAssessmentItem => Boolean(item));
}

export function auditDiagnosticBlueprint(
  blueprint: AssessmentSlot[],
  problems: Problem[],
  selectedItems = selectDiagnosticProblems(blueprint, problems)
): DiagnosticBlueprintAudit {
  const selectedSlotIds = new Set(selectedItems.map((item) => item.slot.id));

  return {
    expectedSlotsByStage: buildExpectedSlotsByStage(blueprint.map((slot) => ({ stage: slot.stage }))),
    missingFallbacks: blueprint
      .filter((slot) => !selectedSlotIds.has(slot.id))
      .map((slot) => slot.id),
    selectedCount: selectedItems.length,
    slotCount: blueprint.length,
    stageCounts: buildExpectedSlotsByStage(selectedItems.map((item) => ({ stage: item.slot.stage })))
  };
}

function selectDiagnosticProblem(
  slot: AssessmentSlot,
  problems: Problem[],
  usedProblemIds: Set<string>
): SelectedAssessmentItem | null {
  const eligible = problems.filter((problem) => problem.isAutoGradable);
  const ranked = eligible
    .map((problem) => ({
      problem,
      score: scoreProblemForSlot(problem, slot, usedProblemIds)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.problem.difficulty - b.problem.difficulty ||
      a.problem.id.localeCompare(b.problem.id)
    );

  const best = ranked[0];

  if (best) {
    return {
      slot,
      problem: best.problem,
      selectionReason: buildSelectionReason(slot, best.problem)
    };
  }

  const fallback = eligible.find((problem) => problem.id === slot.fallbackProblemId);

  return fallback
    ? {
        slot,
        problem: fallback,
        selectionReason: `Fallback item for ${slot.strand}.`
      }
    : null;
}

function scoreProblemForSlot(problem: Problem, slot: AssessmentSlot, usedProblemIds: Set<string>) {
  const conceptMatches = problem.concepts.filter((concept) => slot.concepts.includes(concept));
  if (conceptMatches.length === 0 && problem.id !== slot.fallbackProblemId) return 0;

  const [minDifficulty, maxDifficulty] = slot.difficultyRange;
  const inDifficultyRange = problem.difficulty >= minDifficulty && problem.difficulty <= maxDifficulty;
  const difficultyDistance = inDifficultyRange
    ? 0
    : Math.min(Math.abs(problem.difficulty - minDifficulty), Math.abs(problem.difficulty - maxDifficulty));

  let score = 0;
  score += conceptMatches.length * 30;
  score += slot.concepts.includes(problem.primaryConcept) ? 18 : 0;
  score += inDifficultyRange ? 30 : Math.max(0, 10 - difficultyDistance * 10);
  score += problem.id === slot.fallbackProblemId ? 10 : 0;
  score += problem.curriculum.course === slot.courseFocus ? 8 : 0;
  score += problem.curriculum.sourceCollection === slot.preferredSourceCollection ? 36 : 0;
  score += problem.curriculum.chapter === slot.chapterFocus ? 24 : 0;
  score += problem.taxonomy?.stage === slot.taxonomyStageFocus ? 14 : 0;
  score += usedProblemIds.has(problem.id) ? -80 : 10;

  return score;
}

function buildSelectionReason(slot: AssessmentSlot, problem: Problem) {
  const matchedConcepts = problem.concepts.filter((concept) => slot.concepts.includes(concept));
  const [minDifficulty, maxDifficulty] = slot.difficultyRange;
  const difficultyText = minDifficulty === maxDifficulty
    ? `difficulty ${minDifficulty}`
    : `difficulty ${minDifficulty}-${maxDifficulty}`;

  const sourceText = problem.curriculum.sourceCollection === slot.preferredSourceCollection
    ? ` from ${problem.curriculum.sourceCollection}`
    : "";
  const chapterText = problem.curriculum.chapter === slot.chapterFocus
    ? ` in ${problem.curriculum.chapterTitle}`
    : "";

  return `Selected${sourceText}${chapterText} for ${matchedConcepts.join(", ")} at ${difficultyText}.`;
}
