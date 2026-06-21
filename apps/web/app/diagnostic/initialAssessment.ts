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
    id: "cn-g7-integer-operation-foundation",
    stage: "Foundation",
    domain: "CN Junior High",
    strand: "Rational number operations",
    goal: "Check Grade 7 signed-number operation fluency before algebraic work.",
    reason: "七年级有理数加减是整式、方程和不等式的前置地基，符号错误会直接污染后续代数判断。",
    concepts: ["arith_integers"],
    difficultyRange: [2, 2],
    fallbackProblemId: "cn_jzs_jr_g7_b2_001",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade7_batch2_v0",
    chapterFocus: "cn-junior-g7-integer-operations",
    taxonomyStageFocus: "Foundation"
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
    id: "cn-g7-distributive-expression-bridge",
    stage: "Bridge",
    domain: "CN Junior High",
    strand: "Expression simplification",
    goal: "Check Grade 7 distribution and simplification before equation solving.",
    reason: "去括号和合并同类项是中文初中整式体系的关键节点，也是方程应用题出错的常见根源。",
    concepts: ["prealg_expressions", "prealg_simplification"],
    difficultyRange: [3, 3],
    fallbackProblemId: "cn_jzs_jr_g7_b2_007",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade7_batch2_v0",
    chapterFocus: "cn-junior-g7-distributive-property",
    taxonomyStageFocus: "Bridge"
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
    id: "cn-g7-triangle-angle-bridge",
    stage: "Bridge",
    domain: "CN Junior High",
    strand: "Basic geometry angles",
    goal: "Check Grade 7 angle-sum reasoning in a compact geometry item.",
    reason: "基础角度关系能检测学生是否能把几何事实转成稳定的一步推理，而不是只做代数题。",
    concepts: ["geo_triangle_angles", "geo_triangles"],
    difficultyRange: [3, 3],
    fallbackProblemId: "cn_jzs_jr_g7_b3_031",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade7_batch3_v0",
    chapterFocus: "cn-junior-g7-triangle-angles",
    taxonomyStageFocus: "Bridge"
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
    id: "cn-g7-parentheses-equation-readiness",
    stage: "Algebra Readiness",
    domain: "CN Junior High",
    strand: "Linear equations with parentheses",
    goal: "Check Grade 7 readiness for equations that require distribution before inverse operations.",
    reason: "含括号方程能同时检测去括号、移项和逆运算，是七年级进入八年级函数前的核心代数锚点。",
    concepts: ["alg_linear_equations", "prealg_simplification"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_jzs_jr_g7_b3_013",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade7_batch3_v0",
    chapterFocus: "cn-junior-g7-equations-parentheses",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g7-inequality-modeling-readiness",
    stage: "Algebra Readiness",
    domain: "CN Junior High",
    strand: "Inequality modeling",
    goal: "Check whether Grade 7 inequality work transfers into a simple budget model.",
    reason: "不等式应用题能检测“不超过/至少”等语言关系是否能被正确建模，是后续函数和应用题的重要前置能力。",
    concepts: ["alg_linear_inequalities", "prealg_word_to_equation"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_jzs_jr_g7_b4_019",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade7_batch4_v0",
    chapterFocus: "cn-junior-g7-inequality-applications",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g8-linear-function-readiness",
    stage: "Algebra Readiness",
    domain: "CN Junior High",
    strand: "Linear functions",
    goal: "Check Grade 8 readiness for evaluating and interpreting a linear function rule.",
    reason: "一次函数是中文初中体系通往代数建模与图像理解的核心桥梁。",
    concepts: ["alg_functions", "alg_graphing", "prealg_substitution"],
    difficultyRange: [3, 4],
    fallbackProblemId: "cn_jzs_jr_g8_b2_025",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade8_batch2_v0",
    chapterFocus: "cn-junior-g8-linear-functions",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g8-coordinate-pythagorean-readiness",
    stage: "Algebra Readiness",
    domain: "CN Junior High",
    strand: "Coordinate geometry",
    goal: "Check whether Grade 8 coordinate work can combine graph reading with Pythagorean distance.",
    reason: "坐标距离把一次函数图像、勾股定理和几何建模连接起来，能暴露只会套公式但不会迁移的问题。",
    concepts: ["geo_coordinate_geometry", "geo_pythagorean", "alg_graphing"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_jzs_jr_g8_b2_013",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade8_batch2_v0",
    chapterFocus: "cn-junior-g8-coordinate-distance",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g9-quadratic-function-readiness",
    stage: "Algebra Readiness",
    domain: "CN Junior High",
    strand: "Quadratic functions",
    goal: "Check Grade 9 readiness for extracting structure from a quadratic function.",
    reason: "二次函数是从一次函数过渡到 Algebra 1/2 的关键节点，能同时检测符号处理、公式选择和函数图像意识。",
    concepts: ["alg_quadratics", "alg_functions"],
    difficultyRange: [4, 5],
    fallbackProblemId: "cn_jzs_jr_g9_pilot_001",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade9_pilot_v0",
    chapterFocus: "cn-junior-g9-quadratic-axis",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g10-function-readiness",
    stage: "Algebra Readiness",
    domain: "CN Senior High",
    strand: "Function notation",
    goal: "Check whether Grade 10 function notation and substitution are stable enough for senior-high practice.",
    reason: "高一函数是中文高中数学的第一主线；如果函数值和自变量含义不稳，后续二次函数、数列和导数都会被误判。",
    concepts: ["alg_functions", "prealg_substitution"],
    difficultyRange: [3, 3],
    fallbackProblemId: "cn_jzs_g10-functions_001",
    courseFocus: "CN Senior High Math",
    preferredSourceCollection: "jianzisheng_cn_math_bank_1_12",
    chapterFocus: "cn-senior-g10-functions",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g10-quadratic-readiness",
    stage: "Algebra Readiness",
    domain: "CN Senior High",
    strand: "Quadratic structure",
    goal: "Check whether a Grade 10 learner can connect quadratic equations or vertex form to structure.",
    reason: "二次函数和二次方程是高一代数的核心节点，也是初中二次函数向高中函数思想迁移的关键。",
    concepts: ["alg_quadratics", "alg_functions"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_pilot_007",
    courseFocus: "CN Senior High Math",
    preferredSourceCollection: "cn_curriculum_pilot_v0",
    chapterFocus: "cn-senior-02-quadratic-functions",
    taxonomyStageFocus: "Algebra Readiness"
  },
  {
    id: "cn-g11-sequence-readiness",
    stage: "Algebra Readiness",
    domain: "CN Senior High",
    strand: "Sequences as functions",
    goal: "Check whether Grade 11 sequence formulas are interpreted as structured function rules.",
    reason: "数列把函数思想从连续变量转到离散下标，能检测学生是否真正理解通项、递推和项数。",
    concepts: ["alg_functions", "arith_natural_numbers"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_jzs_g11-sequences_001",
    courseFocus: "CN Senior High Math",
    preferredSourceCollection: "jianzisheng_cn_math_bank_1_12",
    chapterFocus: "cn-senior-g11-sequences",
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
    id: "cn-g8-similarity-transfer",
    stage: "AMC8 Transfer",
    domain: "CN Junior High",
    strand: "Similarity and proportions",
    goal: "Check whether Grade 8 similarity can transfer from proportional reasoning into geometry.",
    reason: "相似三角形是中文初中几何和 AMC8 几何迁移之间最稳定的连接点。",
    concepts: ["geo_similarity", "arith_proportions", "geo_triangles"],
    difficultyRange: [4, 5],
    fallbackProblemId: "cn_jzs_jr_g8_b3_001",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade8_batch3_v0",
    chapterFocus: "cn-junior-g8-similarity",
    taxonomyStageFocus: "AMC8 Transfer"
  },
  {
    id: "cn-g9-circle-arc-transfer",
    stage: "AMC8 Transfer",
    domain: "CN Junior High",
    strand: "Circle measurement",
    goal: "Check whether Grade 9 circle knowledge can be used in an arc-length context.",
    reason: "圆与弧长题能检测公式选择、比例意识和几何量之间的转换，是九年级向竞赛迁移的重要信号。",
    concepts: ["geo_arc_length", "geo_circles"],
    difficultyRange: [4, 5],
    fallbackProblemId: "cn_jzs_jr_g9_b3_013",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade9_batch3_v0",
    chapterFocus: "cn-junior-g9-arc-length",
    taxonomyStageFocus: "AMC8 Transfer"
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
    id: "cn-g9-probability-transfer",
    stage: "AMC8 Transfer",
    domain: "CN Junior High",
    strand: "Probability modeling",
    goal: "Check whether Grade 9 probability can model the complement event before computing.",
    reason: "概率题可以区分机械计算和先建模再计算的能力，也是中文初中与 AMC8 数据概率板块的自然交叉点。",
    concepts: ["counting_probability", "arith_fractions"],
    difficultyRange: [4, 4],
    fallbackProblemId: "cn_jzs_jr_g9_b2_025",
    courseFocus: "CN Junior High Math",
    preferredSourceCollection: "jianzisheng_cn_junior_grade9_batch2_v0",
    chapterFocus: "cn-junior-g9-probability-complement",
    taxonomyStageFocus: "AMC8 Transfer"
  },
  {
    id: "cn-g12-probability-transfer",
    stage: "AMC8 Transfer",
    domain: "CN Senior High",
    strand: "Probability and statistics",
    goal: "Check whether senior-high probability can be modeled before computing.",
    reason: "高三概率统计与 AMC8 Transfer 的计数概率共享建模核心，适合作为高中学生综合迁移的轻量探针。",
    concepts: ["counting_probability", "arith_fractions"],
    difficultyRange: [3, 4],
    fallbackProblemId: "cn_jzs_g12-probability_001",
    courseFocus: "CN Senior High Math",
    preferredSourceCollection: "jianzisheng_cn_math_bank_1_12",
    chapterFocus: "cn-senior-g12-probability",
    taxonomyStageFocus: "AMC8 Transfer"
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
