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
  answer: string;
  chapter: string;
  chapterTitle: string;
  cognitiveTags: string[];
  concepts: string[];
  difficulty: number;
  layer: Layer;
  misconceptions?: string[];
  patterns?: string[];
  problemType: string;
  sequenceBase: number;
  skills?: string[];
  solution: string;
  sourceCollection: string;
  sourceFile: string;
  sourceSection: string;
  stage: Stage;
  statement: string;
  theme: string;
  wrongs: string[];
  commonMistake?: string;
  hint1?: string;
  hint2?: string;
  variantIdea?: string;
};

type Topic = {
  prefix: string;
  build: (variant: number) => ProblemDraft;
};

const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const COLLEGE_SOURCE = "college_algebra_stitz_zeager";
const ENGINEERS_SOURCE = "mathematics_for_engineers_croft_davison";
const COLLEGE_DIR = path.join(process.cwd(), "datasets/textbooks/college-algebra-stitz-zeager");
const ENGINEERS_DIR = path.join(process.cwd(), "datasets/textbooks/mathematics-for-engineers-croft-davison");
const COLLEGE_LOCAL_PDF = "/Users/fenmdc/Documents/IMO-中小学奥数/初中数学/College Algebra -- Carl Stitz, Jeff Zeager.pdf";
const ENGINEERS_LOCAL_PDF = "/Users/fenmdc/Documents/数学/Mathematics for Engineers_Anthony Croft, Robert Davison.pdf";
const PROBLEMS_PER_TOPIC = 20;

const topics: Topic[] = [
  {
    prefix: "ca-real",
    build: (i) => {
      const a = 18 + i;
      const b = 7 + (i % 6);
      const c = 2 + (i % 5);
      const answer = a - b * c;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.1 Sets of Real Numbers",
        chapter: "college-algebra-00-real-numbers-coordinate-plane",
        chapterTitle: "Real Numbers and the Coordinate Plane",
        theme: "Foundations for College Algebra",
        sequenceBase: 5000,
        statement: `Evaluate ${a} - ${b} x ${c}.`,
        answer,
        wrongs: [(a - b) * c, a - b + c, a + b * c, answer + b],
        solution: `Use order of operations: ${b} x ${c} = ${b * c}. Then ${a} - ${b * c} = ${answer}.`,
        concepts: ["arith_integers", "arith_natural_numbers"],
        skills: ["order_of_operations", "integer_arithmetic"],
        patterns: ["operation_order", "fluency_precision"],
        misconceptions: ["operation_order_error", "sign_error"],
        difficulty: 2,
        layer: "Foundation",
        stage: "Bridge",
        problemType: "computation",
        cognitiveTags: ["operation_order", "fluency_precision"],
        hint1: "Decide which operation happens first.",
        hint2: "Multiply before subtracting.",
        commonMistake: "Subtracting before multiplying changes the expression.",
        variantIdea: "Add parentheses and compare the new value."
      });
    }
  },
  {
    prefix: "ca-dist",
    build: (i) => {
      const x1 = 1 + (i % 7);
      const y1 = 2 + (i % 5);
      const dx = [3, 5, 6, 8][i % 4];
      const dy = [4, 12, 8, 15][i % 4];
      const x2 = x1 + dx;
      const y2 = y1 + dy;
      const answer = Math.hypot(dx, dy);
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.1.3 Distance in the Plane",
        chapter: "college-algebra-00-real-numbers-coordinate-plane",
        chapterTitle: "Real Numbers and the Coordinate Plane",
        theme: "Foundations for College Algebra",
        sequenceBase: 5040,
        statement: `Find the distance between (${x1}, ${y1}) and (${x2}, ${y2}).`,
        answer,
        wrongs: [dx + dy, Math.abs(dx - dy), dx * dy, answer + 1],
        solution: `The horizontal change is ${dx} and the vertical change is ${dy}. The distance is sqrt(${dx}^2 + ${dy}^2) = ${answer}.`,
        concepts: ["geo_coordinate_geometry", "geo_pythagorean"],
        skills: ["distance_formula", "coordinate_reasoning"],
        patterns: ["right_triangle_model", "coordinate_difference"],
        misconceptions: ["additive_distance_error", "coordinate_subtraction_error"],
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "coordinate_geometry",
        cognitiveTags: ["coordinate_reasoning", "formula_selection"],
        hint1: "Find the horizontal and vertical changes.",
        hint2: "Use the Pythagorean theorem on those two changes.",
        commonMistake: "Adding the coordinate changes instead of using squares.",
        variantIdea: "Give a missing coordinate and the distance."
      });
    }
  },
  {
    prefix: "ca-rel",
    build: (i) => {
      const m = 2 + (i % 4);
      const b = 1 + (i % 5);
      const x = 1 + (i % 8);
      const correctY = m * x + b;
      const y = i % 3 === 0 ? correctY + 1 : correctY;
      const answer = y === correctY ? "yes" : "no";
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.2 Relations and Graphs of Equations",
        chapter: "college-algebra-01-relations-and-graphs",
        chapterTitle: "Relations and Graphs of Equations",
        theme: "Functions and Modeling",
        sequenceBase: 5080,
        statement: `Does the point (${x}, ${y}) lie on the graph of y = ${m}x + ${b}?`,
        answer,
        wrongs: answer === "yes" ? ["no", String(correctY), String(m + b), "cannot tell"] : ["yes", String(correctY), String(y - b), "cannot tell"],
        solution: `Substitute x = ${x}: ${m}(${x}) + ${b} = ${correctY}. The point has y = ${y}, so the answer is ${answer}.`,
        concepts: ["alg_graphing", "alg_functions"],
        skills: ["point_testing", "substitution"],
        patterns: ["graph_equation_connection", "input_output_mapping"],
        misconceptions: ["coordinate_order_error", "substitution_error"],
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "relation_point_test",
        cognitiveTags: ["coordinate_reasoning", "symbol_evaluation"],
        hint1: "Substitute the x-coordinate into the equation.",
        hint2: "Compare the computed y-value with the point's y-coordinate.",
        commonMistake: "Using the y-coordinate in place of x.",
        variantIdea: "Ask for the missing y-coordinate on the same graph."
      });
    }
  },
  {
    prefix: "ca-fn",
    build: (i) => {
      const a = 2 + (i % 4);
      const b = 3 + (i % 6);
      const x = 1 + (i % 8);
      const answer = a * x + b;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.3-1.4 Introduction to Functions and Function Notation",
        chapter: "college-algebra-01-functions",
        chapterTitle: "Functions and Function Notation",
        theme: "Functions and Modeling",
        sequenceBase: 5100,
        statement: `Let f(x) = ${a}x + ${b}. Find f(${x}).`,
        answer,
        wrongs: [a + x + b, a * (x + b), a * x - b, answer + a],
        solution: `Substitute x = ${x}: f(${x}) = ${a}(${x}) + ${b} = ${a * x} + ${b} = ${answer}.`,
        concepts: ["alg_functions", "prealg_substitution"],
        skills: ["function_evaluation", "substitution"],
        patterns: ["input_output_mapping", "linear_function_evaluation"],
        misconceptions: ["variable_meaning_error", "operation_order_error"],
        difficulty: i < 8 ? 3 : 4,
        layer: i < 12 ? "Standard" : "Honors",
        stage: "Algebra Readiness",
        problemType: "function_evaluation",
        cognitiveTags: ["symbol_evaluation", "input_output_mapping"],
        hint1: "Replace x with the input value.",
        hint2: "Evaluate the multiplication before adding the constant.",
        commonMistake: "Adding the input to the coefficient instead of multiplying first.",
        variantIdea: "Use a quadratic rule and evaluate at a negative input."
      });
    }
  },
  {
    prefix: "ca-fnarith",
    build: (i) => {
      const a = 2 + (i % 4);
      const b = 1 + (i % 6);
      const c = 3 + (i % 5);
      const d = 2 + (i % 4);
      const x = 1 + (i % 7);
      const answer = (a + c) * x + (b - d);
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.5 Function Arithmetic",
        chapter: "college-algebra-01-functions",
        chapterTitle: "Functions and Function Notation",
        theme: "Functions and Modeling",
        sequenceBase: 5140,
        statement: `Let f(x) = ${a}x + ${b} and g(x) = ${c}x - ${d}. Find (f + g)(${x}).`,
        answer,
        wrongs: [a * x + b + c * x + d, (a + c) * (x + b - d), a * c * x + b - d, answer + d],
        solution: `(f + g)(x) = (${a}x + ${b}) + (${c}x - ${d}) = ${a + c}x + ${b - d}. At x = ${x}, the value is ${answer}.`,
        concepts: ["alg_functions", "prealg_simplification"],
        skills: ["function_arithmetic", "combining_like_terms"],
        patterns: ["function_combination", "symbolic_simplification"],
        misconceptions: ["sign_error", "like_terms_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "function_arithmetic",
        cognitiveTags: ["symbolic_fluency", "structure_recognition"],
        hint1: "Add the two function rules first.",
        hint2: "Combine x-terms and constants before substituting.",
        commonMistake: "Changing subtraction in g(x) into addition.",
        variantIdea: "Ask for (f - g)(x) instead."
      });
    }
  },
  {
    prefix: "ca-trans",
    build: (i) => {
      const x = 1 + (i % 6);
      const y = 2 + (i % 7);
      const right = 2 + (i % 4);
      const up = 1 + (i % 5);
      const answer = `(${x + right},${y + up})`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 1.7 Transformations",
        chapter: "college-algebra-05-transformations",
        chapterTitle: "Transformations of Functions",
        theme: "Functions and Modeling",
        sequenceBase: 5180,
        statement: `The point (${x}, ${y}) is on y = f(x). Which point is on y = f(x - ${right}) + ${up}?`,
        answer,
        wrongs: [`(${x - right},${y + up})`, `(${x + right},${y - up})`, `(${x - right},${y - up})`, `(${x},${y + up})`],
        solution: `The expression f(x - ${right}) shifts the graph right ${right}, and + ${up} shifts it up ${up}. So (${x}, ${y}) moves to ${answer}.`,
        concepts: ["alg_functions", "alg_graphing"],
        skills: ["function_transformations", "coordinate_reasoning"],
        patterns: ["horizontal_shift", "vertical_shift"],
        misconceptions: ["horizontal_shift_direction_error", "coordinate_translation_error"],
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "function_transformation",
        cognitiveTags: ["coordinate_reasoning", "structure_recognition"],
        hint1: "Handle the horizontal and vertical shifts separately.",
        hint2: "Inside x - h shifts the graph right by h.",
        commonMistake: "Moving left for x - h instead of right.",
        variantIdea: "Use y = -f(x) and ask for the reflected point."
      });
    }
  },
  {
    prefix: "ca-line",
    build: (i) => {
      const m = 2 + (i % 5);
      const x1 = 1 + (i % 4);
      const y1 = 3 + (i % 6);
      const b = y1 - m * x1;
      const answer = b === 0 ? `${m}x` : b > 0 ? `${m}x+${b}` : `${m}x-${Math.abs(b)}`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.1 Linear Functions",
        chapter: "college-algebra-02-linear-functions",
        chapterTitle: "Linear Functions",
        theme: "Linear Equations and Functions",
        sequenceBase: 5200,
        statement: `Find the slope-intercept form of the line with slope ${m} passing through (${x1}, ${y1}).`,
        answer,
        wrongs: [`${m}x+${y1}`, `${x1}x+${b}`, `${m}x-${Math.abs(y1)}`, `${m + y1}x`],
        solution: `Use y = mx + b. Substitute (${x1}, ${y1}): ${y1} = ${m}(${x1}) + b, so b = ${b}. The line is y = ${answer}.`,
        concepts: ["alg_graphing", "alg_linear_equations", "alg_functions"],
        skills: ["slope_intercept_form", "substitution"],
        patterns: ["linear_modeling", "coordinate_reasoning"],
        misconceptions: ["slope_intercept_confusion", "substitution_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "linear_function_modeling",
        cognitiveTags: ["coordinate_reasoning", "formula_selection"],
        hint1: "Start from y = mx + b.",
        hint2: "Use the given point to solve for b.",
        commonMistake: "Using the point's y-coordinate as the intercept without checking.",
        variantIdea: "Give two points instead of the slope."
      });
    }
  },
  {
    prefix: "ca-line2",
    build: (i) => {
      const m = 1 + (i % 5);
      const b = -4 + (i % 7);
      const x1 = 1 + (i % 4);
      const x2 = x1 + 2;
      const y1 = m * x1 + b;
      const y2 = m * x2 + b;
      const answer = b === 0 ? `${m}x` : b > 0 ? `${m}x+${b}` : `${m}x-${Math.abs(b)}`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.1 Linear Functions",
        chapter: "college-algebra-02-linear-functions",
        chapterTitle: "Linear Functions",
        theme: "Linear Equations and Functions",
        sequenceBase: 5240,
        statement: `Find the slope-intercept form of the line through (${x1}, ${y1}) and (${x2}, ${y2}).`,
        answer,
        wrongs: [`${m}x+${y1}`, `${x1}x+${b}`, `${m + 1}x+${b}`, `${m}x-${Math.abs(y2)}`],
        solution: `The slope is (${y2} - ${y1})/(${x2} - ${x1}) = ${m}. Use y = mx + b with (${x1}, ${y1}) to get b = ${b}.`,
        concepts: ["alg_graphing", "alg_linear_equations", "alg_functions"],
        skills: ["slope_from_two_points", "slope_intercept_form"],
        patterns: ["coordinate_reasoning", "linear_modeling"],
        misconceptions: ["slope_formula_error", "intercept_confusion"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "linear_function_modeling",
        cognitiveTags: ["coordinate_reasoning", "formula_selection"],
        hint1: "Compute the slope from the two points first.",
        hint2: "Then use either point to find the intercept.",
        commonMistake: "Using the first y-coordinate as the intercept.",
        variantIdea: "Use a negative slope and repeat the process."
      });
    }
  },
  {
    prefix: "ca-abs",
    build: (i) => {
      const h = 2 + (i % 8);
      const d = 3 + (i % 5);
      const answer = `${h - d},${h + d}`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.2 Absolute Value Functions",
        chapter: "college-algebra-06-absolute-value",
        chapterTitle: "Absolute Value Functions and Equations",
        theme: "Linear Equations and Functions",
        sequenceBase: 5280,
        statement: `Solve |x - ${h}| = ${d}.`,
        answer,
        wrongs: [`${h + d}`, `${h - d}`, `${-h - d},${-h + d}`, `${d - h},${d + h}`],
        solution: `|x - ${h}| = ${d} means x - ${h} = ${d} or x - ${h} = -${d}. Thus x = ${h + d} or x = ${h - d}.`,
        concepts: ["arith_absolute_value", "alg_linear_equations"],
        skills: ["absolute_value_equations", "case_reasoning"],
        patterns: ["distance_from_center", "two_solution_structure"],
        misconceptions: ["one_solution_error", "sign_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "absolute_value_equation",
        cognitiveTags: ["case_reasoning", "inverse_operations"],
        hint1: "Absolute value describes distance from a center.",
        hint2: "Set the inside equal to both the positive and negative distance.",
        commonMistake: "Finding only the solution to x - h = d.",
        variantIdea: "Use |ax - b| = c."
      });
    }
  },
  {
    prefix: "ca-quad",
    build: (i) => {
      const r1 = 1 + (i % 6);
      const r2 = r1 + 2 + (i % 4);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const statement = `Solve x^2 ${b < 0 ? `- ${Math.abs(b)}x` : `+ ${b}x`} + ${c} = 0.`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.3 Quadratic Functions",
        chapter: "college-algebra-03-quadratic-functions",
        chapterTitle: "Quadratic Functions",
        theme: "Quadratic Equations and Functions",
        sequenceBase: 5300,
        statement,
        answer: `${r1},${r2}`,
        wrongs: [`${-r1},${-r2}`, `${r1 + r2},${c}`, `${r1},${-r2}`, `${c}`],
        solution: `Factor the quadratic as (x - ${r1})(x - ${r2}) = 0. Therefore x = ${r1} or x = ${r2}.`,
        concepts: ["alg_quadratics", "alg_factoring"],
        skills: ["factoring_quadratics", "zero_product_property"],
        patterns: ["quadratic_factor_pattern", "root_finding"],
        misconceptions: ["sign_error", "factor_pair_error"],
        difficulty: i < 10 ? 4 : 5,
        layer: i < 12 ? "Standard" : "Honors",
        stage: "Algebra Readiness",
        problemType: "quadratic_solving",
        cognitiveTags: ["factor_structure", "operation_selection"],
        hint1: "Look for two numbers that multiply to the constant term.",
        hint2: "Those numbers should add to the coefficient of x.",
        commonMistake: "Forgetting that the signs in the factors determine the roots.",
        variantIdea: "Use a leading coefficient other than 1."
      });
    }
  },
  {
    prefix: "ca-qvertex",
    build: (i) => {
      const h = 1 + (i % 6);
      const k = -3 + (i % 7);
      const answer = `(${h},${k})`;
      const constant = h * h + k;
      const b = -2 * h;
      const middle = b < 0 ? `- ${Math.abs(b)}x` : `+ ${b}x`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.3 Quadratic Functions",
        chapter: "college-algebra-03-quadratic-functions",
        chapterTitle: "Quadratic Functions",
        theme: "Quadratic Equations and Functions",
        sequenceBase: 5340,
        statement: `Find the vertex of y = x^2 ${middle} + ${constant}.`,
        answer,
        wrongs: [`(${-h},${k})`, `(${h},${constant})`, `(${b},${constant})`, `(${h},${-k})`],
        solution: `Rewrite as y = (x - ${h})^2 + ${k}. Therefore the vertex is (${h}, ${k}).`,
        concepts: ["alg_quadratics", "alg_functions"],
        skills: ["vertex_form", "completing_square_pattern"],
        patterns: ["quadratic_structure", "graph_feature_identification"],
        misconceptions: ["vertex_sign_error", "constant_term_confusion"],
        difficulty: 5,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "quadratic_graphing",
        cognitiveTags: ["structure_recognition", "coordinate_reasoning"],
        hint1: "Look for the completed-square form.",
        hint2: "In (x - h)^2 + k, the vertex is (h, k).",
        commonMistake: "Using the sign inside the parentheses without reversing it.",
        variantIdea: "Ask for the axis of symmetry."
      });
    }
  },
  {
    prefix: "ca-ineq",
    build: (i) => {
      const a = 2 + (i % 5);
      const x = 3 + (i % 8);
      const b = 1 + (i % 6);
      const rhs = a * x + b;
      const answer = `x<${x}`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 2.4 Inequalities with Absolute Value and Quadratic Functions",
        chapter: "college-algebra-07-inequalities",
        chapterTitle: "Linear and Quadratic Inequalities",
        theme: "Inequalities and Algebraic Reasoning",
        sequenceBase: 5380,
        statement: `Solve ${a}x + ${b} < ${rhs}.`,
        answer,
        wrongs: [`x>${x}`, `x<${rhs - b}`, `x<${x + b}`, `x=${x}`],
        solution: `Subtract ${b}: ${a}x < ${rhs - b}. Divide by ${a}: x < ${x}.`,
        concepts: ["alg_linear_inequalities", "alg_linear_equations"],
        skills: ["linear_inequality_solving", "inverse_operations"],
        patterns: ["inequality_isolation", "interval_reasoning"],
        misconceptions: ["equation_inequality_confusion", "inverse_operation_order_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "inequality_solving",
        cognitiveTags: ["inverse_operations", "symbolic_fluency"],
        hint1: "Solve like a linear equation while keeping the inequality sign.",
        hint2: "Subtract the constant, then divide by the coefficient.",
        commonMistake: "Reporting only the boundary value instead of the inequality.",
        variantIdea: "Use a negative coefficient and reverse the inequality sign."
      });
    }
  },
  {
    prefix: "ca-poly",
    build: (i) => {
      const r = 1 + (i % 7);
      const value = r * r - 3 * r - 10;
      const answer = value === 0 ? "yes" : "no";
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 3.1 Graphs of Polynomials",
        chapter: "college-algebra-04-polynomial-structure",
        chapterTitle: "Polynomial Structure",
        theme: "Polynomials and Factoring",
        sequenceBase: 5400,
        statement: `Is x = ${r} a zero of f(x) = x^2 - 3x - 10?`,
        answer,
        wrongs: answer === "yes" ? ["no", String(value), String(r), "cannot tell"] : ["yes", "0", String(r), String(Math.abs(value))],
        solution: `Evaluate f(${r}) = ${r}^2 - 3(${r}) - 10 = ${value}. Since this is ${value === 0 ? "0" : "not 0"}, x = ${r} is ${answer === "yes" ? "" : "not "}a zero.`,
        concepts: ["alg_factoring", "alg_functions"],
        skills: ["polynomial_evaluation", "zero_testing"],
        patterns: ["function_zero_reasoning", "substitution"],
        misconceptions: ["zero_value_confusion", "substitution_error"],
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "polynomial_reasoning",
        cognitiveTags: ["symbol_evaluation", "structure_recognition"],
        hint1: "A zero makes the function value equal to 0.",
        hint2: "Substitute the proposed x-value into the polynomial.",
        commonMistake: "Treating the x-value itself as the function value.",
        variantIdea: "Ask for all integer zeros from a short candidate list."
      });
    }
  },
  {
    prefix: "ca-factor",
    build: (i) => {
      const r1 = 2 + (i % 6);
      const r2 = r1 + 1 + (i % 5);
      const b = r1 + r2;
      const c = r1 * r2;
      const answer = `(x+${r1})(x+${r2})`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 3.2 The Factor Theorem and Factoring",
        chapter: "college-algebra-04-polynomial-structure",
        chapterTitle: "Polynomial Structure",
        theme: "Polynomials and Factoring",
        sequenceBase: 5440,
        statement: `Factor x^2 + ${b}x + ${c}.`,
        answer,
        wrongs: [`(x-${r1})(x-${r2})`, `(x+${b})(x+${c})`, `(x+${r1})(x-${r2})`, `x(x+${b})+${c}`],
        solution: `Find two numbers that multiply to ${c} and add to ${b}: ${r1} and ${r2}. So the factorization is ${answer}.`,
        concepts: ["alg_factoring", "alg_quadratics"],
        skills: ["quadratic_factorization", "factor_pair_reasoning"],
        patterns: ["trinomial_factor_pattern", "polynomial_structure"],
        misconceptions: ["factor_pair_error", "sign_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "factoring",
        cognitiveTags: ["factor_structure", "structure_recognition"],
        hint1: "Look for two numbers that multiply to the constant.",
        hint2: "Those same numbers must add to the coefficient of x.",
        commonMistake: "Using the product and sum as the two factors.",
        variantIdea: "Use a negative middle term."
      });
    }
  },
  {
    prefix: "ca-system",
    build: (i) => {
      const x = 1 + (i % 8);
      const y = 2 + (i % 7);
      const sum = x + y;
      const diff = x - y;
      const answer = `(${x},${y})`;
      return baseDraft({
        sourceCollection: COLLEGE_SOURCE,
        sourceFile: "local-pdf: College Algebra -- Carl Stitz, Jeff Zeager.pdf",
        sourceSection: "College Algebra 8.1 Systems of Linear Equations",
        chapter: "college-algebra-08-systems",
        chapterTitle: "Systems of Linear Equations",
        theme: "Systems and Algebraic Modeling",
        sequenceBase: 5480,
        statement: `Solve the system x + y = ${sum} and x - y = ${diff}.`,
        answer,
        wrongs: [`(${y},${x})`, `(${sum},${diff})`, `(${x + y},${x - y})`, `(${-x},${-y})`],
        solution: `Add the equations: 2x = ${sum + diff}, so x = ${x}. Then y = ${sum} - ${x} = ${y}.`,
        concepts: ["alg_systems", "alg_linear_equations"],
        skills: ["systems_elimination", "linear_equation_solving"],
        patterns: ["equation_combination", "two_variable_reasoning"],
        misconceptions: ["variable_swap_error", "elimination_error"],
        difficulty: 5,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "systems_solving",
        cognitiveTags: ["multi_step_planning", "operation_selection"],
        hint1: "Add the two equations to eliminate y.",
        hint2: "After finding x, substitute back to find y.",
        commonMistake: "Treating the two right sides as the solution pair.",
        variantIdea: "Use coefficients other than 1 and -1."
      });
    }
  },
  {
    prefix: "eng-formula",
    build: (i) => {
      const a = 2 + (i % 5);
      const b = 3 + (i % 6);
      const y = 20 + i * 3;
      const numerator = y - b;
      const answer = `${numerator}/${a}`;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 5 Block 7 Formulae and Transposition",
        chapter: "engineers-math-01-formula-transposition",
        chapterTitle: "Formulae and Transposition",
        theme: "Engineering Algebra Foundations",
        sequenceBase: 6100,
        statement: `Rearrange y = ${a}x + ${b} to make x the subject.`,
        answer: `(y-${b})/${a}`,
        wrongs: [`y-${b}/${a}`, `(y+${b})/${a}`, `${a}/(y-${b})`, answer],
        solution: `Subtract ${b} from both sides to get y - ${b} = ${a}x. Divide by ${a}: x = (y - ${b})/${a}.`,
        concepts: ["alg_linear_equations", "prealg_simplification"],
        skills: ["formula_transposition", "inverse_operations"],
        patterns: ["symbolic_rearrangement", "linear_equation_structure"],
        misconceptions: ["inverse_operation_order_error", "division_scope_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "formula_rearrangement",
        cognitiveTags: ["symbolic_fluency", "inverse_operations"],
        hint1: "Undo the addition before undoing the multiplication.",
        hint2: "Keep the entire expression y minus the constant in the numerator.",
        commonMistake: "Dividing only the constant by the coefficient.",
        variantIdea: "Use a formula with a denominator and solve for the numerator variable."
      });
    }
  },
  {
    prefix: "eng-units",
    build: (i) => {
      const cm = 120 + i * 15;
      const answer = decimal(cm / 100);
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Foundation Review Units and Measurement",
        chapter: "engineers-math-00-units-measurement",
        chapterTitle: "Engineering Units and Measurement",
        theme: "Engineering Foundation Modeling",
        sequenceBase: 6000,
        statement: `A component is ${cm} cm long. Express this length in metres.`,
        answer,
        wrongs: [cm * 100, cm / 10, cm + 100, decimal(cm / 1000)],
        solution: `There are 100 cm in 1 metre, so ${cm} cm = ${cm}/100 = ${answer} m.`,
        concepts: ["arith_decimals", "arith_ratios"],
        skills: ["unit_conversion", "decimal_place_value"],
        patterns: ["unit_scaling", "place_value_shift"],
        misconceptions: ["scale_factor_error", "decimal_place_error"],
        difficulty: 2,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "unit_conversion",
        cognitiveTags: ["unit_conversion", "fluency_precision"],
        hint1: "Decide whether centimetres are smaller or larger than metres.",
        hint2: "Divide by 100 to convert centimetres to metres.",
        commonMistake: "Multiplying by 100 instead of dividing by 100.",
        variantIdea: "Convert millimetres to metres before substituting into a formula."
      });
    }
  },
  {
    prefix: "eng-prefix",
    build: (i) => {
      const kiloValue = 2 + (i % 9);
      const tenths = i % 2 === 0 ? 0 : 0.5;
      const kOhm = kiloValue + tenths;
      const answer = String(kOhm * 1000);
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Foundation Review SI Prefixes",
        chapter: "engineers-math-00-units-measurement",
        chapterTitle: "Engineering Units and Measurement",
        theme: "Engineering Foundation Modeling",
        sequenceBase: 6020,
        statement: `A resistor is rated at ${kOhm} kOhm. Express the resistance in ohms.`,
        answer,
        wrongs: [String(kOhm * 100), String(kOhm / 1000), String(kOhm + 1000), String(kOhm * 10)],
        solution: `The prefix kilo means 1000. Therefore ${kOhm} kOhm = ${kOhm} x 1000 = ${answer} ohms.`,
        concepts: ["arith_decimals", "arith_ratios"],
        skills: ["si_prefix_conversion", "decimal_scaling"],
        patterns: ["unit_scaling", "multiplicative_reasoning"],
        misconceptions: ["scale_factor_error", "decimal_place_error"],
        difficulty: 2,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "si_prefix_conversion",
        cognitiveTags: ["unit_conversion", "multiplicative_reasoning"],
        hint1: "Identify the multiplier for kilo.",
        hint2: "Multiply the kOhm value by 1000.",
        commonMistake: "Treating kilo as 100 or 10 instead of 1000.",
        variantIdea: "Use milli or micro and ask for the base unit."
      });
    }
  },
  {
    prefix: "eng-sci",
    build: (i) => {
      const coefficient = 2 + (i % 8);
      const exponent = 3 + (i % 3);
      const answer = String(coefficient * 10 ** exponent);
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Foundation Review Standard Form",
        chapter: "engineers-math-00-standard-form",
        chapterTitle: "Standard Form and Engineering Notation",
        theme: "Engineering Foundation Modeling",
        sequenceBase: 6040,
        statement: `Write ${coefficient} x 10^${exponent} as an ordinary number.`,
        answer,
        wrongs: [String(coefficient + exponent), String(coefficient * exponent), `${coefficient}.${"0".repeat(exponent)}`, String(coefficient * 10 ** (exponent - 1))],
        solution: `Multiplying by 10^${exponent} moves the decimal point ${exponent} places to the right, so the value is ${answer}.`,
        concepts: ["arith_exponents", "arith_decimals"],
        skills: ["scientific_notation", "powers_of_ten"],
        patterns: ["place_value_shift", "exponent_structure"],
        misconceptions: ["exponent_as_multiplier_error", "decimal_place_error"],
        difficulty: 3,
        layer: "Foundation",
        stage: "Bridge",
        problemType: "scientific_notation",
        cognitiveTags: ["place_value_reasoning", "structure_recognition"],
        hint1: "10 raised to a power tells you how many places to move.",
        hint2: "A positive exponent moves the decimal point to the right.",
        commonMistake: "Multiplying the coefficient by the exponent instead of by a power of 10.",
        variantIdea: "Convert a small decimal into scientific notation."
      });
    }
  },
  {
    prefix: "eng-sub",
    build: (i) => {
      const current = 2 + (i % 6);
      const resistance = 5 + (i % 8);
      const answer = current * resistance;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 5 Substitution into Formulae",
        chapter: "engineers-math-01-formula-substitution",
        chapterTitle: "Formula Substitution in Engineering Contexts",
        theme: "Engineering Foundation Modeling",
        sequenceBase: 6060,
        statement: `Use V = IR to find V when I = ${current} A and R = ${resistance} ohms.`,
        answer,
        wrongs: [current + resistance, resistance - current, current * current + resistance, answer + current],
        solution: `Substitute I = ${current} and R = ${resistance}: V = ${current} x ${resistance} = ${answer}.`,
        concepts: ["prealg_substitution", "arith_natural_numbers"],
        skills: ["formula_substitution", "multiplication_fluency"],
        patterns: ["formula_input_mapping", "engineering_quantity_model"],
        misconceptions: ["variable_meaning_error", "operation_selection_error"],
        difficulty: 3,
        layer: "Foundation",
        stage: "Bridge",
        problemType: "formula_substitution",
        cognitiveTags: ["symbol_evaluation", "formula_selection"],
        hint1: "Match each symbol in the formula with the given quantity.",
        hint2: "After substitution, multiply current by resistance.",
        commonMistake: "Adding the two quantities because both are listed in the prompt.",
        variantIdea: "Use P = VI after finding V."
      });
    }
  },
  {
    prefix: "eng-scale",
    build: (i) => {
      const scale = 4 + (i % 6);
      const drawing = 3 + (i % 8);
      const answer = scale * drawing;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Foundation Review Ratio and Scale",
        chapter: "engineers-math-04-proportionality",
        chapterTitle: "Proportionality and Engineering Models",
        theme: "Engineering Foundation Modeling",
        sequenceBase: 6080,
        statement: `On a technical drawing, 1 cm represents ${scale} m. What actual length is represented by ${drawing} cm?`,
        answer,
        wrongs: [scale + drawing, scale - drawing, drawing / scale, scale * drawing * 10],
        solution: `Each centimetre represents ${scale} m, so ${drawing} cm represents ${drawing} x ${scale} = ${answer} m.`,
        concepts: ["arith_proportions", "arith_ratios"],
        skills: ["scale_factor_modeling", "proportional_reasoning"],
        patterns: ["scale_model", "multiplicative_reasoning"],
        misconceptions: ["additive_ratio_error", "scale_factor_error"],
        difficulty: 3,
        layer: "Standard",
        stage: "Bridge",
        problemType: "scale_modeling",
        cognitiveTags: ["multiplicative_reasoning", "modeling_transfer"],
        hint1: "A drawing scale is a proportional relationship.",
        hint2: "Multiply the drawing length by the metres represented by each centimetre.",
        commonMistake: "Adding the scale number to the drawing length.",
        variantIdea: "Give the actual length and ask for the drawing length."
      });
    }
  },
  {
    prefix: "eng-rate",
    build: (i) => {
      const speed = 6 + (i % 7);
      const time = 3 + (i % 5);
      const answer = speed * time;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Foundation Review Rates and Formula Models",
        chapter: "engineers-math-05-rate-models",
        chapterTitle: "Rate Models and Engineering Quantities",
        theme: "Engineering Algebra Foundations",
        sequenceBase: 6420,
        statement: `A conveyor moves at ${speed} m/min for ${time} minutes. Use d = vt to find the distance moved.`,
        answer,
        wrongs: [speed + time, speed - time, speed / time, answer + speed],
        solution: `Use d = vt. Substitute v = ${speed} and t = ${time}: d = ${speed} x ${time} = ${answer} m.`,
        concepts: ["arith_ratios", "prealg_word_to_equation", "alg_functions"],
        skills: ["rate_modeling", "formula_substitution"],
        patterns: ["rate_time_distance_model", "engineering_quantity_model"],
        misconceptions: ["operation_selection_error", "unit_meaning_error"],
        difficulty: 3,
        layer: "Standard",
        stage: "Bridge",
        problemType: "rate_modeling",
        cognitiveTags: ["formula_selection", "modeling_transfer"],
        hint1: "Identify the rate and the time.",
        hint2: "Distance equals rate multiplied by time.",
        commonMistake: "Adding rate and time instead of using the multiplicative model.",
        variantIdea: "Give distance and rate, then ask for time."
      });
    }
  },
  {
    prefix: "eng-linmodel",
    build: (i) => {
      const initial = 30 + i;
      const rate = 2 + (i % 5);
      const minutes = 4 + (i % 6);
      const answer = initial + rate * minutes;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 7 Linear Models",
        chapter: "engineers-math-06-linear-engineering-models",
        chapterTitle: "Linear Engineering Models",
        theme: "Engineering Algebra Modeling",
        sequenceBase: 6460,
        statement: `A tank starts with ${initial} L of water and fills at ${rate} L/min. How much water is in the tank after ${minutes} minutes?`,
        answer,
        wrongs: [initial + minutes, rate * minutes, initial * rate + minutes, answer - rate],
        solution: `The linear model is amount = initial amount + rate x time. So amount = ${initial} + ${rate} x ${minutes} = ${answer} L.`,
        concepts: ["alg_functions", "alg_linear_equations"],
        skills: ["linear_modeling", "function_evaluation"],
        patterns: ["initial_value_rate_model", "input_output_mapping"],
        misconceptions: ["intercept_rate_confusion", "operation_selection_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "engineering_linear_modeling",
        cognitiveTags: ["modeling_transfer", "input_output_mapping"],
        hint1: "Separate the starting amount from the amount added each minute.",
        hint2: "Multiply the rate by time, then add the initial amount.",
        commonMistake: "Using only the rate-time product and forgetting the initial amount.",
        variantIdea: "Ask for the time needed to reach a target amount."
      });
    }
  },
  {
    prefix: "eng-breakeven",
    build: (i) => {
      const fixedA = 20 + i * 2;
      const fixedB = 8 + i;
      const rateA = 3 + (i % 3);
      const rateB = rateA + 2;
      const answer = Math.floor((fixedA - fixedB) / (rateB - rateA));
      const adjustedFixedA = fixedB + answer * (rateB - rateA);
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 7 Simultaneous Equations and Engineering Models",
        chapter: "engineers-math-07-systems-modeling",
        chapterTitle: "Systems and Break-Even Engineering Models",
        theme: "Engineering Algebra Modeling",
        sequenceBase: 6500,
        statement: `Machine A costs ${adjustedFixedA} + ${rateA}x dollars to run for x hours. Machine B costs ${fixedB} + ${rateB}x dollars. For how many hours are the costs equal?`,
        answer,
        wrongs: [adjustedFixedA - fixedB, rateB - rateA, answer + fixedB, answer + rateA],
        solution: `Set the models equal: ${adjustedFixedA} + ${rateA}x = ${fixedB} + ${rateB}x. Then ${adjustedFixedA - fixedB} = ${rateB - rateA}x, so x = ${answer}.`,
        concepts: ["alg_linear_equations", "alg_systems"],
        skills: ["break_even_modeling", "linear_equation_solving"],
        patterns: ["two_model_comparison", "equation_from_context"],
        misconceptions: ["intercept_rate_confusion", "inverse_operation_order_error"],
        difficulty: 5,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "engineering_system_modeling",
        cognitiveTags: ["multi_step_planning", "modeling_transfer"],
        hint1: "Equal costs means set the two expressions equal.",
        hint2: "Move the x-terms to one side and constants to the other.",
        commonMistake: "Subtracting the two fixed costs and stopping before dividing by the rate difference.",
        variantIdea: "Ask which machine is cheaper before and after the break-even time."
      });
    }
  },
  {
    prefix: "eng-linear",
    build: (i) => {
      const x = 2 + i;
      const a = 3 + (i % 5);
      const b = 2 + (i % 4);
      const c = 1 + (i % 6);
      const rhs = a * (x + b) + c;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 7 Block 1 Solving Linear Equations",
        chapter: "engineers-math-02-linear-equations",
        chapterTitle: "Solving Linear Equations",
        theme: "Engineering Algebra Foundations",
        sequenceBase: 6200,
        statement: `Solve ${a}(x + ${b}) + ${c} = ${rhs}.`,
        answer: x,
        wrongs: [rhs - c, Math.floor((rhs - c) / a), x + b, -x],
        solution: `Subtract ${c}: ${a}(x + ${b}) = ${rhs - c}. Divide by ${a}: x + ${b} = ${x + b}. Subtract ${b}: x = ${x}.`,
        concepts: ["alg_linear_equations", "prealg_simplification"],
        skills: ["multi_step_equation_solving", "distribution_structure"],
        patterns: ["nested_inverse_operations", "linear_equation_structure"],
        misconceptions: ["inverse_operation_order_error", "parentheses_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "equation_solving",
        cognitiveTags: ["multi_step_planning", "inverse_operations"],
        hint1: "Undo the outside addition first.",
        hint2: "After dividing, solve the remaining x plus constant equation.",
        commonMistake: "Dividing the whole right side before removing the final constant.",
        variantIdea: "Put the variable expression on both sides."
      });
    }
  },
  {
    prefix: "eng-quad",
    build: (i) => {
      const r1 = 1 + (i % 5);
      const r2 = r1 + 1 + (i % 5);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const middle = b < 0 ? `- ${Math.abs(b)}x` : `+ ${b}x`;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 7 Block 2 Solving Quadratic Equations",
        chapter: "engineers-math-03-quadratic-equations",
        chapterTitle: "Solving Quadratic Equations",
        theme: "Engineering Algebra Foundations",
        sequenceBase: 6300,
        statement: `Solve x^2 ${middle} + ${c} = 0 by factorising.`,
        answer: `${r1},${r2}`,
        wrongs: [`${-r1},${-r2}`, `${r1 + r2},${c}`, `${r1},${-r2}`, `${c}`],
        solution: `The expression factors as (x - ${r1})(x - ${r2}) = 0, so x = ${r1} or x = ${r2}.`,
        concepts: ["alg_quadratics", "alg_factoring"],
        skills: ["quadratic_factorization", "zero_product_property"],
        patterns: ["factor_pair_reasoning", "root_finding"],
        misconceptions: ["sign_error", "factor_pair_error"],
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "quadratic_solving",
        cognitiveTags: ["factor_structure", "operation_selection"],
        hint1: "Find two numbers that multiply to the constant term.",
        hint2: "The same two numbers should add to the x-coefficient.",
        commonMistake: "Reporting the factor numbers without changing signs for the roots.",
        variantIdea: "Use the quadratic formula when the expression does not factor cleanly."
      });
    }
  },
  {
    prefix: "eng-prop",
    build: (i) => {
      const k = 3 + (i % 5);
      const x = 4 + i;
      const y = k * x;
      const nextX = x + 3;
      return baseDraft({
        sourceCollection: ENGINEERS_SOURCE,
        sourceFile: "local-pdf: Mathematics for Engineers_Anthony Croft, Robert Davison.pdf",
        sourceSection: "Mathematics for Engineers Chapter 7 Block 7 Proportionality",
        chapter: "engineers-math-04-proportionality",
        chapterTitle: "Proportionality and Engineering Models",
        theme: "Engineering Algebra Foundations",
        sequenceBase: 6400,
        statement: `A quantity y is directly proportional to x. When x = ${x}, y = ${y}. Find y when x = ${nextX}.`,
        answer: k * nextX,
        wrongs: [y + nextX, y + 3, k + nextX, y * nextX],
        solution: `Direct proportionality means y = kx. Since ${y} = k(${x}), k = ${k}. When x = ${nextX}, y = ${k}(${nextX}) = ${k * nextX}.`,
        concepts: ["arith_proportions", "alg_functions"],
        skills: ["proportional_modeling", "unit_rate_modeling"],
        patterns: ["direct_variation", "linear_modeling"],
        misconceptions: ["additive_ratio_error", "scale_factor_error"],
        difficulty: 4,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "proportional_reasoning",
        cognitiveTags: ["multiplicative_reasoning", "modeling_transfer"],
        hint1: "Write the relationship as y = kx.",
        hint2: "Use the first pair to find k, then apply it to the new x-value.",
        commonMistake: "Adding the change in x to y instead of using the constant of proportionality.",
        variantIdea: "Use inverse proportionality and compare the model."
      });
    }
  }
];

function main() {
  const requestedSource = readSourceArg();
  const activeTopics = topics.filter((topic) => {
    const sample = topic.build(0);
    return requestedSource === "all" || sample.sourceCollection === requestedSource;
  });
  const problems: GeneratedProblem[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  activeTopics.forEach((topic, topicIndex) => {
    for (let variant = 0; variant < PROBLEMS_PER_TOPIC; variant += 1) {
      const draft = topic.build(variant);
      const sourcePrefix = draft.sourceCollection === COLLEGE_SOURCE ? "college_alg" : "eng_math";
      const id = `${sourcePrefix}_${topic.prefix.replace(/^(ca|eng)-/, "")}_${String(variant + 1).padStart(3, "0")}`;
      const mapped = mapDraft(id, draft, topicIndex, variant);
      problems.push(mapped.problem);
      distractors.push(...mapped.distractors);
      explanations.push(mapped.explanation);
    }
  });

  fs.mkdirSync(COLLEGE_DIR, { recursive: true });
  fs.mkdirSync(ENGINEERS_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const collegeProblems = problems.filter((problem) => problem.source_collection === COLLEGE_SOURCE);
  const engineersProblems = problems.filter((problem) => problem.source_collection === ENGINEERS_SOURCE);
  if (collegeProblems.length > 0) writeDataset(COLLEGE_DIR, COLLEGE_SOURCE, COLLEGE_LOCAL_PDF, collegeProblems);
  if (engineersProblems.length > 0) writeDataset(ENGINEERS_DIR, ENGINEERS_SOURCE, ENGINEERS_LOCAL_PDF, engineersProblems);
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log(`Generated ${problems.length} higher-algebra bridge problem(s)`);
  console.log(`- ${COLLEGE_SOURCE}: ${problems.filter((problem) => problem.source_collection === COLLEGE_SOURCE).length}`);
  console.log(`- ${ENGINEERS_SOURCE}: ${problems.filter((problem) => problem.source_collection === ENGINEERS_SOURCE).length}`);
  console.log(`Distractors: ${distractors.length}`);
  console.log(`Explanations: ${explanations.length}`);
}

function readSourceArg() {
  const source = readArg("--source");
  if (!source || source === "all") return "all";
  if (source === "college") return COLLEGE_SOURCE;
  if (source === "engineers") return ENGINEERS_SOURCE;
  throw new Error(`Unknown --source ${source}. Use all, college, or engineers.`);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function mapDraft(id: string, draft: ProblemDraft, topicIndex: number, variant: number) {
  const choices = buildChoices(draft.answer, draft.wrongs, variant);
  const problem: GeneratedProblem = {
    id,
    statement: draft.statement,
    answer: draft.answer,
    answer_type: "multiple_choice",
    choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
    difficulty: String(draft.difficulty),
    concepts: draft.concepts.join(";"),
    skills: (draft.skills ?? [draft.problemType]).join(";"),
    patterns: (draft.patterns ?? draft.cognitiveTags).join(";"),
    misconceptions: (draft.misconceptions ?? ["operation_error", "structure_misread"]).join(";"),
    solution: draft.solution,
    course: "Algebra 1",
    theme: draft.theme,
    chapter: draft.chapter,
    chapter_title: draft.chapterTitle,
    sequence: String(draft.sequenceBase + topicIndex * 30 + variant),
    source_collection: draft.sourceCollection,
    source_file: `${draft.sourceFile}; ${draft.sourceSection}`,
    taxonomy_layer: draft.layer,
    taxonomy_stage: draft.stage,
    problem_type: draft.problemType,
    cognitive_tags: draft.cognitiveTags.join(";"),
    estimated_time_seconds: String(90 + Math.max(0, draft.difficulty - 3) * 20),
    notes: "Original-equivalent bridge item generated from local textbook coverage signals. No full textbook exercise text is reproduced."
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
    hint_1: draft.hint1 ?? "Identify the algebraic structure before calculating.",
    hint_2: draft.hint2 ?? "Use one inverse operation or substitution step at a time.",
    step_by_step: draft.solution,
    common_mistake: draft.commonMistake ?? "Rushing the first algebraic step can change the structure.",
    why_correct: `The correct answer is ${problem.answer} because ${draft.solution}`,
    variant_idea: draft.variantIdea ?? "Change one coefficient and solve the same structure again."
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

function decimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function buildChoices(answer: string, wrongs: string[], variant: number) {
  const values = unique([answer, ...wrongs]).slice(0, 5);
  while (values.length < 5) values.push(fallbackWrong(answer, values.length));
  const rotated = rotate(values, variant % values.length);
  if (!rotated.some((value) => normalize(value) === normalize(answer))) rotated[0] = answer;

  return rotated.slice(0, 5).map((value, index) => ({
    label: String.fromCharCode(65 + index),
    value
  }));
}

function fallbackWrong(answer: string, offset: number) {
  const numeric = Number(answer);
  if (Number.isFinite(numeric)) return String(numeric + offset + 1);
  if (answer.includes(",")) return answer.split(",").reverse().join(",");
  if (answer === "yes") return "no";
  if (answer === "no") return "yes";
  return `${answer}+${offset + 1}`;
}

function inferMisconception(value: string, answer: string) {
  if (/^-/.test(value) !== /^-/.test(answer)) return "sign_error";
  if (/[xy]/i.test(value) || /[xy]/i.test(answer)) return "symbolic_structure_error";
  if (value.includes("/") || answer.includes("/")) return "division_scope_error";
  if (value.includes(",")) return "solution_set_error";
  return "operation_error";
}

function writeDataset(dir: string, sourceCollection: string, localPdf: string, problems: GeneratedProblem[]) {
  const chapters = [...new Set(problems.map((problem) => problem.chapter_title))];
  fs.writeFileSync(path.join(dir, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  fs.writeFileSync(
    path.join(dir, "README.md"),
    [
      `# ${sourceCollection.replace(/_/g, " ")}`,
      "",
      "This dataset stores project-native, original-equivalent bridge problems generated from local textbook coverage signals.",
      "",
      `Local source PDF: \`${localPdf}\``,
      `Generated problems: ${problems.length}`,
      `Chapters: ${chapters.length}`,
      "",
      "Mapped scope:",
      ...chapters.map((chapter) => `- ${chapter}`),
      "",
      "Refresh flow:",
      "",
      "```bash",
      "npm run generate:higher-algebra-bridge",
      "npm run validate:staging",
      "npm run promote:staging",
      "npm run sync:explanations",
      "```",
      ""
    ].join("\n")
  );
}

function toCsv<T extends Record<string, string>>(rows: T[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")).join("\n")}\n`;
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
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

main();
