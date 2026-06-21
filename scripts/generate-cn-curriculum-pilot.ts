import fs from "fs";
import path from "path";

type Layer = "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";

type ProblemRow = {
  id: string;
  statement: string;
  answer: string;
  answer_type: "multiple_choice";
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
  language: "zh";
  curriculum_system: "CN" | "Olympiad";
  region: "CN";
  display_track: string;
  grade_band: string;
  content_status: "pilot";
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

type Draft = Omit<ProblemRow, "answer" | "answer_type" | "choices" | "id" | "language" | "curriculum_system" | "region" | "display_track" | "grade_band" | "content_status"> & {
  answer: string | number;
  wrongs: Array<string | number>;
  hint1: string;
  hint2: string;
  commonMistake: string;
  whyCorrect?: string;
  variantIdea: string;
  curriculumSystem: "CN" | "Olympiad";
  displayTrack: string;
  gradeBand: string;
};

const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const SOURCE_COLLECTION = "cn_curriculum_pilot_v0";

const drafts: Draft[] = [
  {
    statement: "计算：3/4 + 1/8 = ?",
    answer: "7/8",
    wrongs: ["4/12", "1/2", "5/8", "3/8"],
    difficulty: "2",
    concepts: "arith_fractions",
    skills: "common_denominator;fraction_addition",
    patterns: "part_whole_reasoning;denominator_alignment",
    misconceptions: "add_denominators_error;equivalent_fraction_error",
    solution: "先通分，3/4 = 6/8，所以 6/8 + 1/8 = 7/8。",
    course: "CN Primary Math",
    theme: "数与运算",
    chapter: "cn-primary-01-fractions",
    chapter_title: "小学分数运算",
    sequence: "12000",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Foundation",
    taxonomy_stage: "Foundation",
    problem_type: "cn_fraction_computation",
    cognitive_tags: "part_whole_reasoning;fluency_precision",
    estimated_time_seconds: "75",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "先看两个分母是否相同。",
    hint2: "把 3/4 化成分母为 8 的分数。",
    commonMistake: "把分子和分母分别相加，得到 4/12。",
    variantIdea: "换成异分母分数减法，继续练习通分。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "小学"
  },
  {
    statement: "一件商品原价 80 元，降价 25% 后售价是多少元？",
    answer: 60,
    wrongs: [55, 75, 20, 100],
    difficulty: "3",
    concepts: "arith_percentages;arith_ratios",
    skills: "percent_discount;proportional_reasoning",
    patterns: "percent_of_quantity;multiplicative_reasoning",
    misconceptions: "percent_base_error;additive_percent_error",
    solution: "降价 25% 表示少付 80 x 25% = 20 元，所以售价是 80 - 20 = 60 元。",
    course: "CN Primary Math",
    theme: "百分数与应用题",
    chapter: "cn-primary-02-percent-word-problems",
    chapter_title: "小学百分数应用题",
    sequence: "12020",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Bridge",
    problem_type: "cn_percent_word_problem",
    cognitive_tags: "multiplicative_reasoning;modeling_transfer",
    estimated_time_seconds: "95",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "先求降价了多少钱。",
    hint2: "25% 可以看成 1/4。",
    commonMistake: "直接用 80 - 25，忽略 25% 是比例不是 25 元。",
    variantIdea: "把降价改成涨价，比较新价格。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "小学"
  },
  {
    statement: "解方程：2x + 5 = 17。",
    answer: 6,
    wrongs: [11, 12, 5, 7],
    difficulty: "3",
    concepts: "alg_linear_equations;prealg_expressions",
    skills: "one_variable_equation;inverse_operations",
    patterns: "linear_equation_structure;equation_balance",
    misconceptions: "inverse_operation_order_error;constant_term_error",
    solution: "两边先减 5，得到 2x = 12；再两边除以 2，得到 x = 6。",
    course: "CN Junior High Math",
    theme: "方程与代数",
    chapter: "cn-junior-01-linear-equations",
    chapter_title: "初中一元一次方程",
    sequence: "12100",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Algebra Readiness",
    problem_type: "cn_linear_equation_solving",
    cognitive_tags: "inverse_operations;symbolic_fluency",
    estimated_time_seconds: "80",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "先把常数项移到等号右边。",
    hint2: "最后把 x 的系数化为 1。",
    commonMistake: "先除以 2 时没有同时处理 +5。",
    variantIdea: "加入括号，变成 3(x - 2) = 12。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "初中"
  },
  {
    statement: "分解因式：x^2 + 5x + 6。",
    answer: "(x+2)(x+3)",
    wrongs: ["(x+1)(x+6)", "(x-2)(x-3)", "x(x+5)+6", "(x+2)(x-3)"],
    difficulty: "4",
    concepts: "alg_factoring;alg_quadratics",
    skills: "quadratic_factorization;factor_pair_reasoning",
    patterns: "trinomial_factor_pattern;structure_recognition",
    misconceptions: "factor_pair_error;sign_error",
    solution: "寻找两个数，使乘积为 6、和为 5，这两个数是 2 和 3，所以 x^2 + 5x + 6 = (x+2)(x+3)。",
    course: "CN Junior High Math",
    theme: "整式与因式分解",
    chapter: "cn-junior-02-factorization",
    chapter_title: "初中因式分解",
    sequence: "12120",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Algebra Readiness",
    problem_type: "cn_factorization",
    cognitive_tags: "factor_structure;structure_recognition",
    estimated_time_seconds: "100",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "看常数项 6 的因数对。",
    hint2: "找乘积是 6、和是 5 的一组数。",
    commonMistake: "只看乘积，不检查一次项系数。",
    variantIdea: "换成 x^2 - 5x + 6，比较符号变化。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "初中"
  },
  {
    statement: "已知一次函数 y = 2x - 3，当 x = 5 时，y 的值是多少？",
    answer: 7,
    wrongs: [10, 13, 2, -7],
    difficulty: "3",
    concepts: "alg_functions;prealg_substitution",
    skills: "function_evaluation;substitution",
    patterns: "input_output_mapping;linear_function_evaluation",
    misconceptions: "variable_meaning_error;operation_order_error",
    solution: "把 x = 5 代入 y = 2x - 3，得到 y = 2 x 5 - 3 = 10 - 3 = 7。",
    course: "CN Junior High Math",
    theme: "函数初步",
    chapter: "cn-junior-03-linear-functions",
    chapter_title: "初中一次函数",
    sequence: "12140",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Algebra Readiness",
    problem_type: "cn_function_evaluation",
    cognitive_tags: "input_output_mapping;symbol_evaluation",
    estimated_time_seconds: "80",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "把给定的 x 值代入函数表达式。",
    hint2: "先算 2 x 5，再减 3。",
    commonMistake: "把 2x - 3 误算成 2 + x - 3。",
    variantIdea: "给定 y 的值，反求 x。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "初中"
  },
  {
    statement: "解方程：x^2 - 5x + 6 = 0。",
    answer: "2,3",
    wrongs: ["-2,-3", "1,6", "5,6", "2,-3"],
    difficulty: "4",
    concepts: "alg_quadratics;alg_factoring",
    skills: "quadratic_solving;zero_product_property",
    patterns: "quadratic_factor_pattern;root_finding",
    misconceptions: "sign_error;factor_pair_error",
    solution: "x^2 - 5x + 6 = (x-2)(x-3)，所以 x = 2 或 x = 3。",
    course: "CN Senior High Math",
    theme: "函数与方程",
    chapter: "cn-senior-01-quadratic-equations",
    chapter_title: "高中二次方程",
    sequence: "12200",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Algebra Readiness",
    problem_type: "cn_quadratic_solving",
    cognitive_tags: "factor_structure;operation_selection",
    estimated_time_seconds: "110",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "先尝试因式分解。",
    hint2: "因式为 0 时，每个括号分别等于 0。",
    commonMistake: "把因式中的符号直接当成根的符号。",
    variantIdea: "换成不能直接分解的二次方程，使用公式法。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "高中"
  },
  {
    statement: "函数 y = (x - 2)^2 + 1 的顶点坐标是？",
    answer: "(2,1)",
    wrongs: ["(-2,1)", "(2,-1)", "(-2,-1)", "(1,2)"],
    difficulty: "4",
    concepts: "alg_quadratics;alg_functions",
    skills: "vertex_form;graph_feature_identification",
    patterns: "quadratic_structure;coordinate_reasoning",
    misconceptions: "vertex_sign_error;coordinate_order_error",
    solution: "二次函数顶点式 y = (x - h)^2 + k 的顶点是 (h, k)。这里 h = 2，k = 1，所以顶点是 (2,1)。",
    course: "CN Senior High Math",
    theme: "函数与图像",
    chapter: "cn-senior-02-quadratic-functions",
    chapter_title: "高中二次函数图像",
    sequence: "12220",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Honors",
    taxonomy_stage: "Algebra Readiness",
    problem_type: "cn_quadratic_graphing",
    cognitive_tags: "structure_recognition;coordinate_reasoning",
    estimated_time_seconds: "100",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "识别顶点式。",
    hint2: "(x - h)^2 + k 对应顶点 (h, k)。",
    commonMistake: "看到 x - 2 就把横坐标写成 -2。",
    variantIdea: "给出一般式，先配方再找顶点。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "高中"
  },
  {
    statement: "一个三角形的三个角度数之比为 2:3:4，最大的角是多少度？",
    answer: 80,
    wrongs: [40, 60, 90, 100],
    difficulty: "3",
    concepts: "geo_triangle_angles;arith_ratios",
    skills: "ratio_partition;triangle_angle_sum",
    patterns: "part_whole_reasoning;geometry_modeling",
    misconceptions: "ratio_sum_error;angle_sum_error",
    solution: "三角形内角和为 180 度。比例总份数是 2+3+4=9，每份是 180/9=20 度，最大角是 4 份，即 80 度。",
    course: "CN Junior High Math",
    theme: "几何基础",
    chapter: "cn-junior-04-triangle-angles",
    chapter_title: "初中三角形内角",
    sequence: "12160",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Standard",
    taxonomy_stage: "Bridge",
    problem_type: "cn_geometry_ratio_angle",
    cognitive_tags: "geometric_reasoning;multiplicative_reasoning",
    estimated_time_seconds: "95",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "先用三角形内角和。",
    hint2: "把 180 度按 2:3:4 分成 9 份。",
    commonMistake: "直接把最大角看成 4 度或 4/9 度。",
    variantIdea: "给出两个角的比和第三个角，反求最大角。",
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    gradeBand: "初中"
  },
  {
    statement: "从 1 到 20 的整数中，能被 3 整除的数有多少个？",
    answer: 6,
    wrongs: [5, 7, 3, 20],
    difficulty: "2",
    concepts: "nt_divisibility;arith_natural_numbers",
    skills: "divisibility_counting;multiples",
    patterns: "multiple_structure;counting_sequence",
    misconceptions: "endpoint_count_error;divisor_count_confusion",
    solution: "1 到 20 中 3 的倍数是 3, 6, 9, 12, 15, 18，共 6 个。",
    course: "CN Olympiad Lite",
    theme: "数论启蒙",
    chapter: "cn-olympiad-lite-01-divisibility",
    chapter_title: "中文奥数 Lite：整除与倍数",
    sequence: "12300",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Foundation",
    taxonomy_stage: "Bridge",
    problem_type: "cn_divisibility_counting",
    cognitive_tags: "number_structure;fluency_precision",
    estimated_time_seconds: "70",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "列出 3 的倍数。",
    hint2: "注意不要超过 20。",
    commonMistake: "把 20/3 的余数处理错，导致多算或少算。",
    variantIdea: "改成同时能被 2 和 3 整除的数。",
    curriculumSystem: "Olympiad",
    displayTrack: "中文奥数 Lite",
    gradeBand: "小学-初中"
  },
  {
    statement: "有 5 个不同的小球排成一排，一共有多少种排法？",
    answer: 120,
    wrongs: [25, 10, 60, 24],
    difficulty: "4",
    concepts: "counting_permutations;counting_principle",
    skills: "permutation_counting;multiplication_principle",
    patterns: "factorial_structure;ordered_arrangement",
    misconceptions: "combination_permutation_confusion;multiplication_principle_error",
    solution: "第 1 个位置有 5 种选择，第 2 个位置有 4 种，依次为 5 x 4 x 3 x 2 x 1 = 120。",
    course: "CN Olympiad Lite",
    theme: "计数启蒙",
    chapter: "cn-olympiad-lite-02-counting",
    chapter_title: "中文奥数 Lite：排列与计数",
    sequence: "12320",
    source_collection: SOURCE_COLLECTION,
    source_file: "project-native: cn curriculum pilot v0",
    taxonomy_layer: "Honors",
    taxonomy_stage: "AMC8 Transfer",
    problem_type: "cn_permutation_counting",
    cognitive_tags: "counting_structure;multi_step_planning",
    estimated_time_seconds: "110",
    notes: "Original project-native Chinese pilot item. No external textbook exercise text is reproduced.",
    hint1: "按位置逐个考虑选择数。",
    hint2: "每放好一个球，剩下可选的小球数少 1。",
    commonMistake: "把每个位置都当成有 5 种选择，得到 25 或 5^5。",
    variantIdea: "加入限制条件，例如某个球必须在最左边。",
    curriculumSystem: "Olympiad",
    displayTrack: "中文奥数 Lite",
    gradeBand: "小学-初中"
  }
];

function main() {
  const problems: ProblemRow[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  drafts.forEach((draft, index) => {
    const id = `cn_pilot_${String(index + 1).padStart(3, "0")}`;
    const choices = buildChoices(String(draft.answer), draft.wrongs.map(String), index);
    problems.push({
      id,
      statement: draft.statement,
      answer: String(draft.answer),
      answer_type: "multiple_choice",
      choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
      difficulty: draft.difficulty,
      concepts: draft.concepts,
      skills: draft.skills,
      patterns: draft.patterns,
      misconceptions: draft.misconceptions,
      solution: draft.solution,
      course: draft.course,
      theme: draft.theme,
      chapter: draft.chapter,
      chapter_title: draft.chapter_title,
      sequence: draft.sequence,
      source_collection: draft.source_collection,
      source_file: draft.source_file,
      taxonomy_layer: draft.taxonomy_layer,
      taxonomy_stage: draft.taxonomy_stage,
      problem_type: draft.problem_type,
      cognitive_tags: draft.cognitive_tags,
      estimated_time_seconds: draft.estimated_time_seconds,
      notes: draft.notes,
      language: "zh",
      curriculum_system: draft.curriculumSystem,
      region: "CN",
      display_track: draft.displayTrack,
      grade_band: draft.gradeBand,
      content_status: "pilot"
    });

    distractors.push(
      ...choices
        .filter((choice) => normalize(choice.value) !== normalize(String(draft.answer)))
        .map((choice): DistractorRow => ({
          problem_id: id,
          choice_label: choice.label,
          value: choice.value,
          misconception: inferMisconception(choice.value, String(draft.answer), draft.problem_type),
          cognitive_tag: draft.cognitive_tags.split(";")[0] ?? "general_reasoning",
          explanation: `这个选项反映了${formatMisconception(inferMisconception(choice.value, String(draft.answer), draft.problem_type))}。`
        }))
    );

    explanations.push({
      problem_id: id,
      hint_1: draft.hint1,
      hint_2: draft.hint2,
      step_by_step: draft.solution,
      common_mistake: draft.commonMistake,
      why_correct: draft.whyCorrect ?? `正确答案是 ${draft.answer}，因为：${draft.solution}`,
      variant_idea: draft.variantIdea
    });
  });

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log(`Generated ${problems.length} Chinese curriculum pilot problem(s)`);
  console.log(`Distractors: ${distractors.length}`);
  console.log(`Explanations: ${explanations.length}`);
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
  if (answer.startsWith("(")) return answer.replace("-", "");
  return `${answer}+${offset + 1}`;
}

function inferMisconception(value: string, answer: string, problemType: string) {
  if (problemType.includes("percent")) return "percent_base_error";
  if (problemType.includes("factor") || problemType.includes("quadratic")) return "factor_structure_error";
  if (problemType.includes("count")) return "counting_structure_error";
  if (/[()]/.test(value) || /[()]/.test(answer)) return "coordinate_or_structure_error";
  if (value.includes("/") || answer.includes("/")) return "fraction_structure_error";
  return "operation_error";
}

function formatMisconception(value: string) {
  const labels: Record<string, string> = {
    coordinate_or_structure_error: "坐标或结构识别错误",
    counting_structure_error: "计数结构理解错误",
    factor_structure_error: "因式结构判断错误",
    fraction_structure_error: "分数结构理解错误",
    operation_error: "运算步骤错误",
    percent_base_error: "百分数基准量理解错误"
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

function toCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => escapeCsv(String(row[header] ?? ""))).join(",")).join("\n")}\n`;
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
