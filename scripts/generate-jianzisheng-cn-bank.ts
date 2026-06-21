import fs from "fs";
import path from "path";

type Layer = "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";
type CurriculumSystem = "CN" | "Olympiad";

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
  curriculum_system: CurriculumSystem;
  region: "CN";
  display_track: string;
  grade_band: string;
  content_status: "production";
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

type Draft = {
  answer: string | number;
  chapter: string;
  chapterTitle: string;
  cognitiveTags: string[];
  concepts: string[];
  course: "CN Primary Math" | "CN Junior High Math" | "CN Senior High Math" | "CN Olympiad Lite";
  curriculumSystem: CurriculumSystem;
  difficulty: number;
  displayTrack: "中文校内" | "中文奥数 Lite";
  gradeBand: string;
  hint1: string;
  hint2: string;
  layer: Layer;
  misconceptions: string[];
  patterns: string[];
  problemType: string;
  sequenceBase: number;
  skills: string[];
  solution: string;
  sourceFile: string;
  sourceSection: string;
  stage: Stage;
  statement: string;
  theme: string;
  commonMistake: string;
  variantIdea: string;
  wrongs: Array<string | number>;
};

type Topic = {
  prefix: string;
  sourceFile: string;
  sourceSection: string;
  build: (variant: number) => Draft;
};

const SOURCE_COLLECTION = "jianzisheng_cn_math_bank_1_12";
const SOURCE_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const LOCAL_SOURCE_DIR = "/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12";
const PROBLEMS_PER_TOPIC = 20;

const topics: Topic[] = [
  {
    prefix: "g1-number-patterns",
    sourceFile: "尖子生高分题库1年级.pdf",
    sourceSection: "一年级：数的认识与找规律",
    build: (i) => {
      const start = 2 + (i % 5);
      const step = 2 + (i % 4);
      const answer = start + step * 4;
      return cnDraft({
        statement: `观察数列：${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, __。空格里应填多少？`,
        answer,
        wrongs: [answer - step, answer + step, start + step * 5, answer - 1],
        solution: `相邻两个数都增加 ${step}，所以第四个数后面再加 ${step}，得到 ${answer}。`,
        concepts: ["arith_natural_numbers"],
        skills: ["sequence_observation", "addition_fluency"],
        patterns: ["constant_difference_pattern", "number_sequence"],
        misconceptions: ["skip_count_error", "endpoint_error"],
        course: "CN Primary Math",
        theme: "数与规律",
        chapter: "cn-primary-g1-number-patterns",
        chapterTitle: "一年级：数的认识与找规律",
        sequenceBase: 13000,
        difficulty: 1,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "cn_number_pattern",
        cognitiveTags: ["pattern_recognition", "fluency_precision"],
        hint1: "先比较相邻两个数相差多少。",
        hint2: "每次都加同一个数。",
        commonMistake: "只看最后一个数，没有确认前面每一步的变化量。",
        variantIdea: "把加法规律改成减法规律。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库1年级.pdf",
        sourceSection: "一年级：数的认识与找规律"
      });
    }
  },
  {
    prefix: "g2-word-arithmetic",
    sourceFile: "尖子生高分题库2年级.pdf",
    sourceSection: "二年级：加减乘除应用题",
    build: (i) => {
      const boxes = 3 + (i % 5);
      const each = 4 + (i % 6);
      const used = 5 + (i % 8);
      const answer = boxes * each - used;
      return cnDraft({
        statement: `有 ${boxes} 盒铅笔，每盒 ${each} 支，送给同学 ${used} 支后，还剩多少支？`,
        answer,
        wrongs: [boxes + each - used, boxes * each + used, boxes * (each - used), answer + boxes],
        solution: `先求一共有 ${boxes} x ${each} = ${boxes * each} 支，再减去送出的 ${used} 支，剩 ${answer} 支。`,
        concepts: ["arith_natural_numbers"],
        skills: ["multiplication_modeling", "two_step_word_problem"],
        patterns: ["part_whole_reasoning", "operation_selection"],
        misconceptions: ["operation_selection_error", "one_step_only_error"],
        course: "CN Primary Math",
        theme: "应用题基础",
        chapter: "cn-primary-g2-word-arithmetic",
        chapterTitle: "二年级：加减乘除应用题",
        sequenceBase: 13040,
        difficulty: 2,
        layer: "Foundation",
        stage: "Foundation",
        problemType: "cn_two_step_word_problem",
        cognitiveTags: ["operation_selection", "modeling_transfer"],
        hint1: "先求总数。",
        hint2: "送出以后要用减法。",
        commonMistake: "把每盒数量和盒数直接相加。",
        variantIdea: "改成又买来若干支，练习先乘后加。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库2年级.pdf",
        sourceSection: "二年级：加减乘除应用题"
      });
    }
  },
  {
    prefix: "g3-remainders",
    sourceFile: "尖子生高分题库3年级.pdf",
    sourceSection: "三年级：除法、余数与周期",
    build: (i) => {
      const divisor = 3 + (i % 5);
      const quotient = 7 + i;
      const remainder = i % divisor;
      const total = divisor * quotient + remainder;
      return cnDraft({
        statement: `${total} 个同样的图形，每 ${divisor} 个分成一组，可以分成几整组，还剩几个？`,
        answer: `${quotient},${remainder}`,
        wrongs: [`${quotient + 1},${remainder}`, `${quotient},${divisor - remainder}`, String(quotient), String(remainder)],
        solution: `${total} = ${divisor} x ${quotient} + ${remainder}，所以可以分成 ${quotient} 整组，还剩 ${remainder} 个。`,
        concepts: ["nt_remainders", "arith_natural_numbers"],
        skills: ["division_with_remainder", "quotient_remainder_model"],
        patterns: ["division_structure", "multiple_plus_remainder"],
        misconceptions: ["remainder_as_quotient_error", "endpoint_error"],
        course: "CN Primary Math",
        theme: "除法与余数",
        chapter: "cn-primary-g3-remainders",
        chapterTitle: "三年级：除法、余数与周期",
        sequenceBase: 13080,
        difficulty: 2,
        layer: "Foundation",
        stage: "Bridge",
        problemType: "cn_remainder_model",
        cognitiveTags: ["number_structure", "fluency_precision"],
        hint1: "把总数写成 除数 x 商 + 余数。",
        hint2: "余数一定小于每组的个数。",
        commonMistake: "把余数当成还能再分出一整组。",
        variantIdea: "改成按颜色循环排列，求某个位置的颜色。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库3年级.pdf",
        sourceSection: "三年级：除法、余数与周期"
      });
    }
  },
  {
    prefix: "g4-geometry-area",
    sourceFile: "尖子生高分题库4年级.pdf",
    sourceSection: "四年级：图形周长与面积",
    build: (i) => {
      const length = 8 + i;
      const width = 3 + (i % 7);
      const answer = length * width;
      return cnDraft({
        statement: `一个长方形长 ${length} 厘米，宽 ${width} 厘米，面积是多少平方厘米？`,
        answer,
        wrongs: [2 * (length + width), length + width, answer + length, answer - width],
        solution: `长方形面积 = 长 x 宽 = ${length} x ${width} = ${answer} 平方厘米。`,
        concepts: ["geo_area", "arith_natural_numbers"],
        skills: ["area_formula", "multiplication_fluency"],
        patterns: ["measurement_formula", "rectangle_model"],
        misconceptions: ["area_perimeter_confusion", "formula_selection_error"],
        course: "CN Primary Math",
        theme: "图形与测量",
        chapter: "cn-primary-g4-geometry-area",
        chapterTitle: "四年级：图形周长与面积",
        sequenceBase: 13120,
        difficulty: 2,
        layer: "Foundation",
        stage: "Bridge",
        problemType: "cn_rectangle_area",
        cognitiveTags: ["formula_selection", "geometric_reasoning"],
        hint1: "判断题目问的是面积还是周长。",
        hint2: "长方形面积用长乘宽。",
        commonMistake: "把面积公式和周长公式混用。",
        variantIdea: "给出面积和长，反求宽。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库4年级.pdf",
        sourceSection: "四年级：图形周长与面积"
      });
    }
  },
  {
    prefix: "g5-fractions",
    sourceFile: "尖子生高分题库5年级.pdf",
    sourceSection: "五年级：分数计算与分数应用",
    build: (i) => {
      const denominator = [6, 8, 10, 12, 15][i % 5];
      const a = 1 + (i % Math.floor(denominator / 2));
      const b = 1 + ((i + 2) % Math.floor(denominator / 2));
      const numerator = a + b;
      const answer = simplifyFraction(numerator, denominator);
      return cnDraft({
        statement: `计算：${a}/${denominator} + ${b}/${denominator} = ?`,
        answer,
        wrongs: [`${a + b}/${denominator + denominator}`, `${Math.abs(a - b)}/${denominator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator}`],
        solution: `同分母分数相加，分母不变，分子相加：${a}/${denominator} + ${b}/${denominator} = ${numerator}/${denominator} = ${answer}。`,
        concepts: ["arith_fractions"],
        skills: ["fraction_addition", "fraction_simplification"],
        patterns: ["part_whole_reasoning", "denominator_alignment"],
        misconceptions: ["add_denominators_error", "simplification_error"],
        course: "CN Primary Math",
        theme: "分数与运算",
        chapter: "cn-primary-g5-fractions",
        chapterTitle: "五年级：分数计算与分数应用",
        sequenceBase: 13160,
        difficulty: 3,
        layer: "Standard",
        stage: "Bridge",
        problemType: "cn_fraction_computation",
        cognitiveTags: ["part_whole_reasoning", "fluency_precision"],
        hint1: "两个分数的分母相同。",
        hint2: "分子相加后记得约分。",
        commonMistake: "把分母也相加。",
        variantIdea: "换成异分母分数，需要先通分。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库5年级.pdf",
        sourceSection: "五年级：分数计算与分数应用"
      });
    }
  },
  {
    prefix: "g6-ratio-percent",
    sourceFile: "尖子生高分题库6年级.pdf",
    sourceSection: "六年级：比、比例与百分数",
    build: (i) => {
      const base = 80 + i * 5;
      const percent = [10, 15, 20, 25, 30][i % 5];
      const answer = base * (100 - percent) / 100;
      return cnDraft({
        statement: `一件商品原价 ${base} 元，降价 ${percent}% 后售价是多少元？`,
        answer,
        wrongs: [base - percent, base * percent / 100, base + percent, answer + percent],
        solution: `降价 ${percent}% 后还需支付 ${100 - percent}%，售价为 ${base} x ${100 - percent}% = ${answer} 元。`,
        concepts: ["arith_percentages", "arith_ratios"],
        skills: ["percent_discount", "proportional_reasoning"],
        patterns: ["percent_of_quantity", "multiplicative_reasoning"],
        misconceptions: ["percent_base_error", "additive_percent_error"],
        course: "CN Primary Math",
        theme: "比与百分数",
        chapter: "cn-primary-g6-ratio-percent",
        chapterTitle: "六年级：比、比例与百分数",
        sequenceBase: 13200,
        difficulty: 3,
        layer: "Standard",
        stage: "Bridge",
        problemType: "cn_percent_word_problem",
        cognitiveTags: ["multiplicative_reasoning", "modeling_transfer"],
        hint1: "降价后支付的是原价的百分之多少？",
        hint2: "用原价乘以剩下的百分比。",
        commonMistake: "直接用原价减去百分数本身。",
        variantIdea: "把降价改成涨价，比较计算结构。",
        gradeBand: "小学",
        sourceFile: "尖子生高分题库6年级.pdf",
        sourceSection: "六年级：比、比例与百分数"
      });
    }
  },
  {
    prefix: "g7-linear-equations",
    sourceFile: "尖子生高分题库7年级.pdf",
    sourceSection: "七年级：有理数、整式与一元一次方程",
    build: (i) => {
      const x = 2 + i;
      const a = 2 + (i % 5);
      const b = 3 + (i % 8);
      const c = a * x + b;
      return cnDraft({
        statement: `解方程：${a}x + ${b} = ${c}。`,
        answer: x,
        wrongs: [c - b, Math.round(c / a), x + b, x - 1],
        solution: `两边先减 ${b}，得到 ${a}x = ${c - b}；再两边除以 ${a}，得到 x = ${x}。`,
        concepts: ["alg_linear_equations", "prealg_expressions"],
        skills: ["one_variable_equation", "inverse_operations"],
        patterns: ["linear_equation_structure", "equation_balance"],
        misconceptions: ["inverse_operation_order_error", "constant_term_error"],
        course: "CN Junior High Math",
        theme: "方程与代数",
        chapter: "cn-junior-g7-linear-equations",
        chapterTitle: "七年级：有理数、整式与一元一次方程",
        sequenceBase: 13240,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "cn_linear_equation_solving",
        cognitiveTags: ["inverse_operations", "symbolic_fluency"],
        hint1: "先消去常数项。",
        hint2: "再把 x 的系数化为 1。",
        commonMistake: "没有保持等式两边同加同减。",
        variantIdea: "加入括号，练习先去括号再解方程。",
        gradeBand: "初中",
        sourceFile: "尖子生高分题库7年级.pdf",
        sourceSection: "七年级：有理数、整式与一元一次方程"
      });
    }
  },
  {
    prefix: "g8-geometry-similarity",
    sourceFile: "尖子生高分题库8年级.pdf",
    sourceSection: "八年级：三角形、相似与勾股定理",
    build: (i) => {
      const a = [3, 5, 6, 8][i % 4];
      const b = [4, 12, 8, 15][i % 4];
      const c = Math.hypot(a, b);
      return cnDraft({
        statement: `直角三角形两条直角边分别为 ${a} 和 ${b}，斜边长是多少？`,
        answer: c,
        wrongs: [a + b, Math.abs(a - b), a * b, c + 1],
        solution: `由勾股定理，斜边平方为 ${a}^2 + ${b}^2 = ${a * a + b * b}，所以斜边长为 ${c}。`,
        concepts: ["geo_pythagorean", "geo_triangles"],
        skills: ["pythagorean_theorem", "square_root_reasoning"],
        patterns: ["right_triangle_model", "formula_selection"],
        misconceptions: ["additive_distance_error", "formula_selection_error"],
        course: "CN Junior High Math",
        theme: "几何与证明",
        chapter: "cn-junior-g8-geometry-similarity",
        chapterTitle: "八年级：三角形、相似与勾股定理",
        sequenceBase: 13280,
        difficulty: 4,
        layer: "Standard",
        stage: "AMC8 Transfer",
        problemType: "cn_pythagorean_geometry",
        cognitiveTags: ["geometric_reasoning", "formula_selection"],
        hint1: "这是直角三角形，可以考虑勾股定理。",
        hint2: "斜边平方等于两条直角边平方和。",
        commonMistake: "直接把两条直角边相加当斜边。",
        variantIdea: "给出斜边和一条直角边，反求另一条直角边。",
        gradeBand: "初中",
        sourceFile: "尖子生高分题库8年级.pdf",
        sourceSection: "八年级：三角形、相似与勾股定理"
      });
    }
  },
  {
    prefix: "g9-quadratics",
    sourceFile: "尖子生高分题库9年级.pdf",
    sourceSection: "九年级：二次函数与综合应用",
    build: (i) => {
      const r1 = 1 + (i % 7);
      const r2 = r1 + 2 + (i % 4);
      const sum = r1 + r2;
      const product = r1 * r2;
      return cnDraft({
        statement: `解方程：x^2 - ${sum}x + ${product} = 0。`,
        answer: `${r1},${r2}`,
        wrongs: [`-${r1},-${r2}`, `${sum},${product}`, `${r1 + 1},${r2 - 1}`, `${product},${sum}`],
        solution: `寻找两个数，和为 ${sum}、积为 ${product}，它们是 ${r1} 和 ${r2}，所以方程根为 x = ${r1} 或 x = ${r2}。`,
        concepts: ["alg_quadratics", "alg_factoring"],
        skills: ["quadratic_solving", "factor_pair_reasoning"],
        patterns: ["quadratic_factor_pattern", "root_finding"],
        misconceptions: ["sign_error", "factor_pair_error"],
        course: "CN Junior High Math",
        theme: "函数与方程",
        chapter: "cn-junior-g9-quadratics",
        chapterTitle: "九年级：二次函数与综合应用",
        sequenceBase: 13320,
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "cn_quadratic_solving",
        cognitiveTags: ["factor_structure", "operation_selection"],
        hint1: "先尝试因式分解。",
        hint2: "找和与积同时满足的两个数。",
        commonMistake: "只检查乘积，不检查一次项系数。",
        variantIdea: "把一次项符号改成正号，比较根的符号。",
        gradeBand: "初中",
        sourceFile: "尖子生高分题库9年级.pdf",
        sourceSection: "九年级：二次函数与综合应用"
      });
    }
  },
  {
    prefix: "g10-functions",
    sourceFile: "尖子生高分题库高一.pdf",
    sourceSection: "高一：集合、函数与基本初等函数",
    build: (i) => {
      const a = 2 + (i % 4);
      const b = 1 + (i % 7);
      const x = 1 + i;
      const answer = a * x + b;
      return cnDraft({
        statement: `已知函数 f(x) = ${a}x + ${b}，求 f(${x})。`,
        answer,
        wrongs: [a + x + b, a * (x + b), answer - b, answer + a],
        solution: `把 x = ${x} 代入，f(${x}) = ${a} x ${x} + ${b} = ${answer}。`,
        concepts: ["alg_functions", "prealg_substitution"],
        skills: ["function_evaluation", "substitution"],
        patterns: ["input_output_mapping", "linear_function_evaluation"],
        misconceptions: ["variable_meaning_error", "operation_order_error"],
        course: "CN Senior High Math",
        theme: "函数基础",
        chapter: "cn-senior-g10-functions",
        chapterTitle: "高一：集合、函数与基本初等函数",
        sequenceBase: 13360,
        difficulty: 3,
        layer: "Standard",
        stage: "Algebra Readiness",
        problemType: "cn_function_evaluation",
        cognitiveTags: ["input_output_mapping", "symbol_evaluation"],
        hint1: "把括号里的数看作输入值。",
        hint2: "代入后按运算顺序计算。",
        commonMistake: "把 f(x) 中的 x 看成字母名称而不是可替换的输入。",
        variantIdea: "给定 f(x) 的值，反求 x。",
        gradeBand: "高中",
        sourceFile: "尖子生高分题库高一.pdf",
        sourceSection: "高一：集合、函数与基本初等函数"
      });
    }
  },
  {
    prefix: "g11-sequences",
    sourceFile: "尖子生高分题库高二.pdf",
    sourceSection: "高二：数列、不等式与解析几何",
    build: (i) => {
      const first = 2 + (i % 5);
      const diff = 3 + (i % 6);
      const n = 5 + (i % 8);
      const answer = first + (n - 1) * diff;
      return cnDraft({
        statement: `等差数列首项为 ${first}，公差为 ${diff}，第 ${n} 项是多少？`,
        answer,
        wrongs: [first + n * diff, first * n + diff, answer - diff, answer + diff],
        solution: `等差数列第 n 项公式为 a_n = a_1 + (n - 1)d，所以 a_${n} = ${first} + (${n} - 1) x ${diff} = ${answer}。`,
        concepts: ["alg_functions", "arith_natural_numbers"],
        skills: ["sequence_formula", "substitution"],
        patterns: ["linear_growth", "formula_application"],
        misconceptions: ["off_by_one_error", "formula_selection_error"],
        course: "CN Senior High Math",
        theme: "数列与模型",
        chapter: "cn-senior-g11-sequences",
        chapterTitle: "高二：数列、不等式与解析几何",
        sequenceBase: 13400,
        difficulty: 4,
        layer: "Honors",
        stage: "Algebra Readiness",
        problemType: "cn_arithmetic_sequence",
        cognitiveTags: ["structure_recognition", "symbol_evaluation"],
        hint1: "等差数列每一项都比前一项多同一个公差。",
        hint2: "第 n 项要加 n - 1 个公差。",
        commonMistake: "把第 n 项误写成首项加 n 个公差。",
        variantIdea: "给出第 n 项反求公差。",
        gradeBand: "高中",
        sourceFile: "尖子生高分题库高二.pdf",
        sourceSection: "高二：数列、不等式与解析几何"
      });
    }
  },
  {
    prefix: "g12-probability",
    sourceFile: "尖子生高分题库高三.pdf",
    sourceSection: "高三：概率统计与综合复习",
    build: (i) => {
      const red = 2 + (i % 5);
      const blue = 3 + (i % 6);
      const total = red + blue;
      const answer = simplifyFraction(red, total);
      return cnDraft({
        statement: `袋中有 ${red} 个红球和 ${blue} 个蓝球，任取 1 个球，取到红球的概率是多少？`,
        answer,
        wrongs: [`${blue}/${total}`, `${red}/${blue}`, `${total}/${red}`, `${red + 1}/${total}`],
        solution: `一共有 ${total} 个球，其中红球 ${red} 个，所以取到红球的概率是 ${red}/${total} = ${answer}。`,
        concepts: ["counting_probability", "arith_fractions"],
        skills: ["simple_probability", "fraction_representation"],
        patterns: ["favorable_over_total", "part_whole_reasoning"],
        misconceptions: ["probability_denominator_error", "part_whole_confusion"],
        course: "CN Senior High Math",
        theme: "概率统计",
        chapter: "cn-senior-g12-probability",
        chapterTitle: "高三：概率统计与综合复习",
        sequenceBase: 13440,
        difficulty: 3,
        layer: "Standard",
        stage: "AMC8 Transfer",
        problemType: "cn_probability_basic",
        cognitiveTags: ["probability_modeling", "part_whole_reasoning"],
        hint1: "概率等于有利情况数除以总情况数。",
        hint2: "总球数是红球数加蓝球数。",
        commonMistake: "把蓝球数或红蓝比直接当成概率分母。",
        variantIdea: "改成不放回取两个球，比较概率结构。",
        gradeBand: "高中",
        sourceFile: "尖子生高分题库高三.pdf",
        sourceSection: "高三：概率统计与综合复习"
      });
    }
  }
];

function main() {
  const problems: ProblemRow[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  topics.forEach((topic, topicIndex) => {
    for (let variant = 0; variant < PROBLEMS_PER_TOPIC; variant += 1) {
      const draft = topic.build(variant);
      const id = `cn_jzs_${topic.prefix}_${String(variant + 1).padStart(3, "0")}`;
      const mapped = mapDraft(id, draft, topicIndex, variant);
      problems.push(mapped.problem);
      distractors.push(...mapped.distractors);
      explanations.push(mapped.explanation);
    }
  });

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(SOURCE_DIR, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  writeReadme(problems);
  writeSourceManifest();
  writeReviewReport(problems);
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log(`Generated ${problems.length} Jian Zi Sheng Chinese problem(s)`);
  console.log(`Distractors: ${distractors.length}`);
  console.log(`Explanations: ${explanations.length}`);
  console.log(`Dataset: ${path.relative(process.cwd(), SOURCE_DIR)}`);
}

function cnDraft(input: Omit<Draft, "answer" | "curriculumSystem" | "displayTrack" | "wrongs"> & {
  answer: string | number;
  wrongs: Array<string | number>;
}): Draft {
  return {
    ...input,
    answer: normalizeAnswer(String(input.answer)),
    curriculumSystem: "CN",
    displayTrack: "中文校内",
    wrongs: input.wrongs.map((wrong) => normalizeAnswer(String(wrong)))
  };
}

function mapDraft(id: string, draft: Draft, topicIndex: number, variant: number) {
  const choices = buildChoices(String(draft.answer), draft.wrongs.map(String), variant);
  const problem: ProblemRow = {
    id,
    statement: draft.statement,
    answer: String(draft.answer),
    answer_type: "multiple_choice",
    choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
    difficulty: String(draft.difficulty),
    concepts: draft.concepts.join(";"),
    skills: draft.skills.join(";"),
    patterns: draft.patterns.join(";"),
    misconceptions: draft.misconceptions.join(";"),
    solution: draft.solution,
    course: draft.course,
    theme: draft.theme,
    chapter: draft.chapter,
    chapter_title: draft.chapterTitle,
    sequence: String(draft.sequenceBase + topicIndex * 30 + variant),
    source_collection: SOURCE_COLLECTION,
    source_file: `local-pdf: ${draft.sourceFile}; ${draft.sourceSection}`,
    taxonomy_layer: draft.layer,
    taxonomy_stage: draft.stage,
    problem_type: draft.problemType,
    cognitive_tags: draft.cognitiveTags.join(";"),
    estimated_time_seconds: String(70 + Math.max(0, draft.difficulty - 2) * 20),
    notes: "Original-equivalent Chinese item generated from local scanned book coverage signals. OCR sample available under datasets/textbooks/jianzisheng-bank-1-12/ocr-samples. No full textbook exercise text is reproduced.",
    language: "zh",
    curriculum_system: draft.curriculumSystem,
    region: "CN",
    display_track: draft.displayTrack,
    grade_band: draft.gradeBand,
    content_status: "production"
  };
  const distractors = choices
    .filter((choice) => normalize(choice.value) !== normalize(problem.answer))
    .map((choice): DistractorRow => ({
      problem_id: id,
      choice_label: choice.label,
      value: choice.value,
      misconception: inferMisconception(choice.value, problem.answer, draft),
      cognitive_tag: draft.cognitiveTags[0] ?? "general_reasoning",
      explanation: `这个选项通常来自${formatMisconception(inferMisconception(choice.value, problem.answer, draft))}。`
    }));
  const explanation: ExplanationRow = {
    problem_id: id,
    hint_1: draft.hint1,
    hint_2: draft.hint2,
    step_by_step: buildStepByStep(draft, problem.answer),
    common_mistake: draft.commonMistake,
    why_correct: buildWhyCorrect(draft, problem.answer),
    variant_idea: draft.variantIdea
  };

  return { problem, distractors, explanation };
}

function buildStepByStep(draft: Draft, answer: string) {
  return [
    `Step 1: 识别模型。${draft.hint1}`,
    `Step 2: 按结构计算。${draft.solution}`,
    `Step 3: 检查答案。结果与题目要求一致，因此 answer = ${answer}。`
  ].join(" ");
}

function buildWhyCorrect(draft: Draft, answer: string) {
  return [
    `Answer ${answer} is correct because this problem uses the ${draft.cognitiveTags[0] ?? "math model"} structure.`,
    `核心理由：${draft.solution}`,
    `这个 model 保持了题目中的数量关系，所以得到的答案是 ${answer}。`
  ].join(" ");
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
  if (Number.isFinite(numeric)) return normalizeAnswer(String(numeric + offset + 1));
  if (answer.includes(",")) return answer.split(",").reverse().join(",");
  if (answer.includes("/")) {
    const [a, b] = answer.split("/").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return `${a + offset + 1}/${b}`;
  }
  return `${answer}+${offset + 1}`;
}

function inferMisconception(value: string, answer: string, draft: Draft) {
  if (draft.problemType.includes("percent")) return "percent_base_error";
  if (draft.problemType.includes("probability")) return "probability_denominator_error";
  if (draft.problemType.includes("quadratic")) return "factor_structure_error";
  if (draft.problemType.includes("geometry") || draft.problemType.includes("area")) return "formula_selection_error";
  if (draft.problemType.includes("sequence") || draft.problemType.includes("pattern")) return "pattern_step_error";
  if (value.includes("/") || answer.includes("/")) return "fraction_structure_error";
  if (value.includes(",")) return "solution_set_or_remainder_error";
  return "operation_error";
}

function formatMisconception(value: string) {
  const labels: Record<string, string> = {
    factor_structure_error: "因式或根的结构判断错误",
    formula_selection_error: "公式选择或几何模型错误",
    fraction_structure_error: "分数结构理解错误",
    operation_error: "运算步骤错误",
    pattern_step_error: "规律步长判断错误",
    percent_base_error: "百分数基准量理解错误",
    probability_denominator_error: "概率分母或总情况数判断错误",
    solution_set_or_remainder_error: "答案格式、余数或解集理解错误"
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

function simplifyFraction(numerator: number, denominator: number) {
  const factor = gcd(Math.abs(numerator), Math.abs(denominator));
  const a = numerator / factor;
  const b = denominator / factor;
  return b === 1 ? String(a) : `${a}/${b}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function normalizeAnswer(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(6)));
  }
  return value;
}

function writeReadme(problems: ProblemRow[]) {
  const chapters = countBy(problems, (problem) => problem.chapter_title);
  fs.writeFileSync(
    path.join(SOURCE_DIR, "README.md"),
    [
      "# Jian Zi Sheng Chinese Math Bank 1-12",
      "",
      "This dataset connects the local scanned `尖子生高分题库` 1-12 PDF collection to the Chinese curriculum track.",
      "",
      `Local source directory: \`${LOCAL_SOURCE_DIR}\``,
      `Source collection: \`${SOURCE_COLLECTION}\``,
      `Generated problems: ${problems.length}`,
      "",
      "Import policy:",
      "",
      "- The PDFs are scanned and do not contain an extractable text layer.",
      "- OCR samples are stored in `ocr-samples/` for pipeline validation.",
      "- The promoted problems are original-equivalent items generated from grade/topic coverage signals; full textbook exercise text is not reproduced.",
      "- Every promoted item is auto-gradable multiple choice with distractor rows and an explanation template.",
      "",
      "Chapter coverage:",
      ...Object.entries(chapters).map(([chapter, count]) => `- ${chapter}: ${count} problems`),
      "",
      "Refresh flow:",
      "",
      "```bash",
      "npm run generate:jianzisheng-cn-bank",
      "npm run validate:staging",
      "npm run promote:jianzisheng-cn-bank",
      "npm run sync:explanations",
      "```",
      ""
    ].join("\n")
  );
}

function writeSourceManifest() {
  const files = topics.map((topic) => ({
    file: topic.sourceFile,
    localPath: path.join(LOCAL_SOURCE_DIR, topic.sourceFile),
    sourceSection: topic.sourceSection
  }));
  fs.writeFileSync(path.join(SOURCE_DIR, "source_manifest.json"), `${JSON.stringify(files, null, 2)}\n`);
}

function writeReviewReport(problems: ProblemRow[]) {
  const byCourse = countBy(problems, (problem) => problem.course);
  const byLayer = countBy(problems, (problem) => problem.taxonomy_layer);
  const byStage = countBy(problems, (problem) => problem.taxonomy_stage);
  fs.mkdirSync(path.join(SOURCE_DIR, "review"), { recursive: true });
  fs.writeFileSync(
    path.join(SOURCE_DIR, "review", "import-report.md"),
    [
      "# Jian Zi Sheng Chinese Bank Import Report",
      "",
      `Generated at: ${new Date().toISOString()}`,
      `Problems: ${problems.length}`,
      "",
      "Course distribution:",
      ...Object.entries(byCourse).map(([key, count]) => `- ${key}: ${count}`),
      "",
      "Layer distribution:",
      ...Object.entries(byLayer).map(([key, count]) => `- ${key}: ${count}`),
      "",
      "Stage distribution:",
      ...Object.entries(byStage).map(([key, count]) => `- ${key}: ${count}`),
      "",
      "OCR status:",
      "",
      "- `ocr-samples/grade1-pages1-6.txt` verifies that OCRmyPDF + Tesseract `chi_sim+eng` can read the scanned source.",
      "- Full 12-book OCR should be run by grade in later batches because the source set is roughly 2850 scanned pages.",
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

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

main();
