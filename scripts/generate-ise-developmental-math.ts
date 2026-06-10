import fs from "fs";
import path from "path";

type Layer = "Foundation" | "Standard" | "Honors";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
type AnswerType = "numeric" | "fraction" | "symbolic" | "text" | "multiple_choice" | "manual";

type GeneratedProblem = {
  id: string;
  statement: string;
  answer: string;
  answer_type: AnswerType;
  choices: string;
  difficulty: string;
  concepts: string;
  skills: string;
  patterns: string;
  misconceptions: string;
  solution: string;
  course: string;
  theme: string;
  chapter: string;
  chapter_title: string;
  sequence: string;
  source_collection: string;
  source_file: string;
  taxonomy_layer: Layer;
  taxonomy_stage: Stage;
  problem_type: string;
  cognitive_tags: string;
  estimated_time_seconds: string;
  notes: string;
};

type DistractorRow = {
  problem_id: string;
  choice_label: string;
  value: string;
  misconception: string;
  cognitive_tag: string;
  explanation: string;
};

type ExplanationRow = {
  problem_id: string;
  hint_1: string;
  hint_2: string;
  step_by_step: string;
  common_mistake: string;
  why_correct: string;
  variant_idea: string;
};

type ProblemDraft = {
  statement: string;
  answer: string;
  wrongs: string[];
  solution: string;
  concepts: string[];
  skills?: string[];
  patterns?: string[];
  misconceptions?: string[];
  course?: string;
  theme: string;
  chapter: string;
  chapterTitle: string;
  sequenceBase: number;
  difficulty: number;
  layer: Layer;
  stage: Stage;
  problemType: string;
  cognitiveTags: string[];
  estimatedTimeSeconds?: number;
  hint1?: string;
  hint2?: string;
  commonMistake?: string;
  variantIdea?: string;
};

type Topic = {
  prefix: string;
  chapter: string;
  title: string;
  sourceSection: string;
  build: (variant: number) => ProblemDraft;
};

const SOURCE_COLLECTION = "ise_developmental_math_2e";
const SOURCE_FILE = "datasets/textbooks/ise-developmental-mathematics-2e/original_equivalent_v0";
const SOURCE_DIR = path.join(process.cwd(), "datasets/textbooks/ise-developmental-mathematics-2e");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const PROBLEMS_PER_TOPIC = 16;

const topics: Topic[] = [
  {
    prefix: "whole",
    chapter: "ise-devmath-01-whole-numbers",
    title: "Whole Numbers and Order of Operations",
    sourceSection: "Chapter 1 Whole Numbers",
    build: (i) => {
      const a = 120 + i * 7;
      const b = 18 + i;
      const c = 4 + (i % 5);
      const answer = a - b * c;
      return baseDraft({
        statement: `Compute ${a} - ${b} x ${c}.`,
        answer,
        wrongs: [a - b + c, (a - b) * c, a + b * c, answer + b],
        solution: `Use multiplication first: ${b} x ${c} = ${b * c}. Then ${a} - ${b * c} = ${answer}.`,
        concepts: ["arith_natural_numbers"],
        theme: "Number Systems and Operations",
        chapter: "ise-devmath-01-whole-numbers",
        chapterTitle: "Whole Numbers and Order of Operations",
        sequenceBase: 2100,
        difficulty: i < 4 ? 1 : 2,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["operation_order", "fluency_precision"],
        hint1: "Decide which operation must happen first.",
        hint2: "Multiply before subtracting.",
        commonMistake: "Subtracting before multiplying changes the value.",
        variantIdea: "Change the multiplier and ask for the same operation order."
      });
    }
  },
  {
    prefix: "integer",
    chapter: "ise-devmath-02-integers",
    title: "Integers and Absolute Value",
    sourceSection: "Chapter 2 Integers and Algebraic Expressions",
    build: (i) => {
      const a = 14 + i;
      const b = 31 + (i % 7) * 3;
      const c = 6 + (i % 6);
      const answer = a - b + c;
      return baseDraft({
        statement: `Compute ${a} - ${b} + ${c}.`,
        answer,
        wrongs: [a + b + c, b - a + c, answer * -1, answer - c],
        solution: `${a} - ${b} = ${a - b}. Then ${a - b} + ${c} = ${answer}.`,
        concepts: ["arith_integers"],
        theme: "Number Systems and Operations",
        chapter: "ise-devmath-02-integers",
        chapterTitle: "Integers and Absolute Value",
        sequenceBase: 2200,
        difficulty: i < 3 ? 2 : 3,
        layer: i < 8 ? "Foundation" : "Standard",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["sign_error_risk", "fluency_precision"],
        hint1: "Track the sign after the subtraction.",
        hint2: "Rewrite subtraction as adding the opposite.",
        commonMistake: "Treating subtraction of a larger number as ordinary addition.",
        variantIdea: "Use a negative starting value and the same add/subtract pattern."
      });
    }
  },
  {
    prefix: "abs",
    chapter: "ise-devmath-02-integers",
    title: "Integers and Absolute Value",
    sourceSection: "2.1 Integers, Absolute Value, and Opposite",
    build: (i) => {
      const a = 12 + i;
      const b = 5 + (i % 4);
      const answer = Math.abs(-a) - Math.abs(-b);
      return baseDraft({
        statement: `Evaluate |-${a}| - |-${b}|.`,
        answer,
        wrongs: [-(a - b), a + b, -a - b, answer + b],
        solution: `|- ${a}| = ${a} and |- ${b}| = ${b}, so the value is ${a} - ${b} = ${answer}.`,
        concepts: ["arith_absolute_value", "arith_integers"],
        theme: "Number Systems and Operations",
        chapter: "ise-devmath-02-integers",
        chapterTitle: "Integers and Absolute Value",
        sequenceBase: 2250,
        difficulty: 2,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["number_line_distance", "sign_error_risk"],
        hint1: "Absolute value measures distance from zero.",
        hint2: "Find each absolute value before subtracting.",
        commonMistake: "Keeping the negative sign inside absolute value.",
        variantIdea: "Use one positive and one negative number inside the bars."
      });
    }
  },
  {
    prefix: "like",
    chapter: "ise-devmath-03-equations",
    title: "Expressions and Linear Equations",
    sourceSection: "3.1 Simplifying Expressions and Combining Like Terms",
    build: (i) => {
      const a = 2 + (i % 5);
      const b = 3 + (i % 4);
      const c = 5 + i;
      const d = 2 + (i % 3);
      const xCoef = a + b;
      const constant = c - d;
      const answer = `${xCoef}x+${constant}`;
      return baseDraft({
        statement: `Simplify ${a}x + ${c} + ${b}x - ${d}.`,
        answer,
        wrongs: [`${xCoef}x+${c + d}`, `${a + c}x+${b - d}`, `${a * b}x+${constant}`, `${xCoef + constant}x`],
        solution: `Combine x-terms: ${a}x + ${b}x = ${xCoef}x. Combine constants: ${c} - ${d} = ${constant}.`,
        concepts: ["prealg_simplification", "prealg_expressions"],
        theme: "Expressions and Equations",
        chapter: "ise-devmath-03-equations",
        chapterTitle: "Expressions and Linear Equations",
        sequenceBase: 2300,
        difficulty: 2 + (i > 7 ? 1 : 0),
        layer: "Standard",
        stage: "Bridge",
        problemType: "expression_simplification",
        cognitiveTags: ["like_terms", "symbolic_fluency"],
        hint1: "Group like terms first.",
        hint2: "Only x-terms combine with x-terms.",
        commonMistake: "Combining constants with coefficients.",
        variantIdea: "Add a negative coefficient and simplify again."
      });
    }
  },
  {
    prefix: "eq1",
    chapter: "ise-devmath-03-equations",
    title: "Expressions and Linear Equations",
    sourceSection: "3.2 Addition and Subtraction Properties of Equality",
    build: (i) => {
      const x = 4 + i;
      const add = 7 + (i % 5);
      const rhs = x + add;
      return baseDraft({
        statement: `Solve x + ${add} = ${rhs}.`,
        answer: x,
        wrongs: [rhs + add, rhs - add + 1, add - rhs, rhs],
        solution: `Subtract ${add} from both sides: x = ${rhs} - ${add} = ${x}.`,
        concepts: ["alg_linear_equations"],
        theme: "Linear Equations",
        chapter: "ise-devmath-03-equations",
        chapterTitle: "Expressions and Linear Equations",
        sequenceBase: 2350,
        difficulty: 2,
        layer: "Foundation",
        stage: "Algebra Readiness",
        problemType: "equation_solving",
        cognitiveTags: ["inverse_operations", "operation_selection"],
        hint1: "Undo the addition.",
        hint2: `Subtract ${add} from both sides.`,
        commonMistake: "Adding the same number again instead of undoing it.",
        variantIdea: "Use x - a = b and solve by addition."
      });
    }
  },
  {
    prefix: "eq2",
    chapter: "ise-devmath-03-equations",
    title: "Expressions and Linear Equations",
    sourceSection: "3.4 Solving Equations with Multiple Steps",
    build: (i) => {
      const x = 3 + i;
      const m = 2 + (i % 4);
      const b = 5 + (i % 6);
      const rhs = m * x + b;
      return baseDraft({
        statement: `Solve ${m}x + ${b} = ${rhs}.`,
        answer: x,
        wrongs: [rhs - b, Math.floor(rhs / m), x + b, -x],
        solution: `Subtract ${b}: ${m}x = ${rhs - b}. Divide by ${m}: x = ${x}.`,
        concepts: ["alg_linear_equations", "prealg_simplification"],
        theme: "Linear Equations",
        chapter: "ise-devmath-03-equations",
        chapterTitle: "Expressions and Linear Equations",
        sequenceBase: 2400,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "equation_solving",
        cognitiveTags: ["inverse_operations", "multi_step_planning"],
        hint1: "Undo addition before multiplication.",
        hint2: "Use two inverse operations in order.",
        commonMistake: "Dividing before clearing the constant term.",
        variantIdea: "Put a subtraction constant on the left side."
      });
    }
  },
  {
    prefix: "frac",
    chapter: "ise-devmath-04-fractions",
    title: "Fractions and Mixed Numbers",
    sourceSection: "Chapter 4 Fractions and Mixed Numbers",
    build: (i) => {
      const a = 1 + (i % 4);
      const b = 3 + (i % 5);
      const c = 1 + ((i + 2) % 4);
      const d = b + 1 + (i % 3);
      const n = a * d + c * b;
      const den = b * d;
      const [sn, sd] = reduce(n, den);
      return baseDraft({
        statement: `Compute ${a}/${b} + ${c}/${d}.`,
        answer: `${sn}/${sd}`,
        wrongs: [`${a + c}/${b + d}`, `${n}/${den}`, `${a + c}/${den}`, `${Math.abs(a * d - c * b)}/${den}`],
        solution: `Use denominator ${den}: ${a}/${b} = ${a * d}/${den} and ${c}/${d} = ${c * b}/${den}. The sum is ${n}/${den} = ${sn}/${sd}.`,
        concepts: ["arith_fractions"],
        theme: "Fractions, Decimals, Ratios, and Percents",
        chapter: "ise-devmath-04-fractions",
        chapterTitle: "Fractions and Mixed Numbers",
        sequenceBase: 2500,
        difficulty: 3,
        layer: "Standard",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["fraction_fluency", "common_denominator"],
        hint1: "Find a common denominator.",
        hint2: "Rewrite both fractions before adding numerators.",
        commonMistake: "Adding denominators directly.",
        variantIdea: "Use one denominator that is a multiple of the other."
      });
    }
  },
  {
    prefix: "mixed",
    chapter: "ise-devmath-04-fractions",
    title: "Fractions and Mixed Numbers",
    sourceSection: "4.6 Estimation and Operations on Mixed Numbers",
    build: (i) => {
      const whole = 2 + (i % 4);
      const n = 1 + (i % 3);
      const d = 4 + (i % 4);
      const multiplier = 2 + (i % 3);
      const improper = whole * d + n;
      const num = improper * multiplier;
      const [sn, sd] = reduce(num, d);
      return baseDraft({
        statement: `Compute ${multiplier} x ${whole} ${n}/${d}.`,
        answer: `${sn}/${sd}`,
        wrongs: [`${multiplier * whole + n}/${d}`, `${num}/${d}`, `${whole * multiplier}/${d}`, `${improper + multiplier}/${d}`],
        solution: `Convert ${whole} ${n}/${d} to ${improper}/${d}. Then ${multiplier} x ${improper}/${d} = ${num}/${d} = ${sn}/${sd}.`,
        concepts: ["arith_mixed_numbers", "arith_fractions"],
        theme: "Fractions, Decimals, Ratios, and Percents",
        chapter: "ise-devmath-04-fractions",
        chapterTitle: "Fractions and Mixed Numbers",
        sequenceBase: 2550,
        difficulty: 3,
        layer: "Standard",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["fraction_fluency", "part_whole_reasoning"],
        hint1: "Convert the mixed number first.",
        hint2: "Multiply the whole-number multiplier by the improper fraction.",
        commonMistake: "Multiplying only the whole-number part.",
        variantIdea: "Ask for a product of two mixed numbers."
      });
    }
  },
  {
    prefix: "dec",
    chapter: "ise-devmath-05-decimals",
    title: "Decimals and Applications",
    sourceSection: "Chapter 5 Decimals",
    build: (i) => {
      const a = 12.4 + i / 10;
      const b = 0.6 + (i % 5) / 10;
      const answer = round2(a * b);
      return baseDraft({
        statement: `Compute ${fmt(a)} x ${fmt(b)}.`,
        answer,
        wrongs: [round2((a * b) / 10), round2(a + b), round2(a * (b + 1)), round2(answer + b)],
        solution: `Multiply as whole numbers and place the decimal: ${fmt(a)} x ${fmt(b)} = ${answer}.`,
        concepts: ["arith_decimals"],
        theme: "Fractions, Decimals, Ratios, and Percents",
        chapter: "ise-devmath-05-decimals",
        chapterTitle: "Decimals and Applications",
        sequenceBase: 2600,
        difficulty: 2 + (i > 6 ? 1 : 0),
        layer: "Foundation",
        stage: "Foundation",
        problemType: "computation",
        cognitiveTags: ["decimal_place_value", "fluency_precision"],
        hint1: "Count decimal places after multiplying.",
        hint2: "The product should be close to an estimate.",
        commonMistake: "Putting the decimal point one place too far left.",
        variantIdea: "Use a decimal divisor and ask for a quotient."
      });
    }
  },
  {
    prefix: "ratio",
    chapter: "ise-devmath-06-ratio-proportion",
    title: "Ratio and Proportion",
    sourceSection: "Chapter 6 Ratio and Proportion",
    build: (i) => {
      const a = 3 + (i % 5);
      const b = 5 + (i % 6);
      const scale = 2 + (i % 4);
      return baseDraft({
        statement: `A recipe uses ${a} cups of oats for ${b} servings. How many cups are needed for ${b * scale} servings?`,
        answer: a * scale,
        wrongs: [a + scale, b * scale, a * scale + b, Math.max(1, a * scale - scale)],
        solution: `${b * scale} servings is ${scale} times as many servings, so use ${scale} x ${a} = ${a * scale} cups.`,
        concepts: ["arith_ratios", "arith_proportions"],
        theme: "Arithmetic and Proportional Reasoning",
        chapter: "ise-devmath-06-ratio-proportion",
        chapterTitle: "Ratio and Proportion",
        sequenceBase: 2700,
        difficulty: 3,
        layer: "Standard",
        stage: "Foundation",
        problemType: "proportional_reasoning",
        cognitiveTags: ["multiplicative_reasoning", "unit_rate_modeling"],
        hint1: "Compare the number of servings.",
        hint2: "Scale both quantities by the same factor.",
        commonMistake: "Adding the scale factor instead of multiplying.",
        variantIdea: "Ask for the servings given the ingredient amount."
      });
    }
  },
  {
    prefix: "percent",
    chapter: "ise-devmath-07-percents",
    title: "Percents and Percent Applications",
    sourceSection: "Chapter 7 Percents",
    build: (i) => {
      const price = 40 + i * 5;
      const pct = [10, 15, 20, 25][i % 4];
      const answer = round2(price * (1 - pct / 100));
      return baseDraft({
        statement: `A $${price} item is discounted by ${pct}%. What is the sale price?`,
        answer,
        wrongs: [round2(price * pct / 100), round2(price * (1 + pct / 100)), price - pct, round2(answer + pct)],
        solution: `The discount is ${pct}% of ${price}, or ${round2(price * pct / 100)}. The sale price is ${price} - ${round2(price * pct / 100)} = ${answer}.`,
        concepts: ["arith_percentages"],
        theme: "Arithmetic and Proportional Reasoning",
        chapter: "ise-devmath-07-percents",
        chapterTitle: "Percents and Percent Applications",
        sequenceBase: 2800,
        difficulty: 3,
        layer: "Standard",
        stage: "Foundation",
        problemType: "proportional_reasoning",
        cognitiveTags: ["part_whole_reasoning", "multiplicative_reasoning"],
        hint1: "Find the discount amount first.",
        hint2: "Subtract the discount from the original price.",
        commonMistake: "Reporting the discount amount instead of the sale price.",
        variantIdea: "Use a markup instead of a discount."
      });
    }
  },
  {
    prefix: "pyth",
    chapter: "ise-devmath-08-geometry",
    title: "Measurement and Geometry",
    sourceSection: "8.6 Triangles and the Pythagorean Theorem",
    build: (i) => {
      const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]];
      const scale = 1 + Math.floor(i / triples.length);
      const [a, b, c] = triples[i % triples.length].map((value) => value * scale);
      return baseDraft({
        statement: `A right triangle has legs ${a} and ${b}. What is the hypotenuse?`,
        answer: c,
        wrongs: [a + b, Math.abs(b - a), c + 2, a * b],
        solution: `Use a^2 + b^2 = c^2. Here ${a}^2 + ${b}^2 = ${c * c}, so c = ${c}.`,
        concepts: ["geo_pythagorean", "geo_triangles"],
        theme: "Geometry and Measurement",
        chapter: "ise-devmath-08-geometry",
        chapterTitle: "Measurement and Geometry",
        sequenceBase: 2900,
        difficulty: 3,
        layer: "Standard",
        stage: "AMC8 Transfer",
        problemType: "geometric_measurement",
        cognitiveTags: ["formula_selection", "spatial_numeric_mapping"],
        hint1: "Use the right-triangle relationship.",
        hint2: "Square the legs, add, then take the square root.",
        commonMistake: "Adding the side lengths directly.",
        variantIdea: "Give the hypotenuse and one leg, then ask for the missing leg."
      });
    }
  },
  {
    prefix: "area",
    chapter: "ise-devmath-08-geometry",
    title: "Measurement and Geometry",
    sourceSection: "8.7 Perimeter, Circumference, and Area",
    build: (i) => {
      const base = 8 + i;
      const height = 5 + (i % 7);
      const answer = (base * height) / 2;
      return baseDraft({
        statement: `Find the area of a triangle with base ${base} and height ${height}.`,
        answer,
        wrongs: [base * height, base + height, 2 * (base + height), answer + height],
        solution: `Triangle area is (1/2)bh = (1/2)(${base})(${height}) = ${answer}.`,
        concepts: ["geo_area", "geo_triangles"],
        theme: "Geometry and Measurement",
        chapter: "ise-devmath-08-geometry",
        chapterTitle: "Measurement and Geometry",
        sequenceBase: 2920,
        difficulty: 2,
        layer: "Foundation",
        stage: "AMC8 Transfer",
        problemType: "geometric_measurement",
        cognitiveTags: ["formula_selection", "unit_dimension_reasoning"],
        hint1: "Use the triangle area formula.",
        hint2: "Take half of base times height.",
        commonMistake: "Using rectangle area instead of triangle area.",
        variantIdea: "Ask for height when area and base are known."
      });
    }
  },
  {
    prefix: "stats",
    chapter: "ise-devmath-09-graphs-statistics",
    title: "Graphs, Probability, and Statistics",
    sourceSection: "9.5 Mean, Median, and Mode",
    build: (i) => {
      const values = [6 + i, 8 + i, 10 + i, 12 + i, 14 + i];
      const answer = values.reduce((sum, value) => sum + value, 0) / values.length;
      return baseDraft({
        statement: `Find the mean of ${values.join(", ")}.`,
        answer,
        wrongs: [values[2], values[0], values.at(-1) ?? answer, answer + values.length],
        solution: `Add the values to get ${answer * values.length}. Divide by ${values.length}: ${answer}.`,
        concepts: ["stats_mean"],
        theme: "Data, Counting, and Probability",
        chapter: "ise-devmath-09-graphs-statistics",
        chapterTitle: "Graphs, Probability, and Statistics",
        sequenceBase: 3000,
        difficulty: 2,
        layer: "Foundation",
        stage: "AMC8 Transfer",
        problemType: "data_reasoning",
        cognitiveTags: ["mean_as_balance", "fluency_precision"],
        hint1: "Mean is total divided by count.",
        hint2: "There are five numbers.",
        commonMistake: "Choosing the middle value instead of averaging.",
        variantIdea: "Ask for a missing data value given the mean."
      });
    }
  },
  {
    prefix: "prob",
    chapter: "ise-devmath-09-graphs-statistics",
    title: "Graphs, Probability, and Statistics",
    sourceSection: "9.4 Introduction to Probability",
    build: (i) => {
      const red = 2 + (i % 5);
      const blue = 5 + (i % 4);
      const total = red + blue;
      const [n, d] = reduce(red, total);
      return baseDraft({
        statement: `A bag has ${red} red tiles and ${blue} blue tiles. What is the probability of choosing a red tile?`,
        answer: `${n}/${d}`,
        wrongs: [`${blue}/${total}`, `${red}/${blue}`, `${red}/${total + red}`, `${total}/${red}`],
        solution: `There are ${total} tiles total and ${red} favorable outcomes, so the probability is ${red}/${total} = ${n}/${d}.`,
        concepts: ["counting_probability"],
        theme: "Data, Counting, and Probability",
        chapter: "ise-devmath-09-graphs-statistics",
        chapterTitle: "Graphs, Probability, and Statistics",
        sequenceBase: 3050,
        difficulty: 2,
        layer: "Foundation",
        stage: "AMC8 Transfer",
        problemType: "probability_modeling",
        cognitiveTags: ["fraction_as_probability", "sample_space_modeling"],
        hint1: "Probability is favorable outcomes over total outcomes.",
        hint2: "The total includes both colors.",
        commonMistake: "Using only the non-red tiles as the denominator.",
        variantIdea: "Ask for the probability of not choosing red."
      });
    }
  },
  {
    prefix: "ineq",
    chapter: "ise-devmath-10-linear-equations-inequalities",
    title: "Linear Equations and Inequalities",
    sourceSection: "10.8 Linear Inequalities",
    build: (i) => {
      const x = 3 + i;
      const a = 2 + (i % 4);
      const b = 5 + (i % 6);
      const rhs = a * x + b;
      return baseDraft({
        statement: `Solve ${a}x + ${b} < ${rhs}.`,
        answer: `x<${x}`,
        wrongs: [`x>${x}`, `x<${rhs - b}`, `x<${x + b}`, `x>${rhs}`],
        solution: `Subtract ${b}: ${a}x < ${rhs - b}. Divide by positive ${a}: x < ${x}.`,
        concepts: ["alg_linear_inequalities", "alg_linear_equations"],
        theme: "Linear Equations",
        chapter: "ise-devmath-10-linear-equations-inequalities",
        chapterTitle: "Linear Equations and Inequalities",
        sequenceBase: 3100,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "inequality_solving",
        cognitiveTags: ["relation_direction", "inverse_operations"],
        hint1: "Solve like an equation while tracking the inequality sign.",
        hint2: "You divide by a positive number, so the sign stays the same.",
        commonMistake: "Reversing the sign when dividing by a positive number.",
        variantIdea: "Use a negative coefficient so the inequality reverses."
      });
    }
  },
  {
    prefix: "slope",
    chapter: "ise-devmath-11-graphing-lines",
    title: "Graphing Linear Equations",
    sourceSection: "11.3 Slope of a Line and Rate of Change",
    build: (i) => {
      const x1 = 1 + (i % 4);
      const y1 = 2 + i;
      const dx = 2 + (i % 5);
      const dy = 3 + (i % 4);
      const [n, d] = reduce(dy, dx);
      return baseDraft({
        statement: `Find the slope of the line through (${x1}, ${y1}) and (${x1 + dx}, ${y1 + dy}).`,
        answer: `${n}/${d}`,
        wrongs: [`${dx}/${dy}`, `${y1 + dy - x1 - dx}/${dx}`, `${dy + dx}/${dx}`, `${dy}/${dx + 1}`],
        solution: `Slope is change in y over change in x: (${y1 + dy} - ${y1}) / (${x1 + dx} - ${x1}) = ${dy}/${dx} = ${n}/${d}.`,
        concepts: ["alg_graphing", "alg_functions"],
        theme: "Linear Equations",
        chapter: "ise-devmath-11-graphing-lines",
        chapterTitle: "Graphing Linear Equations",
        sequenceBase: 3200,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "coordinate_reasoning",
        cognitiveTags: ["rate_of_change", "coordinate_precision"],
        hint1: "Slope compares vertical change to horizontal change.",
        hint2: "Subtract y-values and x-values in the same order.",
        commonMistake: "Using change in x over change in y.",
        variantIdea: "Give a graph-like table and ask for the slope."
      });
    }
  },
  {
    prefix: "line",
    chapter: "ise-devmath-11-graphing-lines",
    title: "Graphing Linear Equations",
    sourceSection: "11.4 Slope-Intercept Form of a Linear Equation",
    build: (i) => {
      const m = 1 + (i % 5);
      const b = 2 + (i % 6);
      const x = 3 + i;
      const answer = m * x + b;
      return baseDraft({
        statement: `For y = ${m}x + ${b}, find y when x = ${x}.`,
        answer,
        wrongs: [m + x + b, m * b + x, answer - b, answer + m],
        solution: `Substitute x = ${x}: y = ${m}(${x}) + ${b} = ${answer}.`,
        concepts: ["alg_functions", "alg_graphing"],
        theme: "Linear Equations",
        chapter: "ise-devmath-11-graphing-lines",
        chapterTitle: "Graphing Linear Equations",
        sequenceBase: 3250,
        difficulty: 2,
        layer: "Foundation",
        stage: "Algebra Readiness",
        problemType: "function_evaluation",
        cognitiveTags: ["symbol_evaluation", "rate_of_change"],
        hint1: "Substitute the x-value into the rule.",
        hint2: "Multiply before adding the intercept.",
        commonMistake: "Adding all visible numbers without substitution.",
        variantIdea: "Ask for x when y is given."
      });
    }
  },
  {
    prefix: "system",
    chapter: "ise-devmath-12-systems",
    title: "Systems of Linear Equations",
    sourceSection: "Chapter 12 Systems of Linear Equations in Two Variables",
    build: (i) => {
      const x = 2 + (i % 6);
      const y = 1 + (i % 5);
      const sum = x + y;
      const diff = x - y;
      return baseDraft({
        statement: `Solve the system x + y = ${sum} and x - y = ${diff}. What is x?`,
        answer: x,
        wrongs: [y, sum, diff, x + y],
        solution: `Add the equations: 2x = ${sum + diff}, so x = ${x}.`,
        concepts: ["alg_systems", "alg_linear_equations"],
        theme: "Linear Equations",
        chapter: "ise-devmath-12-systems",
        chapterTitle: "Systems of Linear Equations",
        sequenceBase: 3300,
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "equation_solving",
        cognitiveTags: ["multi_step_planning", "structure_recognition"],
        hint1: "Look for a way to eliminate y.",
        hint2: "Add the two equations.",
        commonMistake: "Reporting y or the sum instead of solving for x.",
        variantIdea: "Ask for y after solving for x."
      });
    }
  },
  {
    prefix: "exp",
    chapter: "ise-devmath-13-exponents-polynomials",
    title: "Exponents and Polynomials",
    sourceSection: "13.1 Multiplying and Dividing Expressions With Common Bases",
    build: (i) => {
      const a = 2 + (i % 4);
      const b = 3 + (i % 5);
      return baseDraft({
        statement: `Simplify x^${a} x x^${b}.`,
        answer: `x^${a + b + 1}`,
        wrongs: [`x^${a * b}`, `x^${a + b}`, `2x^${a + b}`, `x^${Math.abs(a - b)}`],
        solution: `When multiplying powers with the same base, add exponents: ${a} + 1 + ${b} = ${a + b + 1}.`,
        concepts: ["arith_exponents", "prealg_simplification"],
        theme: "Expressions and Equations",
        chapter: "ise-devmath-13-exponents-polynomials",
        chapterTitle: "Exponents and Polynomials",
        sequenceBase: 3400,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "expression_simplification",
        cognitiveTags: ["exponent_meaning", "symbolic_fluency"],
        hint1: "The base is the same in each factor.",
        hint2: "Add exponents when multiplying like bases.",
        commonMistake: "Multiplying exponents instead of adding them.",
        variantIdea: "Use division of powers with the same base."
      });
    }
  },
  {
    prefix: "factor",
    chapter: "ise-devmath-14-factoring",
    title: "Factoring and Quadratic Equations",
    sourceSection: "Chapter 14 Factoring Polynomials",
    build: (i) => {
      const r = 2 + (i % 5);
      const s = 3 + (i % 6);
      return baseDraft({
        statement: `Factor x^2 + ${r + s}x + ${r * s}.`,
        answer: `(x+${r})(x+${s})`,
        wrongs: [`(x+${r + s})(x+${r * s})`, `(x-${r})(x-${s})`, `(x+${r})(x+${r * s})`, `x(x+${r + s})+${r * s}`],
        solution: `Find two numbers with sum ${r + s} and product ${r * s}: ${r} and ${s}. So the factorization is (x+${r})(x+${s}).`,
        concepts: ["alg_factoring", "alg_quadratics"],
        theme: "Expressions and Equations",
        chapter: "ise-devmath-14-factoring",
        chapterTitle: "Factoring and Quadratic Equations",
        sequenceBase: 3500,
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "expression_simplification",
        cognitiveTags: ["factor_structure", "structure_recognition"],
        hint1: "Look for two numbers with a target sum and product.",
        hint2: `The product is ${r * s} and the sum is ${r + s}.`,
        commonMistake: "Using the sum and product directly as binomial constants.",
        variantIdea: "Use a trinomial with a negative middle term."
      });
    }
  }
];

topics.push(...buildCoverageExpansion());

function buildCoverageExpansion(): Topic[] {
  return [
    {
      prefix: "round",
      chapter: "ise-devmath-01-whole-numbers",
      title: "Whole Numbers and Estimation",
      sourceSection: "1.3 Rounding and Estimating",
      build: (i) => {
        const value = 3842 + i * 137;
        const answer = Math.round(value / 100) * 100;
        return baseDraft({
          statement: `Round ${value} to the nearest hundred.`,
          answer,
          wrongs: [Math.floor(value / 100) * 100, Math.round(value / 10) * 10, Math.ceil(value / 100) * 100, value],
          solution: `Look at the tens digit of ${value}. Rounding to the nearest hundred gives ${answer}.`,
          concepts: ["arith_natural_numbers"],
          theme: "Number Systems and Operations",
          chapter: "ise-devmath-01-whole-numbers",
          chapterTitle: "Whole Numbers and Estimation",
          sequenceBase: 2120,
          difficulty: 1,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["place_value", "estimation"],
          hint1: "Find the hundreds place first.",
          hint2: "Use the tens digit to decide whether to round up.",
          commonMistake: "Rounding to the nearest ten instead of the nearest hundred.",
          variantIdea: "Round a larger number to the nearest thousand."
        });
      }
    },
    {
      prefix: "perim",
      chapter: "ise-devmath-01-whole-numbers",
      title: "Whole Numbers and Perimeter",
      sourceSection: "1.2 Addition and Subtraction of Whole Numbers and Perimeter",
      build: (i) => {
        const length = 14 + i;
        const width = 6 + (i % 8);
        const answer = 2 * (length + width);
        return baseDraft({
          statement: `Find the perimeter of a rectangle with length ${length} and width ${width}.`,
          answer,
          wrongs: [length * width, length + width, 2 * length + width, answer / 2],
          solution: `Rectangle perimeter is 2l + 2w = 2(${length}) + 2(${width}) = ${answer}.`,
          concepts: ["geo_perimeter", "arith_natural_numbers"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-01-whole-numbers",
          chapterTitle: "Whole Numbers and Perimeter",
          sequenceBase: 2140,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "geometric_measurement",
          cognitiveTags: ["formula_selection", "unit_dimension_reasoning"],
          hint1: "Perimeter measures distance around a shape.",
          hint2: "Add all four side lengths.",
          commonMistake: "Using area instead of perimeter.",
          variantIdea: "Give the perimeter and one side, then ask for the missing side."
        });
      }
    },
    {
      prefix: "meanwhole",
      chapter: "ise-devmath-01-whole-numbers",
      title: "Whole Numbers and Mean",
      sourceSection: "1.7 Mixed Applications and Computing Mean",
      build: (i) => {
        const values = [12 + i, 15 + i, 18 + i, 21 + i];
        const answer = values.reduce((sum, value) => sum + value, 0) / values.length;
        return baseDraft({
          statement: `Find the mean of ${values.join(", ")}.`,
          answer,
          wrongs: [values[1], values[2], answer + 2, values.reduce((sum, value) => sum + value, 0)],
          solution: `Add the four values to get ${answer * 4}. Divide by 4 to get ${answer}.`,
          concepts: ["stats_mean", "arith_natural_numbers"],
          theme: "Data, Counting, and Probability",
          chapter: "ise-devmath-01-whole-numbers",
          chapterTitle: "Whole Numbers and Mean",
          sequenceBase: 2160,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "data_reasoning",
          cognitiveTags: ["mean_as_balance", "fluency_precision"],
          hint1: "Mean is total divided by number of values.",
          hint2: "There are four values.",
          commonMistake: "Reporting the sum instead of dividing.",
          variantIdea: "Ask for a missing value given the mean."
        });
      }
    },
    {
      prefix: "intmult",
      chapter: "ise-devmath-02-integers",
      title: "Integer Multiplication and Division",
      sourceSection: "2.4 Multiplication and Division of Integers",
      build: (i) => {
        const a = 4 + (i % 7);
        const b = 3 + i;
        const answer = -a * b;
        return baseDraft({
          statement: `Compute (-${a}) x ${b}.`,
          answer,
          wrongs: [a * b, -a - b, a - b, answer + a],
          solution: `A negative times a positive is negative, and ${a} x ${b} = ${a * b}.`,
          concepts: ["arith_integers"],
          theme: "Number Systems and Operations",
          chapter: "ise-devmath-02-integers",
          chapterTitle: "Integer Multiplication and Division",
          sequenceBase: 2260,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["sign_error_risk", "fluency_precision"],
          hint1: "First decide the sign.",
          hint2: "Then multiply the absolute values.",
          commonMistake: "Forgetting that the product should be negative.",
          variantIdea: "Use two negative factors and compare the sign."
        });
      }
    },
    {
      prefix: "fracsimp",
      chapter: "ise-devmath-04-fractions",
      title: "Simplifying Fractions",
      sourceSection: "4.2 Simplifying Fractions",
      build: (i) => {
        const base = 2 + (i % 6);
        const n = base * (3 + (i % 5));
        const d = base * (7 + (i % 6));
        const [sn, sd] = reduce(n, d);
        return baseDraft({
          statement: `Simplify ${n}/${d}.`,
          answer: `${sn}/${sd}`,
          wrongs: [`${n - base}/${d - base}`, `${n}/${d}`, `${sn}/${d}`, `${n}/${sd}`],
          solution: `Divide numerator and denominator by their common factor ${gcd(n, d)} to get ${sn}/${sd}.`,
          concepts: ["arith_fractions"],
          theme: "Fractions, Decimals, Ratios, and Percents",
          chapter: "ise-devmath-04-fractions",
          chapterTitle: "Fractions and Mixed Numbers",
          sequenceBase: 2510,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["fraction_fluency", "common_factor"],
          hint1: "Look for a common factor.",
          hint2: "Divide the top and bottom by the same number.",
          commonMistake: "Changing only the numerator.",
          variantIdea: "Simplify a fraction with a larger greatest common factor."
        });
      }
    },
    {
      prefix: "fracmult",
      chapter: "ise-devmath-04-fractions",
      title: "Multiplying Fractions",
      sourceSection: "4.3 Multiplication and Division of Fractions",
      build: (i) => {
        const a = 2 + (i % 5);
        const b = 5 + (i % 6);
        const c = 3 + (i % 4);
        const d = 7 + (i % 5);
        const [sn, sd] = reduce(a * c, b * d);
        return baseDraft({
          statement: `Compute ${a}/${b} x ${c}/${d}.`,
          answer: `${sn}/${sd}`,
          wrongs: [`${a + c}/${b + d}`, `${a * c}/${b + d}`, `${a + c}/${b * d}`, `${a * d}/${b * c}`],
          solution: `Multiply numerators and denominators: (${a} x ${c})/(${b} x ${d}) = ${a * c}/${b * d} = ${sn}/${sd}.`,
          concepts: ["arith_fractions"],
          theme: "Fractions, Decimals, Ratios, and Percents",
          chapter: "ise-devmath-04-fractions",
          chapterTitle: "Fractions and Mixed Numbers",
          sequenceBase: 2520,
          difficulty: 3,
          layer: "Standard",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["fraction_fluency", "operation_selection"],
          hint1: "For multiplication, multiply across.",
          hint2: "Simplify the resulting fraction.",
          commonMistake: "Using addition rules for multiplication.",
          variantIdea: "Use division by a fraction and multiply by the reciprocal."
        });
      }
    },
    {
      prefix: "fraceq",
      chapter: "ise-devmath-04-fractions",
      title: "Equations Containing Fractions",
      sourceSection: "4.8 Solving Equations Containing Fractions",
      build: (i) => {
        const d = 2 + (i % 5);
        const x = d * (3 + i);
        const rhs = x / d;
        return baseDraft({
          statement: `Solve x/${d} = ${fmt(rhs)}.`,
          answer: x,
          wrongs: [rhs, x + d, Math.max(1, x - d), x * d],
          solution: `Multiply both sides by ${d}: x = ${fmt(rhs)} x ${d} = ${x}.`,
          concepts: ["alg_linear_equations", "arith_fractions"],
          theme: "Linear Equations",
          chapter: "ise-devmath-04-fractions",
          chapterTitle: "Fractions and Mixed Numbers",
          sequenceBase: 2580,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["inverse_operations", "fraction_fluency"],
          hint1: "Undo division by multiplying.",
          hint2: `Multiply both sides by ${d}.`,
          commonMistake: "Dividing by the denominator again.",
          variantIdea: "Use a two-step equation with a fractional coefficient."
        });
      }
    },
    {
      prefix: "decadd",
      chapter: "ise-devmath-05-decimals",
      title: "Decimal Addition and Subtraction",
      sourceSection: "5.2 Addition and Subtraction of Decimals",
      build: (i) => {
        const a = 8.35 + i / 10;
        const b = 2.4 + (i % 5) / 100;
        const answer = round2(a + b);
        return baseDraft({
          statement: `Compute ${fmt2(a)} + ${fmt2(b)}.`,
          answer,
          wrongs: [round2(a + b * 10), round2(a - b), round2(answer + 1), round2(answer / 10)],
          solution: `Align decimal places and add: ${fmt2(a)} + ${fmt2(b)} = ${fmt2(answer)}.`,
          concepts: ["arith_decimals"],
          theme: "Fractions, Decimals, Ratios, and Percents",
          chapter: "ise-devmath-05-decimals",
          chapterTitle: "Decimals and Applications",
          sequenceBase: 2610,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["decimal_place_value", "fluency_precision"],
          hint1: "Line up the decimal points.",
          hint2: "Add place by place.",
          commonMistake: "Adding digits without aligning place value.",
          variantIdea: "Use subtraction with borrowing across a decimal."
        });
      }
    },
    {
      prefix: "decdiv",
      chapter: "ise-devmath-05-decimals",
      title: "Decimal Division",
      sourceSection: "5.4 Division of Decimals",
      build: (i) => {
        const divisor = [0.2, 0.4, 0.5, 0.8][i % 4];
        const answer = 6 + i;
        const dividend = round2(divisor * answer);
        return baseDraft({
          statement: `Compute ${fmt2(dividend)} / ${fmt(divisor)}.`,
          answer,
          wrongs: [round2(dividend * divisor), round2(dividend / 10), answer * 10, answer + divisor],
          solution: `${fmt2(dividend)} divided by ${fmt(divisor)} equals ${answer} because ${fmt(divisor)} x ${answer} = ${fmt2(dividend)}.`,
          concepts: ["arith_decimals"],
          theme: "Fractions, Decimals, Ratios, and Percents",
          chapter: "ise-devmath-05-decimals",
          chapterTitle: "Decimals and Applications",
          sequenceBase: 2640,
          difficulty: 3,
          layer: "Standard",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["decimal_place_value", "operation_selection"],
          hint1: "Think of division as a missing factor.",
          hint2: "Check by multiplying the divisor by the quotient.",
          commonMistake: "Moving the decimal point in the wrong direction.",
          variantIdea: "Use a decimal divisor greater than 1."
        });
      }
    },
    {
      prefix: "deceq",
      chapter: "ise-devmath-05-decimals",
      title: "Decimal Equations",
      sourceSection: "5.6 Solving Equations Containing Decimals",
      build: (i) => {
        const x = 5 + i;
        const a = 1.2 + (i % 4) / 10;
        const b = 2.5 + (i % 3) / 10;
        const rhs = round2(a * x + b);
        return baseDraft({
          statement: `Solve ${fmt(a)}x + ${fmt(b)} = ${fmt2(rhs)}.`,
          answer: x,
          wrongs: [round2(rhs - b), round2(rhs / a), x + b, Math.max(1, x - 1)],
          solution: `Subtract ${fmt(b)} to get ${fmt(a)}x = ${fmt2(rhs - b)}. Divide by ${fmt(a)} to get x = ${x}.`,
          concepts: ["alg_linear_equations", "arith_decimals"],
          theme: "Linear Equations",
          chapter: "ise-devmath-05-decimals",
          chapterTitle: "Decimals and Applications",
          sequenceBase: 2660,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["inverse_operations", "decimal_place_value"],
          hint1: "Solve as a two-step linear equation.",
          hint2: "Clear the constant before dividing.",
          commonMistake: "Dividing the entire right side before subtracting.",
          variantIdea: "Use a decimal constant on both sides."
        });
      }
    },
    {
      prefix: "unitrate",
      chapter: "ise-devmath-06-ratio-proportion",
      title: "Rates and Unit Cost",
      sourceSection: "6.2 Rates and Unit Cost",
      build: (i) => {
        const items = 4 + (i % 6);
        const cost = items * (3 + (i % 5));
        const answer = cost / items;
        return baseDraft({
          statement: `${items} notebooks cost $${cost}. What is the cost per notebook?`,
          answer,
          wrongs: [items / cost, cost + items, cost - items, items],
          solution: `Unit cost is total cost divided by number of items: ${cost} / ${items} = ${answer}.`,
          concepts: ["arith_ratios", "arith_proportions"],
          theme: "Arithmetic and Proportional Reasoning",
          chapter: "ise-devmath-06-ratio-proportion",
          chapterTitle: "Ratio and Proportion",
          sequenceBase: 2710,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "proportional_reasoning",
          cognitiveTags: ["unit_rate_modeling", "multiplicative_reasoning"],
          hint1: "A unit rate is for one item.",
          hint2: "Divide total cost by number of items.",
          commonMistake: "Multiplying instead of dividing.",
          variantIdea: "Compare two unit costs and choose the better buy."
        });
      }
    },
    {
      prefix: "similar",
      chapter: "ise-devmath-06-ratio-proportion",
      title: "Similar Figures",
      sourceSection: "6.4 Applications of Proportions and Similar Figures",
      build: (i) => {
        const small = 3 + (i % 5);
        const large = small * 2;
        const smallSide = 5 + i;
        const answer = smallSide * 2;
        return baseDraft({
          statement: `Two similar figures have scale ${small}:${large}. A side on the smaller figure is ${smallSide}. What is the matching larger side?`,
          answer,
          wrongs: [smallSide + 2, smallSide + large, Math.round(smallSide / 2), smallSide * small],
          solution: `The larger figure is ${large / small} times the smaller figure, so the side is ${smallSide} x ${large / small} = ${answer}.`,
          concepts: ["geo_similarity", "arith_proportions"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-06-ratio-proportion",
          chapterTitle: "Ratio and Proportion",
          sequenceBase: 2740,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "geometric_measurement",
          cognitiveTags: ["multiplicative_reasoning", "spatial_numeric_mapping"],
          hint1: "Find the scale factor.",
          hint2: "Multiply the smaller side by the scale factor.",
          commonMistake: "Adding the difference instead of multiplying by scale.",
          variantIdea: "Ask for the smaller side from the larger side."
        });
      }
    },
    {
      prefix: "pctconvert",
      chapter: "ise-devmath-07-percents",
      title: "Percents, Fractions, and Decimals",
      sourceSection: "7.1 Percents, Fractions, and Decimals",
      build: (i) => {
        const pct = [12.5, 20, 25, 40, 60, 75, 80, 125][i % 8];
        const answer = `${pct / 100}`;
        return baseDraft({
          statement: `Write ${pct}% as a decimal.`,
          answer,
          wrongs: [`${pct}`, `${pct / 10}`, `${100 / pct}`, `${pct + 100}`],
          solution: `Divide by 100: ${pct}% = ${pct}/100 = ${answer}.`,
          concepts: ["arith_percentages", "arith_decimals"],
          theme: "Arithmetic and Proportional Reasoning",
          chapter: "ise-devmath-07-percents",
          chapterTitle: "Percents and Percent Applications",
          sequenceBase: 2810,
          difficulty: 2,
          layer: "Foundation",
          stage: "Foundation",
          problemType: "computation",
          cognitiveTags: ["part_whole_reasoning", "decimal_place_value"],
          hint1: "Percent means per hundred.",
          hint2: "Move the decimal point two places left.",
          commonMistake: "Moving only one decimal place.",
          variantIdea: "Convert a decimal back to a percent."
        });
      }
    },
    {
      prefix: "interest",
      chapter: "ise-devmath-07-percents",
      title: "Simple Interest",
      sourceSection: "7.5 Simple and Compound Interest",
      build: (i) => {
        const principal = 200 + i * 25;
        const rate = [3, 4, 5, 6][i % 4];
        const time = 2 + (i % 3);
        const answer = round2(principal * rate * time / 100);
        return baseDraft({
          statement: `Find the simple interest on $${principal} at ${rate}% for ${time} years.`,
          answer,
          wrongs: [round2(principal * rate / 100), round2(principal + answer), principal * time, rate * time],
          solution: `Simple interest is I = Prt = ${principal} x ${rate / 100} x ${time} = ${answer}.`,
          concepts: ["arith_percentages", "arith_ratios"],
          theme: "Arithmetic and Proportional Reasoning",
          chapter: "ise-devmath-07-percents",
          chapterTitle: "Percents and Percent Applications",
          sequenceBase: 2860,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "proportional_reasoning",
          cognitiveTags: ["formula_selection", "multiplicative_reasoning"],
          hint1: "Use the simple interest formula.",
          hint2: "Convert the percent to a decimal before multiplying.",
          commonMistake: "Reporting the final balance instead of the interest.",
          variantIdea: "Ask for total balance after interest."
        });
      }
    },
    {
      prefix: "angle",
      chapter: "ise-devmath-08-geometry",
      title: "Lines and Angles",
      sourceSection: "8.5 Lines and Angles",
      build: (i) => {
        const angle = 35 + i * 3;
        const answer = 180 - angle;
        return baseDraft({
          statement: `Two angles form a straight line. One angle is ${angle} degrees. What is the other angle?`,
          answer,
          wrongs: [90 - angle, angle, 180 + angle, Math.abs(90 - angle)],
          solution: `Angles on a straight line sum to 180 degrees, so the other angle is 180 - ${angle} = ${answer}.`,
          concepts: ["geo_angles"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-08-geometry",
          chapterTitle: "Measurement and Geometry",
          sequenceBase: 2880,
          difficulty: 2,
          layer: "Foundation",
          stage: "AMC8 Transfer",
          problemType: "geometric_reasoning",
          cognitiveTags: ["angle_relationships", "formula_selection"],
          hint1: "A straight angle measures 180 degrees.",
          hint2: "Subtract the given angle from 180.",
          commonMistake: "Using 90 degrees instead of 180 degrees.",
          variantIdea: "Use vertical angles or complementary angles."
        });
      }
    },
    {
      prefix: "circlearea",
      chapter: "ise-devmath-08-geometry",
      title: "Circumference and Area",
      sourceSection: "8.7 Perimeter, Circumference, and Area",
      build: (i) => {
        const r = 3 + (i % 8);
        const answer = `${r * r}pi`;
        return baseDraft({
          statement: `Find the area of a circle with radius ${r}.`,
          answer,
          wrongs: [`${2 * r}pi`, `${r}pi`, `${2 * r * r}pi`, `${r * r}`],
          solution: `Circle area is pi r^2 = pi x ${r}^2 = ${answer}.`,
          concepts: ["geo_circles", "geo_area"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-08-geometry",
          chapterTitle: "Measurement and Geometry",
          sequenceBase: 2940,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "geometric_measurement",
          cognitiveTags: ["formula_selection", "unit_dimension_reasoning"],
          hint1: "Area uses radius squared.",
          hint2: "Use A = pi r^2.",
          commonMistake: "Using circumference formula instead of area.",
          variantIdea: "Give diameter instead of radius."
        });
      }
    },
    {
      prefix: "volume",
      chapter: "ise-devmath-08-geometry",
      title: "Volume and Surface Area",
      sourceSection: "8.8 Volume and Surface Area",
      build: (i) => {
        const l = 4 + (i % 5);
        const w = 3 + (i % 4);
        const h = 5 + (i % 6);
        const answer = l * w * h;
        return baseDraft({
          statement: `Find the volume of a rectangular prism with dimensions ${l}, ${w}, and ${h}.`,
          answer,
          wrongs: [2 * (l + w + h), l * w, l + w + h, answer + h],
          solution: `Volume is length x width x height: ${l} x ${w} x ${h} = ${answer}.`,
          concepts: ["geo_area"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-08-geometry",
          chapterTitle: "Measurement and Geometry",
          sequenceBase: 2960,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "geometric_measurement",
          cognitiveTags: ["unit_dimension_reasoning", "formula_selection"],
          hint1: "Volume counts cubic units.",
          hint2: "Multiply all three dimensions.",
          commonMistake: "Finding surface-related sums instead of volume.",
          variantIdea: "Ask for a missing dimension from the volume."
        });
      }
    },
    {
      prefix: "median",
      chapter: "ise-devmath-09-graphs-statistics",
      title: "Mean, Median, and Mode",
      sourceSection: "9.5 Mean, Median, and Mode",
      build: (i) => {
        const values = [3 + i, 7 + i, 8 + i, 10 + i, 16 + i];
        const answer = values[2];
        return baseDraft({
          statement: `Find the median of ${values.join(", ")}.`,
          answer,
          wrongs: [values[0], values[4], values.reduce((sum, value) => sum + value, 0) / 5, values[1]],
          solution: `The values are already ordered. The middle value is ${answer}.`,
          concepts: ["stats_median"],
          theme: "Data, Counting, and Probability",
          chapter: "ise-devmath-09-graphs-statistics",
          chapterTitle: "Graphs, Probability, and Statistics",
          sequenceBase: 3010,
          difficulty: 2,
          layer: "Foundation",
          stage: "AMC8 Transfer",
          problemType: "data_reasoning",
          cognitiveTags: ["data_position_reasoning", "fluency_precision"],
          hint1: "Median is the middle value after ordering.",
          hint2: "There are five values, so choose the third.",
          commonMistake: "Computing the mean instead of the median.",
          variantIdea: "Use an even number of data values."
        });
      }
    },
    {
      prefix: "range",
      chapter: "ise-devmath-09-graphs-statistics",
      title: "Frequency and Spread",
      sourceSection: "9.2 Frequency Distributions and Histograms",
      build: (i) => {
        const low = 4 + i;
        const high = low + 12 + (i % 5);
        const answer = high - low;
        return baseDraft({
          statement: `A data set has minimum ${low} and maximum ${high}. What is the range?`,
          answer,
          wrongs: [high + low, high, low, Math.round((high + low) / 2)],
          solution: `Range is maximum minus minimum: ${high} - ${low} = ${answer}.`,
          concepts: ["stats_range"],
          theme: "Data, Counting, and Probability",
          chapter: "ise-devmath-09-graphs-statistics",
          chapterTitle: "Graphs, Probability, and Statistics",
          sequenceBase: 3020,
          difficulty: 2,
          layer: "Foundation",
          stage: "AMC8 Transfer",
          problemType: "data_reasoning",
          cognitiveTags: ["data_position_reasoning", "operation_selection"],
          hint1: "Range measures spread.",
          hint2: "Subtract the smallest value from the largest.",
          commonMistake: "Adding the endpoints.",
          variantIdea: "Ask how the range changes after adding a new value."
        });
      }
    },
    {
      prefix: "clearfrac",
      chapter: "ise-devmath-10-linear-equations-inequalities",
      title: "Clearing Fractions in Linear Equations",
      sourceSection: "10.3 Linear Equations: Clearing Fractions and Decimals",
      build: (i) => {
        const d = 2 + (i % 4);
        const x = d * (3 + i);
        const rhs = x / d + 1;
        return baseDraft({
          statement: `Solve x/${d} + 1 = ${fmt2(rhs)}.`,
          answer: x,
          wrongs: [x / d, x + d, Math.max(1, x - d), rhs],
          solution: `Subtract 1: x/${d} = ${fmt2(rhs - 1)}. Multiply by ${d}: x = ${x}.`,
          concepts: ["alg_linear_equations", "arith_fractions"],
          theme: "Linear Equations",
          chapter: "ise-devmath-10-linear-equations-inequalities",
          chapterTitle: "Linear Equations and Inequalities",
          sequenceBase: 3120,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["inverse_operations", "fraction_fluency"],
          hint1: "First isolate the fractional term.",
          hint2: "Then multiply by the denominator.",
          commonMistake: "Multiplying before subtracting 1.",
          variantIdea: "Use two fractional terms with a common denominator."
        });
      }
    },
    {
      prefix: "motion",
      chapter: "ise-devmath-10-linear-equations-inequalities",
      title: "Uniform Motion Applications",
      sourceSection: "10.7 Mixture Applications and Uniform Motion",
      build: (i) => {
        const rate = 35 + i * 5;
        const time = 2 + (i % 4);
        const answer = rate * time;
        return baseDraft({
          statement: `A car travels ${rate} miles per hour for ${time} hours. How far does it travel?`,
          answer,
          wrongs: [rate + time, rate / time, answer + rate, Math.abs(rate - time)],
          solution: `Distance = rate x time = ${rate} x ${time} = ${answer}.`,
          concepts: ["arith_ratios", "alg_linear_equations"],
          theme: "Arithmetic and Proportional Reasoning",
          chapter: "ise-devmath-10-linear-equations-inequalities",
          chapterTitle: "Linear Equations and Inequalities",
          sequenceBase: 3160,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "word_problem",
          cognitiveTags: ["unit_rate_modeling", "formula_selection"],
          hint1: "Use the distance formula.",
          hint2: "Multiply rate by time.",
          commonMistake: "Adding rate and time.",
          variantIdea: "Ask for time when distance and rate are known."
        });
      }
    },
    {
      prefix: "coord",
      chapter: "ise-devmath-11-graphing-lines",
      title: "Rectangular Coordinate System",
      sourceSection: "11.1 Rectangular Coordinate System",
      build: (i) => {
        const x1 = 1 + (i % 6);
        const y1 = 2 + (i % 5);
        const x2 = x1 + 4;
        const y2 = y1;
        const answer = 4;
        return baseDraft({
          statement: `Find the horizontal distance between (${x1}, ${y1}) and (${x2}, ${y2}).`,
          answer,
          wrongs: [x1 + x2, y1 + y2, x2 - y2, Math.abs(y2 - y1)],
          solution: `The y-values match, so horizontal distance is ${x2} - ${x1} = ${answer}.`,
          concepts: ["geo_coordinate_geometry", "alg_graphing"],
          theme: "Linear Equations",
          chapter: "ise-devmath-11-graphing-lines",
          chapterTitle: "Graphing Linear Equations",
          sequenceBase: 3210,
          difficulty: 2,
          layer: "Foundation",
          stage: "Algebra Readiness",
          problemType: "coordinate_reasoning",
          cognitiveTags: ["coordinate_precision", "spatial_numeric_mapping"],
          hint1: "Compare the x-coordinates.",
          hint2: "The y-coordinates are the same.",
          commonMistake: "Adding coordinates instead of finding a distance.",
          variantIdea: "Use vertical distance or diagonal distance."
        });
      }
    },
    {
      prefix: "pointslope",
      chapter: "ise-devmath-11-graphing-lines",
      title: "Point-Slope Form",
      sourceSection: "11.5 Point-Slope Formula",
      build: (i) => {
        const m = 2 + (i % 4);
        const x = 1 + (i % 5);
        const y = 3 + i;
        const answer = `y-${y}=${m}(x-${x})`;
        return baseDraft({
          statement: `Write a point-slope equation for slope ${m} through (${x}, ${y}).`,
          answer,
          wrongs: [`y+${y}=${m}(x+${x})`, `y=${m}x+${y}`, `y-${x}=${m}(x-${y})`, `y=${m}(x-${x})`],
          solution: `Use y - y1 = m(x - x1). With (${x}, ${y}) and slope ${m}, the equation is ${answer}.`,
          concepts: ["alg_graphing", "alg_functions"],
          theme: "Linear Equations",
          chapter: "ise-devmath-11-graphing-lines",
          chapterTitle: "Graphing Linear Equations",
          sequenceBase: 3260,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "coordinate_reasoning",
          cognitiveTags: ["symbolic_fluency", "coordinate_precision"],
          hint1: "Use the point-slope template.",
          hint2: "Substitute x1, y1, and m carefully.",
          commonMistake: "Switching the x and y coordinates.",
          variantIdea: "Convert the equation to slope-intercept form."
        });
      }
    },
    {
      prefix: "syssub",
      chapter: "ise-devmath-12-systems",
      title: "Systems by Substitution",
      sourceSection: "12.2 Solving Systems of Equations by the Substitution Method",
      build: (i) => {
        const x = 2 + (i % 6);
        const y = 3 + (i % 5);
        const sum = x + y;
        return baseDraft({
          statement: `Solve y = ${y} and x + y = ${sum}. What is x?`,
          answer: x,
          wrongs: [y, sum, sum + y, Math.abs(y - x)],
          solution: `Substitute y = ${y} into x + y = ${sum}: x + ${y} = ${sum}, so x = ${x}.`,
          concepts: ["alg_systems", "alg_linear_equations"],
          theme: "Linear Equations",
          chapter: "ise-devmath-12-systems",
          chapterTitle: "Systems of Linear Equations",
          sequenceBase: 3310,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["multi_step_planning", "structure_recognition"],
          hint1: "Substitute the known value of y.",
          hint2: "Then solve the one-variable equation.",
          commonMistake: "Reporting y instead of x.",
          variantIdea: "Give x in terms of y and solve for y."
        });
      }
    },
    {
      prefix: "sci",
      chapter: "ise-devmath-13-exponents-polynomials",
      title: "Scientific Notation",
      sourceSection: "13.4 Scientific Notation",
      build: (i) => {
        const coefficient = 2 + (i % 8);
        const power = 3 + (i % 4);
        const answer = coefficient * 10 ** power;
        return baseDraft({
          statement: `Write ${coefficient} x 10^${power} in standard form.`,
          answer,
          wrongs: [coefficient * power, coefficient * 10 * power, coefficient + 10 ** power, coefficient * 10 ** (power - 1)],
          solution: `Move the decimal ${power} places to the right: ${coefficient} x 10^${power} = ${answer}.`,
          concepts: ["arith_exponents", "arith_natural_numbers"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-13-exponents-polynomials",
          chapterTitle: "Exponents and Polynomials",
          sequenceBase: 3410,
          difficulty: 2,
          layer: "Foundation",
          stage: "Algebra Readiness",
          problemType: "computation",
          cognitiveTags: ["exponent_meaning", "place_value"],
          hint1: "A positive power of 10 shifts right.",
          hint2: `Shift ${power} places.`,
          commonMistake: "Multiplying the coefficient by the exponent.",
          variantIdea: "Convert a small decimal from scientific notation."
        });
      }
    },
    {
      prefix: "polyadd",
      chapter: "ise-devmath-13-exponents-polynomials",
      title: "Adding and Subtracting Polynomials",
      sourceSection: "13.5 Addition and Subtraction of Polynomials",
      build: (i) => {
        const a = 2 + (i % 5);
        const b = 4 + (i % 6);
        const c = 3 + (i % 4);
        const d = 1 + (i % 5);
        const answer = `${a + c}x+${b - d}`;
        return baseDraft({
          statement: `Simplify (${a}x + ${b}) + (${c}x - ${d}).`,
          answer,
          wrongs: [`${a + c}x+${b + d}`, `${a * c}x+${b - d}`, `${a + b + c - d}x`, `${a - c}x+${b - d}`],
          solution: `Combine like terms: ${a}x + ${c}x = ${a + c}x and ${b} - ${d} = ${b - d}.`,
          concepts: ["prealg_simplification", "prealg_expressions"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-13-exponents-polynomials",
          chapterTitle: "Exponents and Polynomials",
          sequenceBase: 3420,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "expression_simplification",
          cognitiveTags: ["like_terms", "symbolic_fluency"],
          hint1: "Group x-terms and constants separately.",
          hint2: "Pay attention to the minus sign before the constant.",
          commonMistake: "Adding the subtracted constant.",
          variantIdea: "Subtract one polynomial from another."
        });
      }
    },
    {
      prefix: "polymult",
      chapter: "ise-devmath-13-exponents-polynomials",
      title: "Multiplication of Polynomials",
      sourceSection: "13.6 Multiplication of Polynomials and Special Products",
      build: (i) => {
        const a = 2 + (i % 6);
        const b = 3 + (i % 5);
        const answer = `x^2+${a + b}x+${a * b}`;
        return baseDraft({
          statement: `Expand (x+${a})(x+${b}).`,
          answer,
          wrongs: [`x^2+${a * b}`, `x^2+${a + b}`, `x^2+${a * b}x+${a + b}`, `2x+${a + b}`],
          solution: `Multiply each pair: x^2 + ${b}x + ${a}x + ${a * b} = ${answer}.`,
          concepts: ["prealg_simplification", "alg_factoring"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-13-exponents-polynomials",
          chapterTitle: "Exponents and Polynomials",
          sequenceBase: 3440,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "expression_simplification",
          cognitiveTags: ["structure_recognition", "symbolic_fluency"],
          hint1: "Use distribution twice.",
          hint2: "The middle coefficient is the sum of the constants.",
          commonMistake: "Multiplying only the first and last terms.",
          variantIdea: "Use a difference of squares product."
        });
      }
    },
    {
      prefix: "gcfpoly",
      chapter: "ise-devmath-14-factoring",
      title: "Greatest Common Factor",
      sourceSection: "14.1 Greatest Common Factor and Factoring by Grouping",
      build: (i) => {
        const a = 2 + (i % 5);
        const b = 3 + (i % 6);
        const g = 2 + (i % 4);
        const answer = `${g}x(${a}x+${b})`;
        return baseDraft({
          statement: `Factor ${g * a}x^2 + ${g * b}x.`,
          answer,
          wrongs: [`x(${g * a}x+${g * b})`, `${g}(${a}x+${b})`, `${g}x(${a}+${b})`, `${g * a}x(x+${b})`],
          solution: `Both terms share ${g}x. Factoring it out gives ${answer}.`,
          concepts: ["alg_factoring", "nt_factorization"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-14-factoring",
          chapterTitle: "Factoring and Quadratic Equations",
          sequenceBase: 3510,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "expression_simplification",
          cognitiveTags: ["factor_structure", "structure_recognition"],
          hint1: "Find the greatest common factor of both terms.",
          hint2: "Include the variable factor shared by both terms.",
          commonMistake: "Factoring out only x and missing the numeric GCF.",
          variantIdea: "Use three terms with a common factor."
        });
      }
    },
    {
      prefix: "zprod",
      chapter: "ise-devmath-14-factoring",
      title: "Zero Product Rule",
      sourceSection: "14.7 Solving Equations Using the Zero Product Rule",
      build: (i) => {
        const r = 2 + (i % 6);
        const s = 4 + (i % 5);
        const answer = `${-r},${s}`;
        return baseDraft({
          statement: `Solve (x+${r})(x-${s}) = 0.`,
          answer,
          wrongs: [`${r},${s}`, `${-r},${-s}`, `${r},${-s}`, `${r + s}`],
          solution: `Set each factor to zero: x + ${r} = 0 gives x = ${-r}, and x - ${s} = 0 gives x = ${s}.`,
          concepts: ["alg_quadratics", "alg_factoring"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-14-factoring",
          chapterTitle: "Factoring and Quadratic Equations",
          sequenceBase: 3560,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["factor_structure", "inverse_operations"],
          hint1: "Use the zero product rule.",
          hint2: "Each factor can equal zero.",
          commonMistake: "Forgetting to change signs when solving each factor.",
          variantIdea: "Start from a quadratic equation and factor first."
        });
      }
    },
    {
      prefix: "ratsimp",
      chapter: "ise-devmath-15-rational-expressions",
      title: "Rational Expressions",
      sourceSection: "15.1 Introduction to Rational Expressions",
      build: (i) => {
        const a = 2 + (i % 5);
        const b = 3 + (i % 6);
        const answer = `${a}/${b}`;
        return baseDraft({
          statement: `Simplify ${a}x/${b}x for x not equal to 0.`,
          answer,
          wrongs: [`${a}x/${b}`, `${a}/${b}x`, `${b}/${a}`, `${a + b}`],
          solution: `Cancel the common nonzero factor x to get ${answer}.`,
          concepts: ["arith_fractions", "prealg_simplification"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-15-rational-expressions",
          chapterTitle: "Rational Expressions and Equations",
          sequenceBase: 3600,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "expression_simplification",
          cognitiveTags: ["fraction_structure", "symbolic_fluency"],
          hint1: "Look for a factor that appears in numerator and denominator.",
          hint2: "Cancel only factors, not terms.",
          commonMistake: "Leaving x in only one part of the expression.",
          variantIdea: "Use binomial factors that can cancel."
        });
      }
    },
    {
      prefix: "rateq",
      chapter: "ise-devmath-15-rational-expressions",
      title: "Rational Equations",
      sourceSection: "15.6 Rational Equations",
      build: (i) => {
        const x = 4 + i;
        const d = 2 + (i % 5);
        return baseDraft({
          statement: `Solve ${d}/x = ${d}/${x}.`,
          answer: x,
          wrongs: [d, x + d, Math.max(1, x - d), d * x],
          solution: `Since the numerators match and are nonzero, the denominators match, so x = ${x}.`,
          concepts: ["alg_linear_equations", "arith_fractions"],
          theme: "Linear Equations",
          chapter: "ise-devmath-15-rational-expressions",
          chapterTitle: "Rational Expressions and Equations",
          sequenceBase: 3660,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["fraction_structure", "inverse_operations"],
          hint1: "Compare the two fractions.",
          hint2: "Cross multiplication also gives the same result.",
          commonMistake: "Multiplying numerator and denominator together.",
          variantIdea: "Use different numerators and solve by cross multiplication."
        });
      }
    },
    {
      prefix: "relation",
      chapter: "ise-devmath-16-relations-functions",
      title: "Relations and Functions",
      sourceSection: "16.1 Introduction to Relations",
      build: (i) => {
        const x = 2 + i;
        const answer = 2 * x + 1;
        return baseDraft({
          statement: `For the rule y = 2x + 1, what y-value pairs with x = ${x}?`,
          answer,
          wrongs: [x + 1, 2 * x, answer + 2, x * x + 1],
          solution: `Substitute x = ${x}: y = 2(${x}) + 1 = ${answer}.`,
          concepts: ["alg_functions"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-16-relations-functions",
          chapterTitle: "Relations and Functions",
          sequenceBase: 3700,
          difficulty: 2,
          layer: "Foundation",
          stage: "Algebra Readiness",
          problemType: "function_evaluation",
          cognitiveTags: ["symbol_evaluation", "function_mapping"],
          hint1: "A function rule maps input to output.",
          hint2: "Substitute the input for x.",
          commonMistake: "Using x as the output.",
          variantIdea: "Ask whether a set of ordered pairs is a function."
        });
      }
    },
    {
      prefix: "variation",
      chapter: "ise-devmath-16-relations-functions",
      title: "Variation",
      sourceSection: "16.5 Variation",
      build: (i) => {
        const k = 3 + (i % 5);
        const x = 4 + i;
        const answer = k * x;
        return baseDraft({
          statement: `If y varies directly with x and y = ${k}x, find y when x = ${x}.`,
          answer,
          wrongs: [k + x, x / k, k, answer + k],
          solution: `Direct variation uses y = kx, so y = ${k} x ${x} = ${answer}.`,
          concepts: ["alg_functions", "arith_ratios"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-16-relations-functions",
          chapterTitle: "Relations and Functions",
          sequenceBase: 3740,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "function_evaluation",
          cognitiveTags: ["multiplicative_reasoning", "function_mapping"],
          hint1: "Direct variation is multiplicative.",
          hint2: "Multiply x by the constant of variation.",
          commonMistake: "Adding the constant instead of multiplying.",
          variantIdea: "Find k from one data pair, then predict another."
        });
      }
    },
    {
      prefix: "compoundineq",
      chapter: "ise-devmath-17-more-equations-inequalities",
      title: "Compound Inequalities",
      sourceSection: "17.1 Compound Inequalities",
      build: (i) => {
        const left = 2 + i;
        const right = left + 6;
        const answer = `${left}<x<${right}`;
        return baseDraft({
          statement: `Write the interval of numbers greater than ${left} and less than ${right} as a compound inequality.`,
          answer,
          wrongs: [`x<${left} or x>${right}`, `${left}>x>${right}`, `x>${left}`, `x<${right}`],
          solution: `Greater than ${left} and less than ${right} means ${left} < x < ${right}.`,
          concepts: ["alg_linear_inequalities"],
          theme: "Linear Equations",
          chapter: "ise-devmath-17-more-equations-inequalities",
          chapterTitle: "More Equations and Inequalities",
          sequenceBase: 3800,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "inequality_solving",
          cognitiveTags: ["relation_direction", "symbolic_fluency"],
          hint1: "The number x is between the two endpoints.",
          hint2: "Place x in the middle.",
          commonMistake: "Using or instead of and.",
          variantIdea: "Use an outside interval with or."
        });
      }
    },
    {
      prefix: "abseq",
      chapter: "ise-devmath-17-more-equations-inequalities",
      title: "Absolute Value Equations",
      sourceSection: "17.3 Absolute Value Equations",
      build: (i) => {
        const center = 5 + i;
        const distance = 2 + (i % 5);
        const answer = `${center - distance},${center + distance}`;
        return baseDraft({
          statement: `Solve |x - ${center}| = ${distance}.`,
          answer,
          wrongs: [`${center + distance}`, `${center - distance}`, `${-center - distance},${center + distance}`, `${distance}`],
          solution: `The distance from ${center} is ${distance}, so x = ${center - distance} or x = ${center + distance}.`,
          concepts: ["arith_absolute_value", "alg_linear_equations"],
          theme: "Number Systems and Operations",
          chapter: "ise-devmath-17-more-equations-inequalities",
          chapterTitle: "More Equations and Inequalities",
          sequenceBase: 3840,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["number_line_distance", "multi_step_planning"],
          hint1: "Absolute value is distance.",
          hint2: "There are usually two solutions.",
          commonMistake: "Giving only the positive-side solution.",
          variantIdea: "Use an absolute value inequality."
        });
      }
    },
    {
      prefix: "radsimp",
      chapter: "ise-devmath-18-radicals-complex",
      title: "Simplifying Radicals",
      sourceSection: "18.3 Simplifying Radical Expressions",
      build: (i) => {
        const outside = 2 + (i % 5);
        const inside = [2, 3, 5, 7][i % 4];
        const radicand = outside * outside * inside;
        const answer = `${outside}sqrt(${inside})`;
        return baseDraft({
          statement: `Simplify sqrt(${radicand}).`,
          answer,
          wrongs: [`sqrt(${outside * inside})`, `${radicand}`, `${outside * inside}`, `sqrt(${inside})`],
          solution: `${radicand} = ${outside * outside} x ${inside}, so sqrt(${radicand}) = ${outside}sqrt(${inside}).`,
          concepts: ["arith_roots", "arith_exponents"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-18-radicals-complex",
          chapterTitle: "Radicals and Complex Numbers",
          sequenceBase: 3900,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "expression_simplification",
          cognitiveTags: ["factor_structure", "exponent_meaning"],
          hint1: "Look for a perfect-square factor.",
          hint2: "Take the square root of that factor outside the radical.",
          commonMistake: "Taking every factor out of the square root.",
          variantIdea: "Use a coefficient outside the radical."
        });
      }
    },
    {
      prefix: "qformula",
      chapter: "ise-devmath-19-quadratics",
      title: "Quadratic Formula",
      sourceSection: "19.2 Quadratic Formula",
      build: (i) => {
        const r = 2 + (i % 5);
        const s = 3 + (i % 6);
        const answer = `${r},${s}`;
        return baseDraft({
          statement: `The equation x^2 - ${r + s}x + ${r * s} = 0 has solutions?`,
          answer,
          wrongs: [`${-r},${-s}`, `${r + s},${r * s}`, `${r}`, `${s}`],
          solution: `The quadratic factors as (x-${r})(x-${s})=0, so x=${r} or x=${s}.`,
          concepts: ["alg_quadratics", "alg_factoring"],
          theme: "Expressions and Equations",
          chapter: "ise-devmath-19-quadratics",
          chapterTitle: "Quadratic Equations and Functions",
          sequenceBase: 4000,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "equation_solving",
          cognitiveTags: ["factor_structure", "structure_recognition"],
          hint1: "Look for two numbers with the given sum and product.",
          hint2: "Set each factor equal to zero.",
          commonMistake: "Changing both solution signs.",
          variantIdea: "Use a quadratic that needs the formula directly."
        });
      }
    },
    {
      prefix: "qvertex",
      chapter: "ise-devmath-19-quadratics",
      title: "Graphs of Quadratic Functions",
      sourceSection: "19.5 Vertex of a Parabola: Applications and Modeling",
      build: (i) => {
        const h = 1 + (i % 6);
        const k = 2 + i;
        const answer = `(${h},${k})`;
        return baseDraft({
          statement: `What is the vertex of y = (x-${h})^2 + ${k}?`,
          answer,
          wrongs: [`(${-h},${k})`, `(${h},${-k})`, `(${k},${h})`, `(0,${k})`],
          solution: `Vertex form y=(x-h)^2+k has vertex (h,k), so the vertex is ${answer}.`,
          concepts: ["alg_quadratics", "alg_functions"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-19-quadratics",
          chapterTitle: "Quadratic Equations and Functions",
          sequenceBase: 4040,
          difficulty: 4,
          layer: "Honors",
          stage: "Algebra Readiness",
          problemType: "function_evaluation",
          cognitiveTags: ["structure_recognition", "coordinate_precision"],
          hint1: "Recognize vertex form.",
          hint2: "The sign inside the parentheses is opposite of h.",
          commonMistake: "Using -h as the x-coordinate.",
          variantIdea: "Ask whether the parabola opens up or down."
        });
      }
    },
    {
      prefix: "expfunc",
      chapter: "ise-devmath-20-exponential-logarithmic",
      title: "Exponential Functions",
      sourceSection: "20.2 Exponential Functions",
      build: (i) => {
        const base = 2 + (i % 3);
        const exponent = 2 + (i % 4);
        const answer = base ** exponent;
        return baseDraft({
          statement: `For f(x) = ${base}^x, find f(${exponent}).`,
          answer,
          wrongs: [base * exponent, base + exponent, exponent ** base, answer + base],
          solution: `Substitute x=${exponent}: f(${exponent}) = ${base}^${exponent} = ${answer}.`,
          concepts: ["alg_functions", "arith_exponents"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-20-exponential-logarithmic",
          chapterTitle: "Exponential and Logarithmic Functions",
          sequenceBase: 4100,
          difficulty: 3,
          layer: "Standard",
          stage: "Algebra Readiness",
          problemType: "function_evaluation",
          cognitiveTags: ["exponent_meaning", "function_mapping"],
          hint1: "Substitute the input into the exponent.",
          hint2: "Evaluate the power.",
          commonMistake: "Multiplying base and exponent.",
          variantIdea: "Compare two exponential function values."
        });
      }
    },
    {
      prefix: "distance",
      chapter: "ise-devmath-21-conic-sections",
      title: "Distance Formula and Circles",
      sourceSection: "21.1 Distance Formula, Midpoint Formula, and Circles",
      build: (i) => {
        const dx = [3, 5, 6, 8][i % 4];
        const dy = [4, 12, 8, 15][i % 4];
        const answer = Math.sqrt(dx * dx + dy * dy);
        return baseDraft({
          statement: `Find the distance between (0, 0) and (${dx}, ${dy}).`,
          answer,
          wrongs: [dx + dy, Math.abs(dx - dy), dx * dy, answer + 1],
          solution: `Use distance formula: sqrt(${dx}^2 + ${dy}^2) = sqrt(${dx * dx + dy * dy}) = ${answer}.`,
          concepts: ["geo_coordinate_geometry", "geo_pythagorean"],
          theme: "Geometry and Measurement",
          chapter: "ise-devmath-21-conic-sections",
          chapterTitle: "Conic Sections",
          sequenceBase: 4200,
          difficulty: 4,
          layer: "Honors",
          stage: "AMC8 Transfer",
          problemType: "coordinate_reasoning",
          cognitiveTags: ["spatial_numeric_mapping", "formula_selection"],
          hint1: "This is a right-triangle distance.",
          hint2: "Use the Pythagorean relationship.",
          commonMistake: "Adding coordinate differences directly.",
          variantIdea: "Use points that do not start at the origin."
        });
      }
    },
    {
      prefix: "arithseq",
      chapter: "ise-devmath-22-sequences-series",
      title: "Arithmetic Sequences",
      sourceSection: "22.3 Arithmetic Sequences and Series",
      build: (i) => {
        const first = 3 + (i % 6);
        const diff = 2 + (i % 5);
        const n = 5 + (i % 4);
        const answer = first + (n - 1) * diff;
        return baseDraft({
          statement: `In the arithmetic sequence with first term ${first} and common difference ${diff}, what is term ${n}?`,
          answer,
          wrongs: [first + n * diff, first * n, first + diff, answer + diff],
          solution: `Use a_n = a_1 + (n-1)d = ${first} + (${n}-1)${diff} = ${answer}.`,
          concepts: ["alg_functions", "arith_natural_numbers"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-22-sequences-series",
          chapterTitle: "Sequences and Series",
          sequenceBase: 4300,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "pattern_reasoning",
          cognitiveTags: ["pattern_recognition", "symbol_evaluation"],
          hint1: "Arithmetic sequences add the same difference each step.",
          hint2: "There are n-1 jumps after the first term.",
          commonMistake: "Using n jumps instead of n-1 jumps.",
          variantIdea: "Ask for the sum of the first n terms."
        });
      }
    },
    {
      prefix: "geomseq",
      chapter: "ise-devmath-22-sequences-series",
      title: "Geometric Sequences",
      sourceSection: "22.4 Geometric Sequences and Series",
      build: (i) => {
        const first = 2 + (i % 4);
        const ratio = 2 + (i % 3);
        const n = 4;
        const answer = first * ratio ** (n - 1);
        return baseDraft({
          statement: `In a geometric sequence with first term ${first} and ratio ${ratio}, what is term ${n}?`,
          answer,
          wrongs: [first + (n - 1) * ratio, first * ratio * n, first + ratio ** n, answer + ratio],
          solution: `Use a_n = a_1 r^(n-1) = ${first} x ${ratio}^${n - 1} = ${answer}.`,
          concepts: ["arith_exponents", "alg_functions"],
          theme: "Functions and Graphs",
          chapter: "ise-devmath-22-sequences-series",
          chapterTitle: "Sequences and Series",
          sequenceBase: 4340,
          difficulty: 4,
          layer: "Honors",
          stage: "AMC8 Transfer",
          problemType: "pattern_reasoning",
          cognitiveTags: ["pattern_recognition", "exponent_meaning"],
          hint1: "Geometric sequences multiply by the same ratio.",
          hint2: "Use exponent n-1.",
          commonMistake: "Treating the pattern as arithmetic.",
          variantIdea: "Ask for the ratio from two consecutive terms."
        });
      }
    },
    {
      prefix: "countcombo",
      chapter: "ise-devmath-23-transformations-counting-probability",
      title: "Fundamentals of Counting",
      sourceSection: "23.2 Fundamentals of Counting",
      build: (i) => {
        const shirts = 3 + (i % 5);
        const pants = 2 + (i % 4);
        const shoes = 2 + (i % 3);
        const answer = shirts * pants * shoes;
        return baseDraft({
          statement: `A student has ${shirts} shirts, ${pants} pants, and ${shoes} pairs of shoes. How many outfits are possible?`,
          answer,
          wrongs: [shirts + pants + shoes, shirts * pants + shoes, shirts + pants * shoes, answer - shoes],
          solution: `Use the multiplication principle: ${shirts} x ${pants} x ${shoes} = ${answer}.`,
          concepts: ["counting_principle"],
          theme: "Data, Counting, and Probability",
          chapter: "ise-devmath-23-transformations-counting-probability",
          chapterTitle: "Transformations, Counting, and Probability",
          sequenceBase: 4400,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "counting_modeling",
          cognitiveTags: ["multiplicative_reasoning", "sample_space_modeling"],
          hint1: "Each choice can pair with every other choice.",
          hint2: "Multiply the numbers of choices.",
          commonMistake: "Adding categories instead of multiplying choices.",
          variantIdea: "Add a restriction and count again."
        });
      }
    },
    {
      prefix: "prob2",
      chapter: "ise-devmath-23-transformations-counting-probability",
      title: "More on Probability",
      sourceSection: "23.3 More on Probability",
      build: (i) => {
        const favorable = 2 + (i % 5);
        const total = favorable + 6 + (i % 4);
        const [n, d] = reduce(total - favorable, total);
        return baseDraft({
          statement: `A spinner has ${total} equal sections, ${favorable} of which are shaded. What is the probability of landing on an unshaded section?`,
          answer: `${n}/${d}`,
          wrongs: [`${favorable}/${total}`, `${total - favorable}/${favorable}`, `${favorable}/${total - favorable}`, `${total}/${total - favorable}`],
          solution: `Unshaded sections: ${total} - ${favorable} = ${total - favorable}. Probability is ${total - favorable}/${total} = ${n}/${d}.`,
          concepts: ["counting_probability"],
          theme: "Data, Counting, and Probability",
          chapter: "ise-devmath-23-transformations-counting-probability",
          chapterTitle: "Transformations, Counting, and Probability",
          sequenceBase: 4440,
          difficulty: 3,
          layer: "Standard",
          stage: "AMC8 Transfer",
          problemType: "probability_modeling",
          cognitiveTags: ["sample_space_modeling", "fraction_as_probability"],
          hint1: "Find the number of unshaded sections first.",
          hint2: "Probability is favorable outcomes over total outcomes.",
          commonMistake: "Using the shaded sections instead of unshaded sections.",
          variantIdea: "Ask for the probability of two independent spins."
        });
      }
    }
  ];
}

function main() {
  const problems: GeneratedProblem[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  topics.forEach((topic, topicIndex) => {
    for (let variant = 0; variant < PROBLEMS_PER_TOPIC; variant += 1) {
      const draft = topic.build(variant);
      const id = `ise_devmath_${topic.prefix}_${String(variant + 1).padStart(3, "0")}`;
      const mapped = mapDraft(id, draft, topic.sourceSection, topicIndex, variant);

      problems.push(mapped.problem);
      distractors.push(...mapped.distractors);
      explanations.push(mapped.explanation);
    }
  });

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(SOURCE_DIR, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  const readme = [
    "# ISE Developmental Mathematics 2e Data",
    "",
    "This folder stores original-equivalent practice generated from local textbook",
    "coverage signals in `ISE DEVELOPMENTAL MATHEMATICS, second edition`.",
    "",
    "The generated problems do not copy textbook exercises. They use chapter and",
    "section coverage to create project-native, auto-gradable practice aligned to",
    "the current Pre-Algebra -> Algebra 1 -> AMC8 adaptive graph MVP.",
    "",
    `Generated problems: ${problems.length}`,
    `Source collection: ${SOURCE_COLLECTION}`,
    "",
    "Refresh flow:",
    "",
    "```bash",
    "npm run generate:ise-developmental-math",
    "npm run validate:staging",
    "npm run promote:ise-developmental-math",
    "npm run sync:explanations",
    "```",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(SOURCE_DIR, "README.md"), readme);

  console.log(`Generated ${problems.length} ISE Developmental Math problem(s)`);
  console.log(`Distractors: ${distractors.length}`);
  console.log(`Explanations: ${explanations.length}`);
}

function mapDraft(id: string, draft: ProblemDraft, sourceSection: string, topicIndex: number, variant: number) {
  const choices = buildChoices(draft.answer, draft.wrongs, variant);
  const problem: GeneratedProblem = {
    id,
    statement: draft.statement,
    answer: String(draft.answer),
    answer_type: "multiple_choice",
    choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
    difficulty: String(draft.difficulty),
    concepts: draft.concepts.join(";"),
    skills: (draft.skills ?? [draft.problemType]).join(";"),
    patterns: (draft.patterns ?? draft.cognitiveTags).join(";"),
    misconceptions: (draft.misconceptions ?? ["operation_error", "structure_misread"]).join(";"),
    solution: draft.solution,
    course: draft.course ?? inferCourse(draft),
    theme: draft.theme,
    chapter: draft.chapter,
    chapter_title: draft.chapterTitle,
    sequence: String(draft.sequenceBase + topicIndex * 20 + variant),
    source_collection: SOURCE_COLLECTION,
    source_file: `${SOURCE_FILE}; ${sourceSection}`,
    taxonomy_layer: draft.layer,
    taxonomy_stage: draft.stage,
    problem_type: draft.problemType,
    cognitive_tags: draft.cognitiveTags.join(";"),
    estimated_time_seconds: String(draft.estimatedTimeSeconds ?? 75 + Math.max(0, draft.difficulty - 2) * 15),
    notes: "Original-equivalent item generated from ISE Developmental Mathematics 2e coverage signals."
  };
  const distractors = choices
    .filter((choice) => normalize(choice.value) !== normalize(problem.answer))
    .map((choice): DistractorRow => ({
      problem_id: id,
      choice_label: choice.label,
      value: choice.value,
      misconception: inferMisconception(choice.value, problem.answer),
      cognitive_tag: draft.cognitiveTags[0] ?? "general_reasoning",
      explanation: `This choice reflects ${inferMisconception(choice.value, problem.answer).replace(/_/g, " ")}.`
    }));
  const explanation: ExplanationRow = {
    problem_id: id,
    hint_1: draft.hint1 ?? "Identify the main operation or relationship.",
    hint_2: draft.hint2 ?? "Work one algebraic or arithmetic step at a time.",
    step_by_step: draft.solution,
    common_mistake: draft.commonMistake ?? "Rushing the first operation can point to a different structure.",
    why_correct: `The correct answer is ${problem.answer} because ${draft.solution}`,
    variant_idea: draft.variantIdea ?? "Change one number and solve the same structure again."
  };

  return { problem, distractors, explanation };
}

function baseDraft(input: Omit<ProblemDraft, "answer" | "wrongs"> & { answer: string | number; wrongs: Array<string | number> }): ProblemDraft {
  return {
    ...input,
    answer: String(input.answer),
    wrongs: input.wrongs.map(String)
  };
}

function buildChoices(answer: string, wrongs: string[], variant: number) {
  const values = unique([answer, ...wrongs]).slice(0, 5);
  while (values.length < 5) values.push(String(Number(answer) + values.length + 1));
  const rotated = rotate(values, variant % values.length);
  const answerIndex = rotated.findIndex((value) => normalize(value) === normalize(answer));
  if (answerIndex < 0) rotated[0] = answer;

  return rotated.slice(0, 5).map((value, index) => ({
    label: String.fromCharCode(65 + index),
    value
  }));
}

function inferCourse(draft: ProblemDraft) {
  if (draft.concepts.some((concept) => concept.startsWith("alg_"))) return "Algebra 1";
  return "Pre-Algebra";
}

function inferMisconception(value: string, answer: string) {
  if (/^-/.test(value) !== /^-/.test(answer)) return "sign_error";
  if (value.includes("/") && answer.includes("/")) return "fraction_structure_error";
  if (/[x]/i.test(value) || /[x]/i.test(answer)) return "symbolic_structure_error";
  return "operation_error";
}

function reduce(numerator: number, denominator: number): [number, number] {
  const factor = gcd(Math.abs(numerator), Math.abs(denominator));
  return [numerator / factor, denominator / factor];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a || 1 : gcd(b, a % b);
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function fmt(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function fmt2(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function rotate<T>(values: T[], amount: number) {
  return [...values.slice(amount), ...values.slice(0, amount)];
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function toCsv<T extends Record<string, string>>(rows: T[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  return [headers.join(","), ...body].join("\n") + "\n";
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

main();
