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
  const problems: GeneratedProblem[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  topics.forEach((topic, topicIndex) => {
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

  writeDataset(COLLEGE_DIR, COLLEGE_SOURCE, COLLEGE_LOCAL_PDF, problems.filter((problem) => problem.source_collection === COLLEGE_SOURCE));
  writeDataset(ENGINEERS_DIR, ENGINEERS_SOURCE, ENGINEERS_LOCAL_PDF, problems.filter((problem) => problem.source_collection === ENGINEERS_SOURCE));
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log(`Generated ${problems.length} higher-algebra bridge problem(s)`);
  console.log(`- ${COLLEGE_SOURCE}: ${problems.filter((problem) => problem.source_collection === COLLEGE_SOURCE).length}`);
  console.log(`- ${ENGINEERS_SOURCE}: ${problems.filter((problem) => problem.source_collection === ENGINEERS_SOURCE).length}`);
  console.log(`Distractors: ${distractors.length}`);
  console.log(`Explanations: ${explanations.length}`);
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
