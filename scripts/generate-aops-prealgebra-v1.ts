import fs from "fs";
import path from "path";

type RawProblem = {
  id: string;
  statement: string;
  answer: string;
  choices: string[];
  difficulty: number;
  concepts: string[];
  skills: string[];
  patterns: string[];
  misconceptions: string[];
  solution: string;
  theme: string;
  chapter: string;
  chapter_title: string;
  sequence: number;
  source_file: string;
  taxonomy_layer: "Foundation" | "Standard" | "Honors";
  taxonomy_stage: "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
  problem_type: string;
  cognitive_tags: string[];
  estimated_time_seconds: number;
  distractors: Array<{
    label: string;
    misconception: string;
    cognitiveTag: string;
    explanation: string;
  }>;
  hint_1: string;
  hint_2: string;
  step_by_step: string;
  common_mistake: string;
  why_correct: string;
  variant_idea: string;
};

type ChapterConfig = {
  chapter: string;
  chapterTitle: string;
  theme: string;
  concepts: string[];
  skills: string[];
  patterns: string[];
  misconceptions: string[];
  taxonomyLayer: RawProblem["taxonomy_layer"];
  taxonomyStage: RawProblem["taxonomy_stage"];
  problemType: string;
  cognitiveTags: string[];
  estimatedTimeSeconds: number;
  generator: (input: GeneratorInput) => GeneratedProblem;
};

type GeneratorInput = {
  ordinal: number;
  localIndex: number;
  chapter: ChapterConfig;
};

type GeneratedProblem = {
  statement: string;
  answer: string;
  wrongAnswers: string[];
  solution: string;
  hint1: string;
  hint2: string;
  commonMistake: string;
  whyCorrect: string;
  variantIdea: string;
  difficulty?: number;
  skills?: string[];
  patterns?: string[];
  misconceptions?: string[];
  cognitiveTags?: string[];
};

const SOURCE_PATH = path.join(process.cwd(), "datasets/textbooks/aops-prealgebra/problems.json");
const APP_PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const TARGET_PER_CHAPTER = Number(readArg("--target-per-chapter") ?? "40");
const START_ID = Number(readArg("--start-id") ?? "17");
const SOURCE_FILE = "datasets/textbooks/aops-prealgebra/generated_v2";

const CHAPTERS: ChapterConfig[] = [
  {
    chapter: "aops-prealg-01-integers",
    chapterTitle: "Integers and Order of Operations",
    theme: "Number Systems and Operations",
    concepts: ["arith_integers"],
    skills: ["signed_number_operations"],
    patterns: ["integer_fluency"],
    misconceptions: ["sign_error", "left_to_right_slip"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["sign_error_risk", "fluency_precision"],
    estimatedTimeSeconds: 45,
    generator: integerProblem
  },
  {
    chapter: "aops-prealg-02-exponents",
    chapterTitle: "Exponents and Roots",
    theme: "Number Systems and Operations",
    concepts: ["arith_exponents"],
    skills: ["exponent_evaluation"],
    patterns: ["repeated_multiplication"],
    misconceptions: ["exponent_as_multiplication", "operation_order_error"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["exponent_meaning", "operation_order"],
    estimatedTimeSeconds: 55,
    generator: exponentProblem
  },
  {
    chapter: "aops-prealg-03-absolute-value",
    chapterTitle: "Absolute Value and Distance",
    theme: "Number Systems and Operations",
    concepts: ["arith_absolute_value", "arith_integers"],
    skills: ["absolute_value_distance"],
    patterns: ["number_line_reasoning"],
    misconceptions: ["absolute_value_as_parentheses"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["sign_error_risk", "number_line_distance"],
    estimatedTimeSeconds: 55,
    generator: absoluteValueProblem
  },
  {
    chapter: "aops-prealg-04-fractions",
    chapterTitle: "Fractions and Mixed Numbers",
    theme: "Fractions, Decimals, Ratios, and Percents",
    concepts: ["arith_fractions"],
    skills: ["common_denominator"],
    patterns: ["fraction_operations"],
    misconceptions: ["unlike_denominator_error"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["fraction_fluency", "common_denominator"],
    estimatedTimeSeconds: 75,
    generator: fractionProblem
  },
  {
    chapter: "aops-prealg-05-mixed-numbers",
    chapterTitle: "Mixed Numbers and Improper Fractions",
    theme: "Fractions, Decimals, Ratios, and Percents",
    concepts: ["arith_mixed_numbers", "arith_fractions"],
    skills: ["mixed_number_conversion"],
    patterns: ["fraction_conversion"],
    misconceptions: ["whole_part_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["fraction_fluency", "part_whole_reasoning"],
    estimatedTimeSeconds: 75,
    generator: mixedNumberProblem
  },
  {
    chapter: "aops-prealg-06-decimals",
    chapterTitle: "Decimals and Percent Forms",
    theme: "Fractions, Decimals, Ratios, and Percents",
    concepts: ["arith_decimals", "arith_fractions"],
    skills: ["decimal_operations"],
    patterns: ["place_value_reasoning"],
    misconceptions: ["place_value_error"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["decimal_place_value", "fraction_fluency"],
    estimatedTimeSeconds: 60,
    generator: decimalProblem
  },
  {
    chapter: "aops-prealg-07-ratios",
    chapterTitle: "Ratios, Rates, and Proportions",
    theme: "Fractions, Decimals, Ratios, and Percents",
    concepts: ["arith_ratios", "arith_proportions"],
    skills: ["scale_factor"],
    patterns: ["proportional_reasoning"],
    misconceptions: ["additive_ratio_error"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Foundation",
    problemType: "proportional_reasoning",
    cognitiveTags: ["multiplicative_reasoning", "scale_factor"],
    estimatedTimeSeconds: 75,
    generator: ratioProblem
  },
  {
    chapter: "aops-prealg-08-percents",
    chapterTitle: "Percents and Percent Change",
    theme: "Fractions, Decimals, Ratios, and Percents",
    concepts: ["arith_percentages", "arith_ratios"],
    skills: ["percent_change"],
    patterns: ["multiplicative_change"],
    misconceptions: ["percent_of_wrong_quantity"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Foundation",
    problemType: "proportional_reasoning",
    cognitiveTags: ["multiplicative_reasoning", "operation_selection"],
    estimatedTimeSeconds: 80,
    generator: percentProblem
  },
  {
    chapter: "aops-prealg-09-roots",
    chapterTitle: "Squares and Square Roots",
    theme: "Number Systems and Operations",
    concepts: ["arith_roots", "arith_exponents"],
    skills: ["square_root_evaluation"],
    patterns: ["inverse_operation_structure"],
    misconceptions: ["root_square_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Foundation",
    problemType: "computation",
    cognitiveTags: ["inverse_operations", "exponent_meaning"],
    estimatedTimeSeconds: 70,
    generator: rootProblem
  },
  {
    chapter: "aops-prealg-10-expressions",
    chapterTitle: "Expressions and Like Terms",
    theme: "Expressions and Equations",
    concepts: ["prealg_expressions", "prealg_simplification"],
    skills: ["combine_like_terms"],
    patterns: ["expression_simplification"],
    misconceptions: ["constant_like_term_error"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "Bridge",
    problemType: "expression_simplification",
    cognitiveTags: ["symbolic_fluency", "like_terms"],
    estimatedTimeSeconds: 65,
    generator: expressionProblem
  },
  {
    chapter: "aops-prealg-11-distribution",
    chapterTitle: "Distribution and Simplification",
    theme: "Expressions and Equations",
    concepts: ["prealg_simplification", "prealg_expressions"],
    skills: ["distributive_property"],
    patterns: ["expression_simplification"],
    misconceptions: ["missed_distribution_term"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Bridge",
    problemType: "expression_simplification",
    cognitiveTags: ["symbolic_fluency", "structure_recognition"],
    estimatedTimeSeconds: 75,
    generator: distributionProblem
  },
  {
    chapter: "aops-prealg-12-substitution",
    chapterTitle: "Substitution and Evaluation",
    theme: "Expressions and Equations",
    concepts: ["prealg_substitution", "arith_exponents"],
    skills: ["substitution", "order_of_operations"],
    patterns: ["expression_evaluation"],
    misconceptions: ["substitution_order_error"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Bridge",
    problemType: "substitution",
    cognitiveTags: ["variable_meaning", "operation_order", "exponent_meaning"],
    estimatedTimeSeconds: 80,
    generator: substitutionProblem
  },
  {
    chapter: "aops-prealg-13-linear-equations",
    chapterTitle: "One- and Two-Step Equations",
    theme: "Expressions and Equations",
    concepts: ["alg_linear_equations", "arith_integers"],
    skills: ["two_step_equation"],
    patterns: ["inverse_operations"],
    misconceptions: ["operation_order_in_equation"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Algebra Readiness",
    problemType: "equation_solving",
    cognitiveTags: ["inverse_operations", "multi_step_planning", "operation_selection"],
    estimatedTimeSeconds: 85,
    generator: equationProblem
  },
  {
    chapter: "aops-prealg-14-inequalities",
    chapterTitle: "Inequalities and Number Lines",
    theme: "Expressions and Equations",
    concepts: ["alg_linear_inequalities", "alg_linear_equations"],
    skills: ["linear_inequality_solving"],
    patterns: ["relation_reasoning"],
    misconceptions: ["inequality_direction_error"],
    taxonomyLayer: "Honors",
    taxonomyStage: "Algebra Readiness",
    problemType: "inequality_solving",
    cognitiveTags: ["inverse_operations", "relation_direction"],
    estimatedTimeSeconds: 90,
    generator: inequalityProblem
  },
  {
    chapter: "aops-prealg-15-word-problems",
    chapterTitle: "Translating Words into Equations",
    theme: "Expressions and Equations",
    concepts: ["prealg_word_to_equation", "alg_linear_equations"],
    skills: ["word_to_equation", "two_step_equation"],
    patterns: ["modeling_equation"],
    misconceptions: ["translation_order_error"],
    taxonomyLayer: "Standard",
    taxonomyStage: "Algebra Readiness",
    problemType: "word_problem_modeling",
    cognitiveTags: ["model_translation", "inverse_operations", "multi_step_planning"],
    estimatedTimeSeconds: 95,
    generator: wordProblem
  },
  {
    chapter: "aops-prealg-16-functions",
    chapterTitle: "Functions and Tables",
    theme: "Expressions and Equations",
    concepts: ["alg_functions", "prealg_substitution"],
    skills: ["function_evaluation"],
    patterns: ["input_output_reasoning"],
    misconceptions: ["function_notation_confusion"],
    taxonomyLayer: "Honors",
    taxonomyStage: "Algebra Readiness",
    problemType: "function_evaluation",
    cognitiveTags: ["variable_meaning", "pattern_generalization"],
    estimatedTimeSeconds: 85,
    generator: functionProblem
  },
  {
    chapter: "aops-prealg-17-graphing",
    chapterTitle: "Coordinate Graphing and Linear Patterns",
    theme: "Expressions and Equations",
    concepts: ["alg_graphing", "alg_functions"],
    skills: ["slope_from_points"],
    patterns: ["coordinate_reasoning"],
    misconceptions: ["coordinate_order_error"],
    taxonomyLayer: "Honors",
    taxonomyStage: "Algebra Readiness",
    problemType: "coordinate_reasoning",
    cognitiveTags: ["coordinate_precision", "rate_of_change"],
    estimatedTimeSeconds: 95,
    generator: graphingProblem
  },
  {
    chapter: "aops-prealg-18-divisibility",
    chapterTitle: "Divisibility and Primes",
    theme: "Number Theory Foundations",
    concepts: ["nt_divisibility", "nt_primes"],
    skills: ["divisibility_rules"],
    patterns: ["number_structure"],
    misconceptions: ["prime_composite_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "AMC8 Transfer",
    problemType: "number_structure",
    cognitiveTags: ["factor_structure", "divisibility_reasoning"],
    estimatedTimeSeconds: 80,
    generator: divisibilityProblem
  },
  {
    chapter: "aops-prealg-19-factorization",
    chapterTitle: "Prime Factorization, GCD, and LCM",
    theme: "Number Theory Foundations",
    concepts: ["nt_factorization", "nt_gcd", "nt_lcm"],
    skills: ["prime_factorization", "gcd_lcm"],
    patterns: ["number_structure"],
    misconceptions: ["gcd_lcm_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "AMC8 Transfer",
    problemType: "number_structure",
    cognitiveTags: ["factor_structure", "multiple_structure"],
    estimatedTimeSeconds: 95,
    generator: factorProblem
  },
  {
    chapter: "aops-prealg-20-remainders",
    chapterTitle: "Remainders and Modular Patterns",
    theme: "Number Theory Foundations",
    concepts: ["nt_remainders", "nt_modular"],
    skills: ["remainder_reasoning"],
    patterns: ["modular_pattern"],
    misconceptions: ["quotient_remainder_confusion"],
    taxonomyLayer: "Honors",
    taxonomyStage: "AMC8 Transfer",
    problemType: "number_structure",
    cognitiveTags: ["modular_reasoning", "pattern_generalization"],
    estimatedTimeSeconds: 95,
    generator: remainderProblem
  },
  {
    chapter: "aops-prealg-21-geometry",
    chapterTitle: "Area, Perimeter, and Basic Geometry",
    theme: "Geometry and Measurement",
    concepts: ["geo_area", "geo_perimeter"],
    skills: ["area_perimeter_formula"],
    patterns: ["formula_selection"],
    misconceptions: ["area_perimeter_confusion"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "AMC8 Transfer",
    problemType: "geometric_measurement",
    cognitiveTags: ["formula_selection", "unit_dimension_reasoning"],
    estimatedTimeSeconds: 65,
    generator: geometryProblem
  },
  {
    chapter: "aops-prealg-22-triangles",
    chapterTitle: "Triangles and Angles",
    theme: "Geometry and Measurement",
    concepts: ["geo_triangle_angles", "geo_triangles"],
    skills: ["triangle_angle_sum"],
    patterns: ["geometric_deduction"],
    misconceptions: ["angle_sum_error"],
    taxonomyLayer: "Foundation",
    taxonomyStage: "AMC8 Transfer",
    problemType: "geometric_deduction",
    cognitiveTags: ["angle_chasing", "fact_application"],
    estimatedTimeSeconds: 65,
    generator: triangleProblem
  },
  {
    chapter: "aops-prealg-23-circles",
    chapterTitle: "Circles and Arc Length",
    theme: "Geometry and Measurement",
    concepts: ["geo_circles", "geo_arc_length"],
    skills: ["circle_measurement"],
    patterns: ["formula_selection"],
    misconceptions: ["radius_diameter_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "AMC8 Transfer",
    problemType: "geometric_measurement",
    cognitiveTags: ["formula_selection", "unit_dimension_reasoning"],
    estimatedTimeSeconds: 85,
    generator: circleProblem
  },
  {
    chapter: "aops-prealg-24-pythagorean",
    chapterTitle: "Right Triangles and the Pythagorean Theorem",
    theme: "Geometry and Measurement",
    concepts: ["geo_pythagorean", "geo_triangles"],
    skills: ["pythagorean_theorem"],
    patterns: ["geometric_measurement"],
    misconceptions: ["leg_hypotenuse_confusion"],
    taxonomyLayer: "Honors",
    taxonomyStage: "AMC8 Transfer",
    problemType: "geometric_measurement",
    cognitiveTags: ["formula_selection", "spatial_structure"],
    estimatedTimeSeconds: 95,
    generator: pythagoreanProblem
  },
  {
    chapter: "aops-prealg-25-similarity",
    chapterTitle: "Similarity and Scale",
    theme: "Geometry and Measurement",
    concepts: ["geo_similarity", "arith_proportions"],
    skills: ["scale_factor"],
    patterns: ["proportional_reasoning"],
    misconceptions: ["additive_scale_error"],
    taxonomyLayer: "Honors",
    taxonomyStage: "AMC8 Transfer",
    problemType: "geometric_proportional_reasoning",
    cognitiveTags: ["multiplicative_reasoning", "spatial_structure"],
    estimatedTimeSeconds: 95,
    generator: similarityProblem
  },
  {
    chapter: "aops-prealg-26-statistics",
    chapterTitle: "Mean, Median, Mode, and Range",
    theme: "Data, Counting, and Probability",
    concepts: ["stats_mean", "stats_median", "stats_range"],
    skills: ["mean_as_total"],
    patterns: ["data_reasoning"],
    misconceptions: ["average_as_middle_value"],
    taxonomyLayer: "Standard",
    taxonomyStage: "AMC8 Transfer",
    problemType: "data_reasoning",
    cognitiveTags: ["mean_as_balance", "multi_step_planning"],
    estimatedTimeSeconds: 90,
    generator: statisticsProblem
  },
  {
    chapter: "aops-prealg-27-counting",
    chapterTitle: "Counting Principles and Arrangements",
    theme: "Data, Counting, and Probability",
    concepts: ["counting_principle", "counting_permutations"],
    skills: ["multiplication_principle"],
    patterns: ["counting_modeling"],
    misconceptions: ["additive_counting_error"],
    taxonomyLayer: "Honors",
    taxonomyStage: "AMC8 Transfer",
    problemType: "counting_modeling",
    cognitiveTags: ["casework_planning", "multiplicative_reasoning"],
    estimatedTimeSeconds: 95,
    generator: countingProblem
  },
  {
    chapter: "aops-prealg-28-probability",
    chapterTitle: "Counting and Simple Probability",
    theme: "Data, Counting, and Probability",
    concepts: ["counting_probability", "arith_fractions"],
    skills: ["simple_probability"],
    patterns: ["sample_space_modeling"],
    misconceptions: ["part_whole_confusion"],
    taxonomyLayer: "Standard",
    taxonomyStage: "AMC8 Transfer",
    problemType: "probability_modeling",
    cognitiveTags: ["sample_space_modeling", "fraction_fluency"],
    estimatedTimeSeconds: 75,
    generator: probabilityProblem
  }
];

function main() {
  const configuredChapters = new Set(CHAPTERS.map((chapter) => chapter.chapter));
  const existing = readExistingProblems().filter((problem) => configuredChapters.has(problem.chapter));
  const byChapter = groupBy(existing, (problem) => problem.chapter);
  const additions: RawProblem[] = [];
  let nextId = Math.max(START_ID, nextNumericId(existing), nextAppNumericId());

  CHAPTERS.forEach((chapter) => {
    const current = byChapter.get(chapter.chapter) ?? [];
    const needed = Math.max(0, TARGET_PER_CHAPTER - current.length);

    for (let localIndex = current.length + 1; localIndex <= current.length + needed; localIndex += 1) {
      const generated = chapter.generator({ ordinal: nextId, localIndex, chapter });
      additions.push(toRawProblem(nextId, localIndex, chapter, generated));
      nextId += 1;
    }
  });

  const merged = [...existing, ...additions].sort((left, right) =>
    chapterOrder(left.chapter) - chapterOrder(right.chapter) ||
    left.sequence - right.sequence ||
    left.id.localeCompare(right.id)
  );

  fs.writeFileSync(SOURCE_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`AoPS Prealgebra v1 generated ${additions.length} new problem(s).`);
  console.log(`Total source problems: ${merged.length}`);
  CHAPTERS.forEach((chapter) => {
    const count = merged.filter((problem) => problem.chapter === chapter.chapter).length;
    console.log(`- ${chapter.chapter}: ${count}`);
  });
}

function toRawProblem(idNumber: number, localIndex: number, chapter: ChapterConfig, generated: GeneratedProblem): RawProblem {
  const answer = generated.answer;
  const wrongAnswers = unique(generated.wrongAnswers.filter((value) => normalize(value) !== normalize(answer))).slice(0, 4);
  const choices = labelChoices(answer, wrongAnswers);
  const correctLabel = choices.find((choice) => normalize(choice.value) === normalize(answer))?.label;

  if (!correctLabel) throw new Error(`Generated problem ${idNumber} is missing its correct choice.`);
  if (choices.length !== 5) throw new Error(`Generated problem ${idNumber} does not have five unique choices.`);

  return {
    id: `aops_prealg_${String(idNumber).padStart(4, "0")}`,
    statement: generated.statement,
    answer,
    choices: choices.map((choice) => `${choice.label}:${choice.value}`),
    difficulty: generated.difficulty ?? difficultyFor(localIndex),
    concepts: chapter.concepts,
    skills: generated.skills ?? chapter.skills,
    patterns: generated.patterns ?? chapter.patterns,
    misconceptions: generated.misconceptions ?? chapter.misconceptions,
    solution: generated.solution,
    theme: chapter.theme,
    chapter: chapter.chapter,
    chapter_title: chapter.chapterTitle,
    sequence: chapterOrder(chapter.chapter) * 100 + localIndex,
    source_file: SOURCE_FILE,
    taxonomy_layer: chapter.taxonomyLayer,
    taxonomy_stage: chapter.taxonomyStage,
    problem_type: chapter.problemType,
    cognitive_tags: generated.cognitiveTags ?? chapter.cognitiveTags,
    estimated_time_seconds: chapter.estimatedTimeSeconds + Math.max(0, (generated.difficulty ?? 3) - 2) * 10,
    distractors: choices
      .filter((choice) => choice.label !== correctLabel)
      .map((choice, index) => ({
        label: choice.label,
        misconception: chapter.misconceptions[index % chapter.misconceptions.length] ?? "distractor_pattern",
        cognitiveTag: chapter.cognitiveTags[index % chapter.cognitiveTags.length] ?? "general_reasoning",
        explanation: distractorExplanation(choice.value, answer, chapter.problemType)
      })),
    hint_1: generated.hint1,
    hint_2: generated.hint2,
    step_by_step: generated.solution,
    common_mistake: generated.commonMistake,
    why_correct: generated.whyCorrect,
    variant_idea: generated.variantIdea
  };
}

function integerProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 12 + localIndex;
  const b = 20 + ((localIndex * 3) % 17);
  const c = 4 + (localIndex % 9);
  const answer = a - b + c;

  return {
    statement: `Compute ${a} - ${b} + ${c}.`,
    answer: String(answer),
    wrongAnswers: [String(a - b), String(Math.abs(answer)), String(a + b + c), String(a - b - c), String(answer + 2)],
    solution: `${a} - ${b} = ${a - b}, and ${a - b} + ${c} = ${answer}.`,
    hint1: `First compute ${a} - ${b}.`,
    hint2: `Then add ${c} to that intermediate result.`,
    commonMistake: "A common slip is to lose the sign after the first subtraction.",
    whyCorrect: `The expression is evaluated from left to right for addition and subtraction, giving ${answer}.`,
    variantIdea: `Change the final addend to ${c + 3} and recompute.`
  };
}

function exponentProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const base = 2 + (localIndex % 5);
  const addBase = 2 + ((localIndex + 2) % 4);
  const answer = base ** 2 + addBase ** 3;

  return {
    statement: `Evaluate ${base}^2 + ${addBase}^3.`,
    answer: String(answer),
    wrongAnswers: [
      String(base * 2 + addBase * 3),
      String(base ** 2 + addBase * 3),
      String((base + addBase) ** 2),
      String(base ** 2 * addBase ** 3),
      String(answer - addBase)
    ],
    solution: `${base}^2 = ${base ** 2} and ${addBase}^3 = ${addBase ** 3}, so the sum is ${answer}.`,
    hint1: "A power means repeated multiplication.",
    hint2: "Evaluate both powers before adding.",
    commonMistake: "Do not read an exponent as multiplication by the exponent.",
    whyCorrect: `The two powers are ${base ** 2} and ${addBase ** 3}, and their sum is ${answer}.`,
    variantIdea: `Try ${base + 1}^2 + ${addBase}^3.`
  };
}

function absoluteValueProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = -18 + (localIndex % 17);
  const b = 3 + ((localIndex * 2) % 9);
  const answer = Math.abs(a) + b;

  return {
    statement: `Compute |${a}| + ${b}.`,
    answer: String(answer),
    wrongAnswers: [String(a + b), String(Math.abs(a + b)), String(Math.abs(a) - b), String(-Math.abs(a) + b), String(answer + 2)],
    solution: `|${a}| = ${Math.abs(a)}, so |${a}| + ${b} = ${Math.abs(a)} + ${b} = ${answer}.`,
    hint1: "Absolute value is distance from 0.",
    hint2: `Find |${a}| before adding ${b}.`,
    commonMistake: "Absolute value makes the distance positive; it is not the same as keeping a negative sign.",
    whyCorrect: `The distance from ${a} to 0 is ${Math.abs(a)}, and adding ${b} gives ${answer}.`,
    variantIdea: `Compute |${a - 2}| + ${b + 1}.`,
    difficulty: 2
  };
}

function fractionProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const denominators = [6, 8, 9, 10, 12, 15];
  const d1 = denominators[localIndex % denominators.length];
  const d2 = denominators[(localIndex + 2) % denominators.length];
  const n1 = 1 + (localIndex % (d1 - 2));
  const n2 = 1 + ((localIndex * 2) % (d2 - 2));
  const useAdd = localIndex % 2 === 0;
  const rawNumerator = useAdd ? n1 * d2 + n2 * d1 : n1 * d2 - n2 * d1;
  const denominator = d1 * d2;
  const answer = simplifyFraction(rawNumerator, denominator);
  const naive = `${Math.max(1, useAdd ? n1 + n2 : Math.abs(n1 - n2))}/${d1 + d2}`;

  return {
    statement: `Simplify ${n1}/${d1} ${useAdd ? "+" : "-"} ${n2}/${d2}.`,
    answer,
    wrongAnswers: [naive, simplifyFraction(rawNumerator + d1, denominator), simplifyFraction(rawNumerator - d2, denominator), `${rawNumerator}/${denominator}`, simplifyFraction(n1 * d2, denominator)],
    solution: `Use denominator ${denominator}: ${n1}/${d1} = ${n1 * d2}/${denominator} and ${n2}/${d2} = ${n2 * d1}/${denominator}, so the result is ${answer}.`,
    hint1: "Find a common denominator before combining.",
    hint2: `A common denominator is ${denominator}.`,
    commonMistake: "Do not add or subtract denominators directly.",
    whyCorrect: `After rewriting in common units, the numerator becomes ${rawNumerator}, which simplifies to ${answer}.`,
    variantIdea: `Use the same denominators with numerators ${n1 + 1} and ${n2}.`,
    difficulty: 3
  };
}

function mixedNumberProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const whole = 1 + (localIndex % 6);
  const denominator = 3 + (localIndex % 8);
  const numerator = 1 + ((localIndex * 2) % (denominator - 1));
  const improperNumerator = whole * denominator + numerator;
  const answer = `${improperNumerator}/${denominator}`;

  return {
    statement: `Convert ${whole} ${numerator}/${denominator} to an improper fraction.`,
    answer,
    wrongAnswers: [`${whole + numerator}/${denominator}`, `${whole * numerator}/${denominator}`, `${improperNumerator}/${whole + denominator}`, `${numerator}/${improperNumerator}`, `${improperNumerator + 1}/${denominator}`],
    solution: `Multiply the whole number by the denominator and add the numerator: ${whole}*${denominator}+${numerator}=${improperNumerator}, so the fraction is ${answer}.`,
    hint1: "A mixed number has a whole-number part and a fractional part.",
    hint2: `Use ${whole}*${denominator}+${numerator} for the new numerator.`,
    commonMistake: "Do not add the whole number directly to the numerator without multiplying by the denominator.",
    whyCorrect: `${whole} ${numerator}/${denominator} means ${whole} wholes plus ${numerator}/${denominator}, or ${improperNumerator}/${denominator}.`,
    variantIdea: `Convert ${whole + 1} ${numerator}/${denominator} to an improper fraction.`,
    difficulty: 3
  };
}

function decimalProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 12 + localIndex;
  const b = 5 + ((localIndex * 3) % 15);
  const first = round2(a / 100);
  const second = round2(b / 100);
  const answer = round2(first + second);

  return {
    statement: `Compute ${first.toFixed(2)} + ${second.toFixed(2)}.`,
    answer: answer.toFixed(2),
    wrongAnswers: [
      round2(answer / 10).toFixed(2),
      round2(first + b / 10).toFixed(2),
      round2(answer + 0.1).toFixed(2),
      round2(Math.abs(first - second)).toFixed(2),
      String(Math.round(answer * 100))
    ],
    solution: `Add hundredths: ${first.toFixed(2)} + ${second.toFixed(2)} = ${answer.toFixed(2)}.`,
    hint1: "Line up the decimal points.",
    hint2: "Treat both numbers as hundredths.",
    commonMistake: "Do not drop the trailing zero or shift the decimal point.",
    whyCorrect: `${first.toFixed(2)} is ${Math.round(first * 100)} hundredths and ${second.toFixed(2)} is ${Math.round(second * 100)} hundredths, for ${Math.round(answer * 100)} hundredths.`,
    variantIdea: `Compute ${first.toFixed(2)} + ${(second + 0.03).toFixed(2)}.`
  };
}

function rootProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const n = 3 + (localIndex % 12);
  const add = 2 + ((localIndex * 3) % 9);
  const square = n * n;
  const answer = n + add;

  return {
    statement: `Evaluate sqrt(${square}) + ${add}.`,
    answer: String(answer),
    wrongAnswers: [String(square + add), String(n * add), String(Math.abs(n - add)), String(n), String(answer + 1)],
    solution: `sqrt(${square}) = ${n}, so sqrt(${square}) + ${add} = ${n} + ${add} = ${answer}.`,
    hint1: "A square root asks which number was squared.",
    hint2: `${n}^2 = ${square}.`,
    commonMistake: "Do not treat sqrt(n^2) as n^2; the square root reverses squaring.",
    whyCorrect: `Since ${n}*${n}=${square}, the square root is ${n}.`,
    variantIdea: `Evaluate sqrt(${(n + 1) ** 2}) + ${add}.`,
    difficulty: 3
  };
}

function ratioProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const flour = 2 + (localIndex % 5);
  const sugar = 3 + ((localIndex + 1) % 4);
  const scale = 2 + (localIndex % 5);
  const targetSugar = sugar * scale;
  const answer = flour * scale;

  return {
    statement: `A mix uses ${flour} cups of oats for every ${sugar} cups of milk. How many cups of oats are needed for ${targetSugar} cups of milk?`,
    answer: String(answer),
    wrongAnswers: [String(targetSugar - sugar + flour), String(targetSugar), String(flour + targetSugar), String(sugar * scale), String(answer + scale)],
    solution: `${targetSugar} is ${scale} times ${sugar}, so the oats also scale by ${scale}: ${flour}*${scale} = ${answer}.`,
    hint1: `Find the scale factor from ${sugar} to ${targetSugar}.`,
    hint2: `Multiply ${flour} by the same scale factor.`,
    commonMistake: "Ratios scale multiplicatively, not by adding the same difference.",
    whyCorrect: `${answer}:${targetSugar} reduces to ${flour}:${sugar}.`,
    variantIdea: `Ask for the milk needed when oats are ${answer + flour} cups.`,
    difficulty: 3
  };
}

function percentProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const prices = [40, 50, 60, 80, 100, 120];
  const percents = [10, 15, 20, 25, 30];
  const price = prices[localIndex % prices.length];
  const percent = percents[(localIndex + 1) % percents.length];
  const discount = price * percent / 100;
  const answer = price - discount;

  return {
    statement: `A $${price} item is discounted by ${percent}%. What is the sale price?`,
    answer: String(answer),
    wrongAnswers: [String(discount), String(percent), String(price + discount), String(price - price * 10 / 100), String(price)],
    solution: `${percent}% of ${price} is ${discount}, so the sale price is ${price} - ${discount} = ${answer}.`,
    hint1: `Find ${percent}% of ${price} first.`,
    hint2: "A discount is subtracted from the original price.",
    commonMistake: "The discount amount is not the final sale price.",
    whyCorrect: `The customer pays the original price minus ${discount}.`,
    variantIdea: `Change the discount to ${Math.min(50, percent + 5)}%.`,
    difficulty: 3
  };
}

function expressionProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 2 + (localIndex % 7);
  const b = 3 + ((localIndex * 2) % 6);
  const c = localIndex % 2 === 0 ? 4 + localIndex % 5 : -(3 + localIndex % 5);
  const coefficient = a + b;
  const answer = `${coefficient}x${formatSigned(c)}`;

  return {
    statement: `Simplify ${a}x + ${b}x ${formatSigned(c)}.`,
    answer,
    wrongAnswers: [`${a * b}x${formatSigned(c)}`, `${coefficient}x${formatSigned(-c)}`, `${coefficient + c}x`, `${coefficient}x`, `${Math.abs(coefficient - c)}x${formatSigned(c)}`],
    solution: `Combine like terms: ${a}x + ${b}x = ${coefficient}x. The constant remains ${c}, so the expression is ${answer}.`,
    hint1: "Combine only terms with the same variable part.",
    hint2: "The constant term stays separate from the x-terms.",
    commonMistake: "Do not combine the constant with the x coefficient.",
    whyCorrect: `${a}x and ${b}x are like terms, while ${c} is a constant.`,
    variantIdea: `Simplify ${a + 1}y + ${b}y ${formatSigned(c + 1)}.`,
    difficulty: 2
  };
}

function distributionProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 2 + (localIndex % 6);
  const b = 1 + ((localIndex * 2) % 7);
  const c = 2 + ((localIndex * 3) % 6);
  const answer = `${a}x + ${a * b + c}`;

  return {
    statement: `Simplify ${a}(x + ${b}) + ${c}.`,
    answer,
    wrongAnswers: [`${a}x + ${b + c}`, `${a}x + ${a * b - c}`, `${a + b}x + ${c}`, `${a * b}x + ${c}`, `${a}x + ${a * (b + c)}`],
    solution: `Distribute ${a}: ${a}(x+${b}) = ${a}x + ${a * b}. Then add ${c}, giving ${answer}.`,
    hint1: "Distribute the outside factor to every term inside parentheses.",
    hint2: `First rewrite ${a}(x+${b}) as ${a}x + ${a * b}.`,
    commonMistake: "A common error is to multiply only the variable term and forget the constant inside the parentheses.",
    whyCorrect: `Expanding and combining constants gives ${a}x + ${a * b} + ${c} = ${answer}.`,
    variantIdea: `Simplify ${a + 1}(x + ${b}) + ${c}.`,
    difficulty: 3
  };
}

function substitutionProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const k = 2 + (localIndex % 4);
  const value = 2 + ((localIndex + 1) % 5);
  const c = 1 + (localIndex % 9);
  const answer = k * value ** 2 - c;

  return {
    statement: `Evaluate ${k}a^2 - ${c} when a = ${value}.`,
    answer: String(answer),
    wrongAnswers: [String(k * value * 2 - c), String((k * value) ** 2 - c), String(k * (value - c) ** 2), String(k * value ** 2 + c), String(answer + value)],
    solution: `Substitute a = ${value}: ${k}(${value}^2) - ${c} = ${k}*${value ** 2} - ${c} = ${answer}.`,
    hint1: `Replace a with ${value}.`,
    hint2: "Square the value of a before multiplying by the coefficient.",
    commonMistake: "The exponent applies to a, not to the whole coefficient-variable product.",
    whyCorrect: `Order of operations gives ${value}^2 = ${value ** 2}, then ${k}*${value ** 2} - ${c}.`,
    variantIdea: `Evaluate ${k + 1}b^2 - ${c} when b = ${value}.`,
    difficulty: 3
  };
}

function inequalityProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 2 + (localIndex % 6);
  const x = 3 + ((localIndex * 2) % 9);
  const b = 2 + (localIndex % 8);
  const right = a * x + b;
  const answer = `x < ${x}`;

  return {
    statement: `Solve ${a}x + ${b} < ${right}.`,
    answer,
    wrongAnswers: [`x > ${x}`, `x < ${right}`, `x < ${right - b}`, `x > ${right - b}`, `x = ${x}`],
    solution: `Subtract ${b} from both sides: ${a}x < ${right - b}. Divide by positive ${a}, so ${answer}.`,
    hint1: "Solve it like an equation while preserving the inequality sign when dividing by a positive number.",
    hint2: `Remove +${b}, then divide by ${a}.`,
    commonMistake: "Do not reverse the inequality sign when dividing by a positive number.",
    whyCorrect: `The boundary value is ${x}; values below ${x} make the original inequality true.`,
    variantIdea: `Solve ${a}x + ${b + 1} < ${right + 1}.`,
    difficulty: 4
  };
}

function equationProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 2 + (localIndex % 6);
  const x = 3 + ((localIndex * 2) % 10);
  const b = localIndex % 2 === 0 ? 4 + (localIndex % 8) : -(2 + (localIndex % 7));
  const right = a * x + b;

  return {
    statement: `Solve ${a}x ${formatSigned(b)} = ${right}.`,
    answer: String(x),
    wrongAnswers: [String(right / a), String(right - b), String(x + 1), String(x - 1), String(a * right)],
    solution: `Undo the constant first: ${a}x = ${right - b}. Then divide by ${a}, so x = ${x}.`,
    hint1: "Undo addition or subtraction before undoing multiplication.",
    hint2: `After removing the constant, divide by ${a}.`,
    commonMistake: "Dividing the original right side before removing the constant changes the equation.",
    whyCorrect: `Substituting x = ${x} gives ${a}*${x} ${formatSigned(b)} = ${right}.`,
    variantIdea: `Solve ${a + 1}x ${formatSigned(b)} = ${(a + 1) * x + b}.`,
    difficulty: 3
  };
}

function functionProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const m = 2 + (localIndex % 5);
  const b = 1 + ((localIndex * 2) % 9);
  const input = 2 + ((localIndex * 3) % 8);
  const answer = m * input + b;

  return {
    statement: `If f(n) = ${m}n + ${b}, what is f(${input})?`,
    answer: String(answer),
    wrongAnswers: [String(m + input + b), String(m * b + input), String(m * input - b), String(input), String(answer + m)],
    solution: `Substitute ${input} for n: f(${input}) = ${m}*${input} + ${b} = ${answer}.`,
    hint1: "Function notation asks for the output at a given input.",
    hint2: `Replace n with ${input}.`,
    commonMistake: "Do not multiply f by the input; f(n) names the output rule.",
    whyCorrect: `The rule maps ${input} to ${m}*${input}+${b}=${answer}.`,
    variantIdea: `Find f(${input + 1}) for the same rule.`,
    difficulty: 3
  };
}

function graphingProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const x1 = localIndex % 5;
  const y1 = 2 + ((localIndex * 2) % 7);
  const slope = 1 + (localIndex % 4);
  const run = 2 + ((localIndex + 1) % 4);
  const x2 = x1 + run;
  const y2 = y1 + slope * run;

  return {
    statement: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
    answer: String(slope),
    wrongAnswers: [String(run), String(y2 - y1), String(x2 + y2), simplifyFraction(run, y2 - y1), String(slope + 1)],
    solution: `Slope is change in y over change in x: (${y2}-${y1})/(${x2}-${x1}) = ${y2 - y1}/${run} = ${slope}.`,
    hint1: "Use rise over run.",
    hint2: "Subtract y-values and x-values in the same order.",
    commonMistake: "Do not reverse the coordinate order or use x-change over y-change.",
    whyCorrect: `The y-value increases by ${y2 - y1} while x increases by ${run}, so the rate is ${slope}.`,
    variantIdea: `Use points (${x1}, ${y1}) and (${x2 + 1}, ${y2 + slope}).`,
    difficulty: 4
  };
}

function wordProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const multiplier = 2 + (localIndex % 4);
  const x = 4 + ((localIndex * 3) % 12);
  const add = 3 + (localIndex % 9);
  const total = multiplier * x + add;

  return {
    statement: `A number is multiplied by ${multiplier} and then increased by ${add} to make ${total}. What is the number?`,
    answer: String(x),
    wrongAnswers: [String(total - add), String(Math.round(total / multiplier)), String(x + add), String(total + add), String(x + 1)],
    solution: `Let the number be x. Then ${multiplier}x + ${add} = ${total}, so ${multiplier}x = ${total - add} and x = ${x}.`,
    hint1: "Use a variable for the unknown number.",
    hint2: `The phrase multiplied by ${multiplier} becomes ${multiplier}x.`,
    commonMistake: "The intermediate value after subtracting the constant is not the original number.",
    whyCorrect: `${multiplier}*${x} + ${add} = ${total}.`,
    variantIdea: `Change the increase to ${add + 2} and solve again.`,
    difficulty: 3
  };
}

function divisibilityProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const base = 30 + localIndex * 3;
  const number = base + (base % 3 === 0 ? 0 : 3 - (base % 3));
  const divisor = [3, 4, 5, 6, 9][localIndex % 5];
  const adjusted = divisor === 5 ? number - (number % 10) + 5 : divisor === 4 ? number - (number % 4) : divisor === 9 ? number - (number % 9) : number - (number % divisor);
  const answer = adjusted % divisor === 0 ? "yes" : "no";

  return {
    statement: `Is ${adjusted} divisible by ${divisor}?`,
    answer,
    wrongAnswers: answer === "yes" ? ["no", String(divisor), String(adjusted % divisor), String(adjusted / divisor + 1), String(adjusted)] : ["yes", String(divisor), String(adjusted % divisor), String(adjusted + divisor), String(adjusted - divisor)],
    solution: `${adjusted} divided by ${divisor} has remainder ${adjusted % divisor}, so the answer is ${answer}.`,
    hint1: "Use a divisibility rule or check the remainder.",
    hint2: `Compute ${adjusted} mod ${divisor}.`,
    commonMistake: "A nearby multiple is not enough; the remainder must be 0.",
    whyCorrect: answer === "yes" ? `${adjusted} is an exact multiple of ${divisor}.` : `${adjusted} leaves a nonzero remainder when divided by ${divisor}.`,
    variantIdea: `Check whether ${adjusted + divisor} is divisible by ${divisor}.`,
    difficulty: 3
  };
}

function factorProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const pairs = [
    [36, 54],
    [45, 75],
    [48, 72],
    [60, 90],
    [42, 70],
    [56, 84],
    [63, 99],
    [72, 120],
    [80, 100],
    [96, 144]
  ];
  const [a, b] = pairs[localIndex % pairs.length];
  const askLcm = localIndex % 2 === 0;
  const gcdValue = gcd(a, b);
  const lcmValue = Math.abs(a * b) / gcdValue;
  const answer = askLcm ? lcmValue : gcdValue;

  return {
    statement: `What is the ${askLcm ? "least common multiple" : "greatest common divisor"} of ${a} and ${b}?`,
    answer: String(answer),
    wrongAnswers: [String(askLcm ? gcdValue : lcmValue), String(Math.min(a, b)), String(Math.max(a, b)), String(a + b), String(Math.abs(a - b))],
    solution: `The GCD of ${a} and ${b} is ${gcdValue}, so the LCM is ${a}*${b}/${gcdValue} = ${lcmValue}. The requested value is ${answer}.`,
    hint1: "Prime factorization helps separate shared factors from needed multiples.",
    hint2: askLcm ? "The LCM must be divisible by both numbers." : "The GCD must divide both numbers.",
    commonMistake: "GCD and LCM answer opposite questions; one asks for a divisor, the other for a multiple.",
    whyCorrect: askLcm ? `${answer} is divisible by both ${a} and ${b}.` : `${answer} divides both ${a} and ${b}.`,
    variantIdea: `Use ${a + 6} and ${b + 6} for a nearby factorization problem.`,
    difficulty: 4
  };
}

function remainderProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const a = 3 + (localIndex % 8);
  const b = 2 + ((localIndex * 2) % 7);
  const divisor = 5 + (localIndex % 6);
  const expression = a * b + localIndex;
  const answer = expression % divisor;

  return {
    statement: `What is the remainder when ${expression} is divided by ${divisor}?`,
    answer: String(answer),
    wrongAnswers: [String(divisor - answer), String(Math.floor(expression / divisor)), String(answer + divisor), String(expression - divisor), String(divisor)],
    solution: `${expression} = ${divisor}*${Math.floor(expression / divisor)} + ${answer}, so the remainder is ${answer}.`,
    hint1: "Write the number as divisor times quotient plus remainder.",
    hint2: `Find the largest multiple of ${divisor} not exceeding ${expression}.`,
    commonMistake: "The quotient is not the remainder.",
    whyCorrect: `After subtracting ${divisor}*${Math.floor(expression / divisor)}, ${answer} is left.`,
    variantIdea: `Find the remainder when ${expression + divisor + 1} is divided by ${divisor}.`,
    difficulty: 4
  };
}

function geometryProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const length = 5 + (localIndex % 10);
  const width = 3 + ((localIndex * 2) % 7);
  const askArea = localIndex % 2 === 0;
  const answer = askArea ? length * width : 2 * (length + width);

  return {
    statement: `A rectangle has length ${length} and width ${width}. What is its ${askArea ? "area" : "perimeter"}?`,
    answer: String(answer),
    wrongAnswers: [String(askArea ? 2 * (length + width) : length * width), String(length + width), String(2 * length + width), String(length * 2), String(width * 2)],
    solution: askArea
      ? `Area is length times width, so ${length}*${width} = ${answer}.`
      : `Perimeter is twice the sum of length and width, so 2(${length}+${width}) = ${answer}.`,
    hint1: askArea ? "Area measures square units inside the rectangle." : "Perimeter measures the distance around the rectangle.",
    hint2: askArea ? "Multiply length by width." : "Add all four side lengths.",
    commonMistake: "Area and perimeter use different formulas.",
    whyCorrect: askArea ? `The rectangle contains ${answer} unit squares.` : `The four side lengths add to ${answer}.`,
    variantIdea: `Change the width to ${width + 2}.`,
    difficulty: 2
  };
}

function circleProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const radius = 2 + (localIndex % 9);
  const askDiameter = localIndex % 2 === 0;
  const answer = askDiameter ? 2 * radius : `${2 * radius}pi`;

  return {
    statement: `A circle has radius ${radius}. What is its ${askDiameter ? "diameter" : "circumference in terms of pi"}?`,
    answer: String(answer),
    wrongAnswers: [String(radius), String(radius * radius), `${radius}pi`, `${radius * radius}pi`, String(2 * radius + 2)],
    solution: askDiameter ? `Diameter is twice the radius: 2*${radius} = ${2 * radius}.` : `Circumference is 2*pi*r, so C = 2*pi*${radius} = ${2 * radius}pi.`,
    hint1: askDiameter ? "The diameter goes across the circle through the center." : "Use C = 2*pi*r.",
    hint2: `The radius is ${radius}.`,
    commonMistake: "Do not confuse radius, diameter, circumference, and area.",
    whyCorrect: askDiameter ? `A diameter is made of two radii.` : `Substituting r=${radius} into 2*pi*r gives ${2 * radius}pi.`,
    variantIdea: `Use radius ${radius + 1}.`,
    difficulty: 3
  };
}

function pythagoreanProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15]];
  const [a, b, c] = triples[localIndex % triples.length];

  return {
    statement: `A right triangle has legs ${a} and ${b}. What is the hypotenuse?`,
    answer: String(c),
    wrongAnswers: [String(a + b), String(Math.abs(b - a)), String(a * b), String(c + 1), String(c - 1)],
    solution: `Use a^2 + b^2 = c^2: ${a}^2 + ${b}^2 = ${a * a + b * b} = ${c}^2, so the hypotenuse is ${c}.`,
    hint1: "The hypotenuse is opposite the right angle.",
    hint2: "Square both legs, add, then take the square root.",
    commonMistake: "Do not add the leg lengths directly.",
    whyCorrect: `${a}^2 + ${b}^2 = ${c}^2.`,
    variantIdea: `Use legs ${a * 2} and ${b * 2}.`,
    difficulty: 4
  };
}

function similarityProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const small = 3 + (localIndex % 7);
  const large = small * (2 + (localIndex % 4));
  const otherSmall = 4 + ((localIndex * 2) % 8);
  const scale = large / small;
  const answer = otherSmall * scale;

  return {
    statement: `Two similar figures have corresponding side lengths ${small} and ${large}. If another side on the smaller figure is ${otherSmall}, what is the corresponding larger side?`,
    answer: String(answer),
    wrongAnswers: [String(otherSmall + (large - small)), String(otherSmall + scale), String(otherSmall * small), String(answer + small), String(answer - small)],
    solution: `The scale factor is ${large}/${small} = ${scale}. Multiply ${otherSmall} by ${scale} to get ${answer}.`,
    hint1: "Similar figures use a multiplicative scale factor.",
    hint2: `Find the scale factor from ${small} to ${large}.`,
    commonMistake: "Do not add the difference between corresponding sides; use multiplication.",
    whyCorrect: `${otherSmall}:${answer} matches ${small}:${large}.`,
    variantIdea: `Use smaller side ${otherSmall + 1} with the same scale factor.`,
    difficulty: 4
  };
}

function triangleProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const angleA = 30 + ((localIndex * 5) % 50);
  const angleB = 40 + ((localIndex * 7) % 55);
  const answer = 180 - angleA - angleB;
  const safeAnswer = answer > 20 ? answer : answer + 30;
  const adjustedB = answer > 20 ? angleB : angleB - 30;

  return {
    statement: `The angles of a triangle are ${angleA} degrees, ${adjustedB} degrees, and x degrees. What is x?`,
    answer: String(safeAnswer),
    wrongAnswers: [String(180 - angleA), String(180 - adjustedB), String(Math.abs(angleA - adjustedB)), String(safeAnswer + 10), String(safeAnswer - 10)],
    solution: `Triangle angles sum to 180 degrees, so x = 180 - ${angleA} - ${adjustedB} = ${safeAnswer}.`,
    hint1: "The three angles in a triangle add to 180 degrees.",
    hint2: "Subtract both given angles from 180.",
    commonMistake: "Remember to subtract both known angles, not just one.",
    whyCorrect: `${angleA} + ${adjustedB} + ${safeAnswer} = 180.`,
    variantIdea: `Change one given angle to ${angleA + 5} degrees.`,
    difficulty: 2
  };
}

function countingProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const shirts = 2 + (localIndex % 5);
  const pants = 3 + ((localIndex * 2) % 5);
  const hats = 1 + ((localIndex + 1) % 4);
  const answer = shirts * pants * hats;

  return {
    statement: `A student can choose from ${shirts} shirts, ${pants} pairs of pants, and ${hats} hats. How many outfits are possible?`,
    answer: String(answer),
    wrongAnswers: [String(shirts + pants + hats), String(shirts * pants + hats), String(shirts + pants * hats), String(answer - hats), String(answer + shirts)],
    solution: `Use the multiplication principle: ${shirts}*${pants}*${hats} = ${answer}.`,
    hint1: "For independent choices, multiply the number of options.",
    hint2: "Choose a shirt, then pants, then a hat.",
    commonMistake: "Adding options counts only categories, not combinations across categories.",
    whyCorrect: `Each of ${shirts} shirt choices pairs with ${pants} pants choices and ${hats} hat choices.`,
    variantIdea: `Add one more hat option and recount.`,
    difficulty: 3
  };
}

function statisticsProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const count = 4;
  const oldAverage = 8 + (localIndex % 8);
  const newAverage = oldAverage + 1 + (localIndex % 3);
  const oldTotal = count * oldAverage;
  const newTotal = (count + 1) * newAverage;
  const answer = newTotal - oldTotal;

  return {
    statement: `${count} numbers have average ${oldAverage}. What number should be added so the new average is ${newAverage}?`,
    answer: String(answer),
    wrongAnswers: [String(newAverage), String(oldAverage), String(newAverage - oldAverage), String(oldTotal), String(answer + 2)],
    solution: `The old total is ${count}*${oldAverage} = ${oldTotal}. The new total must be ${count + 1}*${newAverage} = ${newTotal}, so the added number is ${answer}.`,
    hint1: "Average times number of values gives the total.",
    hint2: "Compare the required new total with the old total.",
    commonMistake: "The added number does not have to equal the new average.",
    whyCorrect: `The new total is ${oldTotal} + ${answer} = ${newTotal}, and ${newTotal}/${count + 1} = ${newAverage}.`,
    variantIdea: `Use a target average of ${newAverage + 1}.`,
    difficulty: 4
  };
}

function probabilityProblem({ localIndex }: GeneratorInput): GeneratedProblem {
  const red = 2 + (localIndex % 6);
  const blue = 3 + ((localIndex * 2) % 7);
  const total = red + blue;
  const answer = simplifyFraction(red, total);

  return {
    statement: `A bag has ${red} red marbles and ${blue} blue marbles. One marble is chosen at random. What is the probability it is red?`,
    answer,
    wrongAnswers: [simplifyFraction(blue, total), simplifyFraction(red, blue), simplifyFraction(total, red), simplifyFraction(1, red), simplifyFraction(red + 1, total)],
    solution: `There are ${total} marbles total and ${red} are red, so the probability is ${red}/${total} = ${answer}.`,
    hint1: "Probability is favorable outcomes over total outcomes.",
    hint2: `The total number of marbles is ${red} + ${blue}.`,
    commonMistake: "Do not compare red only to blue; compare red to the total.",
    whyCorrect: `There are ${red} favorable outcomes among ${total} equally likely outcomes.`,
    variantIdea: `Change the number of blue marbles to ${blue + 2}.`,
    difficulty: 3
  };
}

function labelChoices(answer: string, wrongAnswers: string[]) {
  const values = unique([answer, ...wrongAnswers]).slice(0, 5);
  let filler = 1;
  while (values.length < 5) {
    const next = String(Number(answer) + filler);
    if (!values.includes(next)) values.push(next);
    filler += 1;
  }

  const shift = Math.abs(hash(answer)) % 5;
  const ordered = rotate(values, shift);

  return ordered.map((value, index) => ({
    label: String.fromCharCode(65 + index),
    value
  }));
}

function readExistingProblems(): RawProblem[] {
  if (!fs.existsSync(SOURCE_PATH)) return [];
  return JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8")) as RawProblem[];
}

function nextNumericId(problems: RawProblem[]) {
  const ids = problems
    .map((problem) => problem.id.match(/^aops_prealg_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);

  return ids.length > 0 ? Math.max(...ids) + 1 : START_ID;
}

function nextAppNumericId() {
  if (!fs.existsSync(APP_PROBLEMS_PATH)) return START_ID;

  const problems = JSON.parse(fs.readFileSync(APP_PROBLEMS_PATH, "utf8")) as Array<{ id?: string }>;
  const ids = problems
    .map((problem) => problem.id?.match(/^aops_prealg_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);

  return ids.length > 0 ? Math.max(...ids) + 1 : START_ID;
}

function chapterOrder(chapter: string) {
  const index = CHAPTERS.findIndex((item) => item.chapter === chapter);
  return index >= 0 ? index + 1 : 99;
}

function difficultyFor(localIndex: number) {
  if (localIndex <= 6) return 2;
  if (localIndex <= 15) return 3;
  return 4;
}

function distractorExplanation(value: string, answer: string, problemType: string) {
  return `Chooses ${value}, which is a plausible ${problemType.replace(/_/g, " ")} distractor instead of the correct answer ${answer}.`;
}

function simplifyFraction(numerator: number, denominator: number) {
  if (denominator < 0) return simplifyFraction(-numerator, -denominator);
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  const n = numerator / divisor;
  const d = denominator / divisor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function formatSigned(value: number) {
  return value < 0 ? ` - ${Math.abs(value)}` : ` + ${value}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function rotate<T>(values: T[], shift: number) {
  return [...values.slice(shift), ...values.slice(0, shift)];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function groupBy<T>(values: T[], keyFor: (value: T) => string) {
  const grouped = new Map<string, T[]>();
  values.forEach((value) => {
    const key = keyFor(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  });
  return grouped;
}

function hash(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
