import fs from "fs";
import path from "path";

type Layer = "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";

type CleanedBlock = {
  id: string;
  grade: string;
  sourceFile: string;
  pageStart: number;
  pageEnd: number;
  lessonNo: number | null;
  lessonTitle: string;
  cleanedColumn: string;
  confidence: "high" | "medium" | "low";
  reviewPriority: "normal" | "medium" | "high";
  questionCandidates: Array<{ localNo: string; prompt: string }>;
};

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
  curriculum_system: "CN";
  region: "CN";
  display_track: "中文校内";
  grade_band: "初中";
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

type Draft = {
  answer: string | number;
  chapter: string;
  chapterTitle: string;
  cognitiveTags: string[];
  concepts: string[];
  difficulty: number;
  hint1: string;
  hint2: string;
  layer: Layer;
  misconceptions: string[];
  patterns: string[];
  problemType: string;
  skills: string[];
  solution: string;
  stage: Stage;
  statement: string;
  theme: string;
  commonMistake: string;
  variantIdea: string;
  wrongs: Array<string | number>;
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const CLEANED_DIR = path.join(DATASET_DIR, "review", "cleaned");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const BATCH_ID = getArgValue("--batch-id") ?? "pilot";
const CONFIG = getBatchConfig(BATCH_ID);
const OUTPUT_DIR = path.join(DATASET_DIR, "junior", CONFIG.outputSubdir);

function main() {
  const blocks = selectSourceBlocks();
  const drafts = CONFIG.buildDrafts();
  const problems: ProblemRow[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  drafts.forEach((draft, index) => {
    const block = blocks[index % blocks.length];
    const id = `${CONFIG.idPrefix}_${String(index + 1).padStart(3, "0")}`;
    const mapped = mapDraft(id, draft, block, index);
    problems.push(mapped.problem);
    distractors.push(...mapped.distractors);
    explanations.push(mapped.explanation);
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "pilot-source-blocks.json"), `${JSON.stringify(blocks, null, 2)}\n`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "pilot-report.md"), renderReport(problems, blocks));
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log(`Jian Zi Sheng junior ${CONFIG.grade} ${CONFIG.label} staging`);
  console.log(`- Source collection: ${CONFIG.sourceCollection}`);
  console.log(`- Problems: ${problems.length}`);
  console.log(`- Distractors: ${distractors.length}`);
  console.log(`- Explanations: ${explanations.length}`);
  console.log(`- Pilot report: ${path.relative(process.cwd(), path.join(OUTPUT_DIR, "pilot-report.md"))}`);
}

function selectSourceBlocks() {
  const filePath = path.join(CLEANED_DIR, `${CONFIG.grade}-cleaned-blocks.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Missing cleaned ${CONFIG.grade} blocks: ${filePath}`);

  const blocks = JSON.parse(fs.readFileSync(filePath, "utf8")) as CleanedBlock[];
  const usable = blocks
    .filter((block) => ["topic_overview", "worked_example", "thinking_training", "competition_boost"].includes(block.cleanedColumn))
    .filter((block) => block.reviewPriority !== "high")
    .filter((block) => block.confidence !== "low")
    .filter((block) => block.questionCandidates.length > 0)
    .sort((a, b) => sourceScore(b) - sourceScore(a) || a.pageStart - b.pageStart);

  if (usable.length < 12) throw new Error(`Not enough usable ${CONFIG.grade} source blocks: ${usable.length}`);
  return usable.slice(CONFIG.sourceOffset, CONFIG.sourceOffset + CONFIG.sourceBlockLimit);
}

function sourceScore(block: CleanedBlock) {
  let score = block.questionCandidates.length;
  if (block.cleanedColumn === "thinking_training") score += 8;
  if (block.cleanedColumn === "worked_example") score += 6;
  if (block.cleanedColumn === "topic_overview") score += 5;
  if (block.confidence === "high") score += 4;
  if (block.reviewPriority === "normal") score += 3;
  return score;
}

function buildDrafts(): Draft[] {
  return [
    ...range(4).map(triangleInequalityDraft),
    ...range(4).map(triangleAngleDraft),
    ...range(4).map(congruenceCriterionDraft),
    ...range(4).map(pythagoreanDraft),
    ...range(4).map(coordinateTranslationDraft),
    ...range(4).map(linearFunctionDraft)
  ];
}

function buildBatch2Drafts(): Draft[] {
  return [
    ...range(6).map(triangleAreaDraft),
    ...range(6).map(congruenceCorrespondingSideDraft),
    ...range(6).map(pythagoreanCoordinateDistanceDraft),
    ...range(6).map(linearSlopeDraft),
    ...range(6).map(linearInterceptDraft),
    ...range(6).map(linearModelingDraft)
  ];
}

function buildBatch3Drafts(): Draft[] {
  return [
    ...range(6).map(similarityScaleDraft),
    ...range(6).map(parallelAngleDraft),
    ...range(6).map(linearSolveForInputDraft),
    ...range(6).map(linearInterceptFromPointDraft),
    ...range(6).map(linearIntersectionDraft),
    ...range(6).map(coordinateMidpointDraft)
  ];
}

function buildBatch4Drafts(): Draft[] {
  return [
    ...range(6).map(similarityMissingSideDraft),
    ...range(6).map(twoStepAngleDraft),
    ...range(6).map(pointOnLineDraft),
    ...range(6).map(linearModelingInverseDraft),
    ...range(6).map(coordinateTriangleAreaDraft),
    ...range(6).map(pythagoreanConverseDraft)
  ];
}

function buildGrade9PilotDrafts(): Draft[] {
  return [
    ...range(6).map(quadraticVertexDraft),
    ...range(6).map(quadraticRootsDraft),
    ...range(6).map(circleArcAngleDraft),
    ...range(6).map(circleAreaDraft),
    ...range(6).map(probabilitySimpleDraft),
    ...range(6).map(statisticsMeanMedianDraft)
  ];
}

function buildGrade9Batch2Drafts(): Draft[] {
  return [
    ...range(6).map(quadraticMinimumDraft),
    ...range(6).map(quadraticTranslationDraft),
    ...range(6).map(similarityAreaRatioDraft),
    ...range(6).map(circleTangentRadiusDraft),
    ...range(6).map(probabilityComplementDraft),
    ...range(6).map(statisticsRangeMedianDraft)
  ];
}

function buildGrade9Batch3Drafts(): Draft[] {
  return [
    ...range(6).map(quadraticDiscriminantDraft),
    ...range(6).map(quadraticApplicationDraft),
    ...range(6).map(circleArcLengthDraft),
    ...range(6).map(circleChordDistanceDraft),
    ...range(6).map(similarityApplicationDraft),
    ...range(6).map(probabilityTwoStepDraft)
  ];
}

function buildGrade9Batch4Drafts(): Draft[] {
  return [
    ...range(6).map(quadraticXInterceptCountDraft),
    ...range(6).map(quadraticRectangleModelDraft),
    ...range(6).map(circleSectorAreaDraft),
    ...range(6).map(circleSimilarityDraft),
    ...range(6).map(probabilityExpectedCountDraft),
    ...range(6).map(statisticsMissingValueDraft)
  ];
}

function buildGrade7Batch1Drafts(): Draft[] {
  return [
    ...range(6).map(rationalNumberOrderDraft),
    ...range(6).map(absoluteValueDistanceDraft),
    ...range(6).map(polynomialLikeTermsDraft),
    ...range(6).map(linearEquationG7Draft),
    ...range(6).map(linearInequalityG7Draft),
    ...range(6).map(basicGeometryAngleDraft)
  ];
}

function buildGrade7Batch2Drafts(): Draft[] {
  return [
    ...range(6).map(integerOperationDraft),
    ...range(6).map(distributiveSimplificationG7Draft),
    ...range(6).map(linearEquationWordG7Draft),
    ...range(6).map(negativeCoefficientInequalityDraft),
    ...range(6).map(perimeterExpressionDraft),
    ...range(6).map(verticalAngleDraft)
  ];
}

function buildGrade7Batch3Drafts(): Draft[] {
  return [
    ...range(6).map(fractionIntegerOperationDraft),
    ...range(6).map(polynomialEvaluationDraft),
    ...range(6).map(parenthesesEquationG7Draft),
    ...range(6).map(inequalityNumberLineDraft),
    ...range(6).map(rectangleAreaExpressionDraft),
    ...range(6).map(triangleAngleG7Draft)
  ];
}

function buildGrade7Batch4Drafts(): Draft[] {
  return [
    ...range(6).map(rationalDistanceDraft),
    ...range(6).map(twoStepExpressionSimplificationDraft),
    ...range(6).map(proportionEquationG7Draft),
    ...range(6).map(inequalityWordG7Draft),
    ...range(6).map(coordinatePointG7Draft),
    ...range(6).map(angleEquationG7Draft)
  ];
}

function rationalNumberOrderDraft(i: number): Draft {
  const data = [
    [[-5, -2, 0, 3], "-5<-2<0<3"],
    [[-7, -1, 2, 6], "-7<-1<2<6"],
    [[-4, -3, 1, 5], "-4<-3<1<5"],
    [[-9, -6, -1, 4], "-9<-6<-1<4"],
    [[-8, -2, 2, 7], "-8<-2<2<7"],
    [[-6, -5, 0, 8], "-6<-5<0<8"]
  ] as const;
  const [values, answer] = data[i % data.length];
  return baseDraft({
    statement: `把 ${values.join("，")} 按从小到大的顺序排列，正确的是哪一项？`,
    answer,
    wrongs: [
      [...values].reverse().join("<"),
      [...values].sort((a, b) => Math.abs(a) - Math.abs(b)).join("<"),
      `${values[1]}<${values[0]}<${values[2]}<${values[3]}`,
      `${values[0]}<${values[2]}<${values[1]}<${values[3]}`
    ],
    solution: `在数轴上，越靠左的数越小。负数小于 0，且绝对值越大的负数越小，所以顺序为 ${answer}。`,
    concepts: ["arith_integers"],
    skills: ["rational_number_ordering", "number_line_reasoning"],
    patterns: ["number_line_order", "negative_number_comparison"],
    misconceptions: ["absolute_value_order_error", "negative_number_order_error"],
    theme: "有理数",
    chapter: "cn-junior-g7-rational-numbers",
    chapterTitle: "七年级：有理数与数轴",
    difficulty: 2,
    layer: "Foundation",
    stage: "Foundation",
    problemType: "cn_rational_number_order",
    cognitiveTags: ["number_sense", "constraint_reasoning"],
    hint1: "先把所有数想象到数轴上。",
    hint2: "负数比较大小时，离 0 越远反而越小。",
    commonMistake: "只比较数字部分的大小，忘记负号会改变大小关系。",
    variantIdea: "加入小数或分数，再按从小到大排序。"
  });
}

function absoluteValueDistanceDraft(i: number): Draft {
  const data = [
    [-6, 6],
    [8, 8],
    [-11, 11],
    [0, 0],
    [-9, 9],
    [13, 13]
  ];
  const [value, answer] = data[i % data.length];
  return baseDraft({
    statement: `数 ${value} 在数轴上到原点的距离是多少？`,
    answer,
    wrongs: [-Number(answer), Number(answer) + 1, Math.max(0, Number(answer) - 1), Number(value) + 2],
    solution: `一个数到原点的距离就是它的绝对值。|${value}|=${answer}，所以距离为 ${answer}。`,
    concepts: ["arith_absolute_value", "arith_integers"],
    skills: ["absolute_value", "number_line_distance"],
    patterns: ["distance_from_zero", "absolute_value_definition"],
    misconceptions: ["absolute_value_sign_error", "distance_negative_error"],
    theme: "有理数",
    chapter: "cn-junior-g7-absolute-value",
    chapterTitle: "七年级：相反数与绝对值",
    difficulty: 2,
    layer: "Foundation",
    stage: "Foundation",
    problemType: "cn_absolute_value_distance",
    cognitiveTags: ["number_sense", "definition_recall"],
    hint1: "绝对值可以理解为到原点的距离。",
    hint2: "距离不能是负数。",
    commonMistake: "把负数的绝对值仍写成负数。",
    variantIdea: "改成求两个数在数轴上的距离。"
  });
}

function polynomialLikeTermsDraft(i: number): Draft {
  const data = [
    [3, 5, 2, "8x+2"],
    [6, -2, 4, "4x+4"],
    [-3, 7, -1, "4x-1"],
    [8, -5, 6, "3x+6"],
    [-4, -2, 9, "-6x+9"],
    [10, -3, -5, "7x-5"]
  ] as const;
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `合并同类项：${a}x${Number(b) >= 0 ? "+" : ""}${b}x${Number(c) >= 0 ? "+" : ""}${c}，结果是多少？`,
    answer,
    wrongs: [
      `${Number(a) + Number(b) + Number(c)}x`,
      `${Number(a) - Number(b)}x${Number(c) >= 0 ? "+" : ""}${c}`,
      `${Number(a) + Number(b)}x`,
      `${a}x${Number(b) >= 0 ? "+" : ""}${b}x`
    ],
    solution: `只有含 x 的项可以合并，常数项保持不变。${a}x${Number(b) >= 0 ? "+" : ""}${b}x=(${a}${Number(b) >= 0 ? "+" : ""}${b})x=${Number(a) + Number(b)}x，所以结果是 ${answer}。`,
    concepts: ["prealg_expressions", "prealg_simplification"],
    skills: ["combine_like_terms", "signed_coefficient_fluency"],
    patterns: ["like_terms", "expression_simplification"],
    misconceptions: ["constant_like_term_error", "signed_coefficient_error"],
    theme: "整式",
    chapter: "cn-junior-g7-polynomials",
    chapterTitle: "七年级：整式与同类项",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_like_terms_simplification",
    cognitiveTags: ["symbolic_fluency", "signed_number_fluency"],
    hint1: "先找含有相同字母、相同次数的项。",
    hint2: "只合并 x 项的系数，常数项不要并进去。",
    commonMistake: "把常数项也合并到 x 的系数里。",
    variantIdea: "加入二次项，区分 x 和 x^2。"
  });
}

function linearEquationG7Draft(i: number): Draft {
  const data = [
    [3, 5, 20, 5],
    [4, -7, 17, 6],
    [5, 2, 32, 6],
    [-2, 9, -3, 6],
    [6, -4, 38, 7],
    [7, 1, 50, 7]
  ];
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `解方程：${a}x${Number(b) >= 0 ? "+" : ""}${b}=${c}，x 的值是多少？`,
    answer,
    wrongs: [Number(c) - Number(b), Math.round(Number(c) / Number(a)), Number(answer) + 1, -Number(answer)],
    solution: `先移项：${a}x=${Number(c) - Number(b)}，再两边同时除以 ${a}，得到 x=${answer}。`,
    concepts: ["alg_linear_equations", "arith_integers"],
    skills: ["one_variable_linear_equation", "inverse_operations"],
    patterns: ["ax_plus_b_equals_c", "equation_solving"],
    misconceptions: ["inverse_operations_error", "sign_error"],
    theme: "一元一次方程",
    chapter: "cn-junior-g7-linear-equations",
    chapterTitle: "七年级：一元一次方程",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_g7_linear_equation_solving",
    cognitiveTags: ["inverse_operations", "symbolic_fluency"],
    hint1: "先把常数项移到等号另一边。",
    hint2: "再把 x 的系数除掉。",
    commonMistake: "移项时忘记变号，或只做一步就停止。",
    variantIdea: "把方程两边都放上含 x 的项。"
  });
}

function linearInequalityG7Draft(i: number): Draft {
  const data = [
    [2, 3, 11, "x>4"],
    [3, -5, 7, "x>4"],
    [4, 1, 17, "x>4"],
    [5, -2, 18, "x>4"],
    [2, -7, 1, "x>4"],
    [6, 4, 28, "x>4"]
  ] as const;
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `解不等式：${a}x${Number(b) >= 0 ? "+" : ""}${b}>${c}，正确结果是哪一项？`,
    answer,
    wrongs: ["x<4", "x>3", "x<3", "x=4"],
    solution: `先移项：${a}x>${Number(c) - Number(b)}，再两边同时除以正数 ${a}，不等号方向不变，所以 ${answer}。`,
    concepts: ["alg_linear_inequalities", "alg_linear_equations", "arith_integers"],
    skills: ["linear_inequality_solving", "inverse_operations"],
    patterns: ["one_step_inequality", "positive_coefficient_inequality"],
    misconceptions: ["inequality_direction_error", "inverse_operations_error"],
    theme: "不等式",
    chapter: "cn-junior-g7-linear-inequalities",
    chapterTitle: "七年级：一元一次不等式",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_g7_linear_inequality_solving",
    cognitiveTags: ["inverse_operations", "relation_reasoning"],
    hint1: "解不等式可以先像解方程一样移项。",
    hint2: "这里除以的是正数，所以不等号方向不变。",
    commonMistake: "把不等式直接写成等式，或无理由改变不等号方向。",
    variantIdea: "把 x 的系数改成负数，练习不等号变向。"
  });
}

function basicGeometryAngleDraft(i: number): Draft {
  const data = [
    [42, 138],
    [58, 122],
    [75, 105],
    [96, 84],
    [110, 70],
    [35, 145]
  ];
  const [angle, answer] = data[i % data.length];
  return baseDraft({
    statement: `两条直线相交形成一组邻补角，其中一个角为 ${angle}°，与它相邻的补角是多少度？`,
    answer,
    wrongs: [angle, 90 - Number(angle), Number(answer) + 10, Math.max(1, Number(answer) - 10)],
    solution: `邻补角的和为 180°，所以补角为 180°-${angle}°=${answer}°。`,
    concepts: ["geo_angles"],
    skills: ["supplementary_angles", "angle_subtraction"],
    patterns: ["linear_pair", "basic_angle_relationship"],
    misconceptions: ["vertical_vs_supplementary_error", "angle_sum_error"],
    theme: "基础几何",
    chapter: "cn-junior-g7-basic-geometry",
    chapterTitle: "七年级：基础几何与角",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_basic_geometry_supplementary_angle",
    cognitiveTags: ["geometric_reasoning", "relation_selection"],
    hint1: "邻补角在一条直线上。",
    hint2: "两个邻补角相加等于 180°。",
    commonMistake: "把邻补角误认为相等的对顶角。",
    variantIdea: "改成对顶角，比较相等关系和互补关系。"
  });
}

function integerOperationDraft(i: number): Draft {
  const data = [
    [-7, 12, 5],
    [9, -14, -5],
    [-6, -8, -14],
    [15, -4, 11],
    [-11, 3, -8],
    [5, -17, -12]
  ];
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `计算：${a}${Number(b) >= 0 ? "+" : ""}${b}，结果是多少？`,
    answer,
    wrongs: [Math.abs(Number(a)) + Math.abs(Number(b)), -Number(answer), Number(a) - Number(b), Number(answer) + 2],
    solution: `异号相加时，用绝对值较大的数减去较小的数，再取绝对值较大数的符号，所以结果是 ${answer}。`,
    concepts: ["arith_integers"],
    skills: ["signed_number_addition", "integer_fluency"],
    patterns: ["integer_sum", "signed_operation"],
    misconceptions: ["sign_error", "absolute_value_addition_error"],
    theme: "有理数",
    chapter: "cn-junior-g7-integer-operations",
    chapterTitle: "七年级：有理数加减运算",
    difficulty: 2,
    layer: "Foundation",
    stage: "Foundation",
    problemType: "cn_integer_operation",
    cognitiveTags: ["signed_number_fluency", "operation_selection"],
    hint1: "先看两个数的符号是否相同。",
    hint2: "异号相加时，结果符号跟绝对值较大的数一致。",
    commonMistake: "看到加号就把两个绝对值直接相加。",
    variantIdea: "改成三个有理数连加，练习先分组。"
  });
}

function distributiveSimplificationG7Draft(i: number): Draft {
  const data = [
    [3, 2, 5, "6x+15"],
    [4, 1, -3, "4x-12"],
    [-2, 5, 4, "-10x-8"],
    [5, -2, 6, "-10x+30"],
    [-3, -4, 2, "12x-6"],
    [6, 3, -1, "18x-6"]
  ] as const;
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `化简：${a}(${b}x${Number(c) >= 0 ? "+" : ""}${c})，结果是多少？`,
    answer,
    wrongs: [`${Number(a) * Number(b)}x${Number(c) >= 0 ? "+" : ""}${c}`, `${Number(a) + Number(b)}x${Number(a) * Number(c) >= 0 ? "+" : ""}${Number(a) * Number(c)}`, `${Number(a) * Number(b)}x`, `${Number(a) * Number(c)}x${Number(b) >= 0 ? "+" : ""}${b}`],
    solution: `用 ${a} 分别乘括号里的每一项：${a}×${b}x=${Number(a) * Number(b)}x，${a}×${c}=${Number(a) * Number(c)}，所以结果是 ${answer}。`,
    concepts: ["prealg_expressions", "prealg_simplification"],
    skills: ["distributive_property", "signed_coefficient_fluency"],
    patterns: ["distribution", "expression_simplification"],
    misconceptions: ["partial_distribution_error", "signed_coefficient_error"],
    theme: "整式",
    chapter: "cn-junior-g7-distributive-property",
    chapterTitle: "七年级：去括号与分配律",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_distributive_simplification",
    cognitiveTags: ["symbolic_fluency", "operation_selection"],
    hint1: "括号外的数要乘括号里的每一项。",
    hint2: "注意负数相乘的符号。",
    commonMistake: "只乘第一项，漏乘常数项。",
    variantIdea: "在去括号后再加入同类项合并。"
  });
}

function linearEquationWordG7Draft(i: number): Draft {
  const data = [
    [5, 3, 38, 7],
    [4, 6, 34, 7],
    [6, 2, 44, 7],
    [3, 8, 35, 9],
    [7, 1, 50, 7],
    [8, 5, 61, 7]
  ];
  const [rate, fixed, total, answer] = data[i % data.length];
  return baseDraft({
    statement: `某活动门票每张 ${rate} 元，另需一次性服务费 ${fixed} 元。共花 ${total} 元，买了多少张票？`,
    answer,
    wrongs: [Math.round(Number(total) / Number(rate)), Number(total) - Number(fixed), Number(answer) + 1, Number(answer) - 1],
    solution: `设买了 x 张票，列方程 ${rate}x+${fixed}=${total}。先减去服务费，再除以单价，得 x=${answer}。`,
    concepts: ["alg_linear_equations", "prealg_word_to_equation"],
    skills: ["word_problem_modeling", "linear_equation_solving"],
    patterns: ["fixed_fee_plus_rate", "equation_from_context"],
    misconceptions: ["missing_fixed_fee", "division_before_subtraction_error"],
    theme: "一元一次方程",
    chapter: "cn-junior-g7-linear-equation-applications",
    chapterTitle: "七年级：一元一次方程应用",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_linear_equation_word_problem",
    cognitiveTags: ["modeling", "inverse_operations"],
    hint1: "先设未知数表示票的张数。",
    hint2: "总费用由服务费和每张票的费用组成。",
    commonMistake: "直接用总费用除以单价，忘记先减服务费。",
    variantIdea: "给出两种票价，建立更复杂的方程。"
  });
}

function negativeCoefficientInequalityDraft(i: number): Draft {
  const data = [
    [-2, 3, -5, "x>4"],
    [-3, 6, -6, "x>4"],
    [-4, 1, -15, "x>4"],
    [-5, 2, -18, "x>4"],
    [-6, 5, -19, "x>4"],
    [-7, 0, -28, "x>4"]
  ] as const;
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `解不等式：${a}x${Number(b) >= 0 ? "+" : ""}${b}<${c}，正确结果是哪一项？`,
    answer,
    wrongs: ["x<4", "x>3", "x<3", "x=4"],
    solution: `先移项：${a}x<${Number(c) - Number(b)}。两边除以负数 ${a} 时，不等号方向要改变，所以 ${answer}。`,
    concepts: ["alg_linear_inequalities", "alg_linear_equations", "arith_integers"],
    skills: ["negative_coefficient_inequality", "inverse_operations"],
    patterns: ["inequality_sign_flip", "linear_inequality"],
    misconceptions: ["inequality_direction_error", "negative_division_error"],
    theme: "不等式",
    chapter: "cn-junior-g7-negative-inequalities",
    chapterTitle: "七年级：负系数不等式",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_negative_coefficient_inequality",
    cognitiveTags: ["relation_reasoning", "signed_number_fluency"],
    hint1: "先像解方程一样移项。",
    hint2: "两边除以负数时，不等号方向必须改变。",
    commonMistake: "除以负数后仍保持原来的不等号方向。",
    variantIdea: "把不等式解集画在数轴上。"
  });
}

function perimeterExpressionDraft(i: number): Draft {
  const data = [
    [2, 3, 5, "4x+16"],
    [3, -1, 4, "6x+6"],
    [4, 2, 7, "8x+18"],
    [5, -3, 6, "10x+6"],
    [6, 1, 8, "12x+18"],
    [7, -2, 9, "14x+14"]
  ] as const;
  const [a, b, width, answer] = data[i % data.length];
  return baseDraft({
    statement: `长方形的长为 ${a}x${Number(b) >= 0 ? "+" : ""}${b}，宽为 ${width}，它的周长是多少？`,
    answer,
    wrongs: [`${a}x${Number(b) + Number(width) >= 0 ? "+" : ""}${Number(b) + Number(width)}`, `${Number(a) * Number(width)}x${Number(b) >= 0 ? "+" : ""}${b}`, `${Number(a) * 2}x${Number(b) >= 0 ? "+" : ""}${b}`, `${Number(a) * 2}x+${Number(width) * 2}`],
    solution: `长方形周长为 2(长+宽)，所以 2(${a}x${Number(b) >= 0 ? "+" : ""}${b}+${width})=${answer}。`,
    concepts: ["geo_perimeter", "prealg_expressions", "prealg_simplification"],
    skills: ["perimeter_expression", "expression_simplification"],
    patterns: ["geometry_to_expression", "rectangle_perimeter"],
    misconceptions: ["area_perimeter_confusion", "partial_distribution_error"],
    theme: "基础几何",
    chapter: "cn-junior-g7-perimeter-expressions",
    chapterTitle: "七年级：周长与整式表达",
    difficulty: 4,
    layer: "Honors",
    stage: "Bridge",
    problemType: "cn_perimeter_expression",
    cognitiveTags: ["modeling", "symbolic_fluency"],
    hint1: "先写出长方形周长公式。",
    hint2: "把含 x 的长和常数宽代入后再化简。",
    commonMistake: "把周长公式和面积公式混淆。",
    variantIdea: "给出周长，反求 x 的值。"
  });
}

function verticalAngleDraft(i: number): Draft {
  const data = [
    [36, 36],
    [48, 48],
    [72, 72],
    [95, 95],
    [118, 118],
    [135, 135]
  ];
  const [angle, answer] = data[i % data.length];
  return baseDraft({
    statement: `两条直线相交，其中一个角为 ${angle}°，它的对顶角是多少度？`,
    answer,
    wrongs: [180 - Number(angle), 90 - Number(angle), Number(answer) + 10, Math.max(1, Number(answer) - 10)],
    solution: `对顶角相等，所以它的对顶角也是 ${answer}°。`,
    concepts: ["geo_angles"],
    skills: ["vertical_angles", "angle_relationship"],
    patterns: ["intersecting_lines", "equal_angles"],
    misconceptions: ["vertical_vs_supplementary_error", "angle_relation_mismatch"],
    theme: "基础几何",
    chapter: "cn-junior-g7-vertical-angles",
    chapterTitle: "七年级：对顶角",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_vertical_angle",
    cognitiveTags: ["geometric_reasoning", "relation_selection"],
    hint1: "对顶角位于交点的相对位置。",
    hint2: "对顶角大小相等。",
    commonMistake: "把对顶角当成邻补角，用 180° 去减。",
    variantIdea: "同时给出邻补角和对顶角，判断两种关系。"
  });
}

function fractionIntegerOperationDraft(i: number): Draft {
  const data = [
    ["1/2", "-3/2", "-1"],
    ["2/3", "1/3", "1"],
    ["-5/4", "1/4", "-1"],
    ["3/5", "-8/5", "-1"],
    ["-7/6", "1/6", "-1"],
    ["5/8", "3/8", "1"]
  ] as const;
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `计算：${a}+${b}，结果是多少？`,
    answer,
    wrongs: [a, b, "0", answer === "1" ? "-1" : "1"],
    solution: `同分母分数相加，分母不变，分子相加。计算后结果为 ${answer}。`,
    concepts: ["arith_fractions", "arith_integers"],
    skills: ["fraction_addition", "signed_number_operations"],
    patterns: ["same_denominator_fraction_sum", "signed_fraction"],
    misconceptions: ["denominator_addition_error", "sign_error"],
    theme: "有理数",
    chapter: "cn-junior-g7-fraction-integer-operations",
    chapterTitle: "七年级：有理数分数运算",
    difficulty: 3,
    layer: "Standard",
    stage: "Foundation",
    problemType: "cn_signed_fraction_operation",
    cognitiveTags: ["fraction_reasoning", "signed_number_fluency"],
    hint1: "先看两个分数是否同分母。",
    hint2: "同分母相加时只合并分子。",
    commonMistake: "把分母也相加，或忽略负号。",
    variantIdea: "改成异分母分数，先通分再计算。"
  });
}

function polynomialEvaluationDraft(i: number): Draft {
  const data = [
    [2, 3, 4, 11],
    [-3, 5, 2, -1],
    [4, -7, 3, 5],
    [-2, -1, -4, 7],
    [5, 6, -1, 1],
    [-6, 2, -2, 14]
  ];
  const [a, b, x, answer] = data[i % data.length];
  return baseDraft({
    statement: `当 x=${x} 时，代数式 ${a}x${Number(b) >= 0 ? "+" : ""}${b} 的值是多少？`,
    answer,
    wrongs: [Number(a) + Number(x) + Number(b), Number(a) * Number(x), Number(answer) + 2, -Number(answer)],
    solution: `把 x=${x} 代入，得到 ${a}×${x}${Number(b) >= 0 ? "+" : ""}${b}=${answer}。`,
    concepts: ["prealg_substitution", "prealg_expressions", "arith_integers"],
    skills: ["expression_evaluation", "signed_number_operations"],
    patterns: ["substitution", "linear_expression_value"],
    misconceptions: ["substitution_error", "operation_order_error"],
    theme: "整式",
    chapter: "cn-junior-g7-expression-evaluation",
    chapterTitle: "七年级：代数式求值",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_expression_evaluation",
    cognitiveTags: ["symbol_evaluation", "signed_number_fluency"],
    hint1: "把 x 的值替换进代数式。",
    hint2: "先乘法，再加减。",
    commonMistake: "把 ax 误算成 a+x。",
    variantIdea: "加入 x^2 项，练习先乘方再乘法。"
  });
}

function parenthesesEquationG7Draft(i: number): Draft {
  const data = [
    [2, 3, 1, 15, 4],
    [3, 2, -1, 20, 5],
    [4, 1, 2, 18, 3],
    [5, -1, 3, 23, 4],
    [2, -4, 5, 17, 6],
    [3, -2, 4, 25, 7]
  ];
  const [a, b, c, total, answer] = data[i % data.length];
  return baseDraft({
    statement: `解方程：${a}(x${Number(b) >= 0 ? "+" : ""}${b})${Number(c) >= 0 ? "+" : ""}${c}=${total}，x 的值是多少？`,
    answer,
    wrongs: [Number(answer) + 1, Number(answer) - 1, Math.round(Number(total) / Number(a)), -Number(answer)],
    solution: `先去括号或先移项都可以。化简后解得 x=${answer}。关键是括号外的 ${a} 要乘括号内每一项。`,
    concepts: ["alg_linear_equations", "prealg_simplification"],
    skills: ["equation_with_parentheses", "distributive_property"],
    patterns: ["linear_equation_parentheses", "inverse_operations"],
    misconceptions: ["partial_distribution_error", "inverse_operations_error"],
    theme: "一元一次方程",
    chapter: "cn-junior-g7-equations-parentheses",
    chapterTitle: "七年级：含括号的一元一次方程",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_equation_with_parentheses",
    cognitiveTags: ["symbolic_fluency", "inverse_operations"],
    hint1: "可以先把括号去掉。",
    hint2: "括号外的数要乘括号中的每一项。",
    commonMistake: "去括号时只乘 x，漏乘常数项。",
    variantIdea: "在等号两边都放含括号表达式。"
  });
}

function inequalityNumberLineDraft(i: number): Draft {
  const data = [
    ["x>2", "空心圆在 2，向右"],
    ["x<5", "空心圆在 5，向左"],
    ["x≥-1", "实心圆在 -1，向右"],
    ["x≤3", "实心圆在 3，向左"],
    ["x>-4", "空心圆在 -4，向右"],
    ["x≤0", "实心圆在 0，向左"]
  ] as const;
  const [inequality, answer] = data[i % data.length];
  return baseDraft({
    statement: `不等式 ${inequality} 在数轴上的表示是哪一种？`,
    answer,
    wrongs: ["空心圆在 2，向左", "实心圆在 2，向右", "空心圆在 5，向右", "实心圆在 0，向右"],
    solution: `严格不等号用空心圆，含等号用实心圆；大于向右，小于向左。因此答案是“${answer}”。`,
    concepts: ["alg_linear_inequalities", "arith_integers"],
    skills: ["number_line_inequality", "inequality_interpretation"],
    patterns: ["inequality_graph", "open_closed_endpoint"],
    misconceptions: ["open_closed_endpoint_error", "direction_error"],
    theme: "不等式",
    chapter: "cn-junior-g7-inequality-number-line",
    chapterTitle: "七年级：不等式解集与数轴",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_g7_inequality_number_line",
    cognitiveTags: ["relation_reasoning", "spatial_reasoning"],
    hint1: "先判断端点是否包含。",
    hint2: "大于向右，小于向左。",
    commonMistake: "把空心圆和实心圆用反，或把方向画反。",
    variantIdea: "给出数轴图，反写不等式。"
  });
}

function rectangleAreaExpressionDraft(i: number): Draft {
  const data = [
    [2, 3, "6x"],
    [3, 4, "12x"],
    [5, 2, "10x"],
    [4, 6, "24x"],
    [7, 3, "21x"],
    [6, 5, "30x"]
  ] as const;
  const [lengthCoeff, width, answer] = data[i % data.length];
  return baseDraft({
    statement: `长方形的长为 ${lengthCoeff}x，宽为 ${width}，面积是多少？`,
    answer,
    wrongs: [`${Number(lengthCoeff) + Number(width)}x`, `${Number(lengthCoeff) * 2 + Number(width) * 2}x`, `${lengthCoeff}x+${width}`, `${Number(lengthCoeff) * Number(width)}`],
    solution: `长方形面积=长×宽，所以面积为 ${lengthCoeff}x×${width}=${answer}。`,
    concepts: ["geo_area", "prealg_expressions"],
    skills: ["area_expression", "monomial_multiplication"],
    patterns: ["rectangle_area_expression", "geometry_to_expression"],
    misconceptions: ["perimeter_area_confusion", "missing_variable_error"],
    theme: "基础几何",
    chapter: "cn-junior-g7-area-expressions",
    chapterTitle: "七年级：面积与整式表达",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_area_expression",
    cognitiveTags: ["modeling", "symbolic_fluency"],
    hint1: "先回忆长方形面积公式。",
    hint2: "含 x 的长乘以常数宽，系数相乘，x 保留。",
    commonMistake: "把面积算成周长，或漏写 x。",
    variantIdea: "给出面积和宽，反求长。"
  });
}

function triangleAngleG7Draft(i: number): Draft {
  const data = [
    [50, 60, 70],
    [35, 75, 70],
    [42, 68, 70],
    [48, 57, 75],
    [66, 44, 70],
    [30, 80, 70]
  ];
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `三角形两个内角分别是 ${a}° 和 ${b}°，第三个内角是多少度？`,
    answer,
    wrongs: [Number(a) + Number(b), 180 - Number(a), 180 - Number(b), Number(answer) + 10],
    solution: `三角形内角和为 180°，所以第三个内角为 180°-${a}°-${b}°=${answer}°。`,
    concepts: ["geo_triangle_angles", "geo_triangles"],
    skills: ["triangle_angle_sum", "angle_subtraction"],
    patterns: ["missing_triangle_angle", "angle_sum"],
    misconceptions: ["angle_sum_error", "arithmetic_slip"],
    theme: "基础几何",
    chapter: "cn-junior-g7-triangle-angles",
    chapterTitle: "七年级：三角形内角和",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_g7_triangle_angle_sum",
    cognitiveTags: ["geometric_reasoning", "fluency_precision"],
    hint1: "三角形三个内角和是 180°。",
    hint2: "用 180° 减去两个已知角。",
    commonMistake: "把两个已知角之和当作第三个角。",
    variantIdea: "把一个角设为 x，建立方程求角度。"
  });
}

function rationalDistanceDraft(i: number): Draft {
  const data = [
    [-3, 5, 8],
    [-7, -2, 5],
    [4, 11, 7],
    [-6, 3, 9],
    [-10, -1, 9],
    [2, 9, 7]
  ];
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `数轴上点 A 表示 ${a}，点 B 表示 ${b}，AB 的长度是多少？`,
    answer,
    wrongs: [Number(a) + Number(b), Math.abs(Number(a)) + Math.abs(Number(b)), Number(answer) + 1, Math.abs(Number(a) - Number(b)) + 2],
    solution: `数轴上两点距离等于两个数差的绝对值：|${b}-${a}|=${answer}。`,
    concepts: ["arith_absolute_value", "arith_integers"],
    skills: ["number_line_distance", "absolute_difference"],
    patterns: ["distance_between_numbers", "absolute_value_distance"],
    misconceptions: ["signed_difference_error", "sum_instead_of_distance"],
    theme: "有理数",
    chapter: "cn-junior-g7-number-line-distance",
    chapterTitle: "七年级：数轴两点距离",
    difficulty: 3,
    layer: "Standard",
    stage: "Foundation",
    problemType: "cn_number_line_distance",
    cognitiveTags: ["number_sense", "spatial_reasoning"],
    hint1: "距离不考虑方向，所以结果不能为负。",
    hint2: "可以用两个数差的绝对值。",
    commonMistake: "直接把两个数相加，或得到负距离。",
    variantIdea: "给出一点和距离，求另一点可能的位置。"
  });
}

function twoStepExpressionSimplificationDraft(i: number): Draft {
  const data = [
    [2, 3, 4, 5, "6x+13"],
    [3, -2, 5, -1, "-6x+14"],
    [-2, 4, 3, 6, "-8x"],
    [5, 1, -2, 7, "5x-3"],
    [-3, -2, 4, -5, "6x-17"],
    [4, 3, -1, 8, "12x+4"]
  ] as const;
  const [a, b, c, d, answer] = data[i % data.length];
  return baseDraft({
    statement: `化简：${a}(${b}x${Number(c) >= 0 ? "+" : ""}${c})${Number(d) >= 0 ? "+" : ""}${d}，结果是多少？`,
    answer,
    wrongs: [`${Number(a) * Number(b)}x${Number(c) + Number(d) >= 0 ? "+" : ""}${Number(c) + Number(d)}`, `${Number(a) + Number(b)}x${Number(a) * Number(c) + Number(d) >= 0 ? "+" : ""}${Number(a) * Number(c) + Number(d)}`, `${Number(a) * Number(b)}x`, `${Number(a) * Number(c) + Number(d)}`],
    solution: `先用分配律去括号，再合并常数项，结果是 ${answer}。`,
    concepts: ["prealg_simplification", "prealg_expressions"],
    skills: ["two_step_simplification", "distributive_property"],
    patterns: ["distribute_then_combine", "expression_simplification"],
    misconceptions: ["partial_distribution_error", "constant_combination_error"],
    theme: "整式",
    chapter: "cn-junior-g7-two-step-simplification",
    chapterTitle: "七年级：整式两步化简",
    difficulty: 4,
    layer: "Honors",
    stage: "Bridge",
    problemType: "cn_two_step_expression_simplification",
    cognitiveTags: ["symbolic_fluency", "operation_selection"],
    hint1: "第一步先去括号。",
    hint2: "第二步再合并常数项或同类项。",
    commonMistake: "去括号后忘记继续合并常数项。",
    variantIdea: "加入两个括号，练习分组化简。"
  });
}

function proportionEquationG7Draft(i: number): Draft {
  const data = [
    [2, 5, 20, 8],
    [3, 4, 28, 21],
    [5, 6, 18, 15],
    [4, 7, 35, 20],
    [6, 5, 25, 30],
    [7, 3, 12, 28]
  ];
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `解比例：${a}:${b}=x:${c}，x 的值是多少？`,
    answer,
    wrongs: [Number(a) + Number(c), Math.round(Number(b) * Number(c) / Number(a)), Number(answer) + 2, Number(answer) - 2],
    solution: `比例 ${a}:${b}=x:${c} 可写成 ${a}/${b}=x/${c}，所以 x=${a}×${c}÷${b}=${answer}。`,
    concepts: ["arith_ratios", "arith_proportions", "alg_linear_equations"],
    skills: ["proportion_solving", "cross_multiplication"],
    patterns: ["missing_ratio_value", "proportion_equation"],
    misconceptions: ["inverse_ratio_error", "cross_multiplication_error"],
    theme: "方程与比例",
    chapter: "cn-junior-g7-proportion-equations",
    chapterTitle: "七年级：比例方程",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_proportion_equation",
    cognitiveTags: ["multiplicative_reasoning", "inverse_operations"],
    hint1: "把比写成分数形式更清楚。",
    hint2: "对应位置要保持一致。",
    commonMistake: "把比例方向写反，导致乘除顺序错误。",
    variantIdea: "放入相似图形边长情境。"
  });
}

function inequalityWordG7Draft(i: number): Draft {
  const data = [
    [8, 5, 45, 5],
    [6, 4, 40, 6],
    [7, 9, 51, 6],
    [5, 3, 38, 7],
    [9, 2, 65, 7],
    [4, 6, 34, 7]
  ];
  const [price, fixed, budget, answer] = data[i % data.length];
  return baseDraft({
    statement: `每本练习册 ${price} 元，另需运费 ${fixed} 元。总费用不超过 ${budget} 元，最多可以买几本？`,
    answer,
    wrongs: [Number(answer) + 1, Number(answer) - 1, Math.floor(Number(budget) / Number(price)), Number(answer) + 2],
    solution: `设买 x 本，列不等式 ${price}x+${fixed}≤${budget}，解得 x≤${answer}。最多可以买 ${answer} 本。`,
    concepts: ["alg_linear_inequalities", "prealg_word_to_equation"],
    skills: ["inequality_modeling", "budget_constraint"],
    patterns: ["at_most_context", "linear_inequality_word_problem"],
    misconceptions: ["inequality_direction_error", "missing_fixed_fee"],
    theme: "不等式",
    chapter: "cn-junior-g7-inequality-applications",
    chapterTitle: "七年级：一元一次不等式应用",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_inequality_word_problem",
    cognitiveTags: ["modeling", "relation_reasoning"],
    hint1: "不超过表示小于或等于。",
    hint2: "总费用包括固定运费和每本价格。",
    commonMistake: "把“不超过”写成大于等于，或忘记运费。",
    variantIdea: "改成至少需要多少本，比较不等号方向。"
  });
}

function coordinatePointG7Draft(i: number): Draft {
  const data = [
    [2, 3, "第一象限"],
    [-4, 5, "第二象限"],
    [-3, -2, "第三象限"],
    [6, -1, "第四象限"],
    [0, 7, "y轴上"],
    [-5, 0, "x轴上"]
  ] as const;
  const [x, y, answer] = data[i % data.length];
  return baseDraft({
    statement: `点 P(${x},${y}) 位于哪里？`,
    answer,
    wrongs: ["第一象限", "第二象限", "第三象限", "第四象限", "x轴上", "y轴上"].filter((value) => value !== answer).slice(0, 4),
    solution: `根据横坐标和纵坐标的符号判断位置。点 (${x},${y}) 位于${answer}。`,
    concepts: ["geo_coordinate_geometry", "alg_graphing"],
    skills: ["coordinate_quadrant", "signed_number_interpretation"],
    patterns: ["point_location", "coordinate_plane"],
    misconceptions: ["coordinate_order_error", "axis_quadrant_confusion"],
    theme: "平面直角坐标系",
    chapter: "cn-junior-g7-coordinate-plane",
    chapterTitle: "七年级：平面直角坐标系初步",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_g7_coordinate_quadrant",
    cognitiveTags: ["spatial_reasoning", "signed_number_fluency"],
    hint1: "先看横坐标的正负，再看纵坐标的正负。",
    hint2: "如果某个坐标为 0，点在坐标轴上。",
    commonMistake: "把横纵坐标顺序看反，或把坐标轴上的点归入象限。",
    variantIdea: "给出象限，判断坐标符号。"
  });
}

function angleEquationG7Draft(i: number): Draft {
  const data = [
    [2, 20, 50],
    [3, 15, 35],
    [4, 10, 30],
    [5, 5, 25],
    [6, 12, 18],
    [7, 19, 13]
  ];
  const [a, b, answer] = data[i % data.length];
  const supplement = Number(a) * Number(answer) + Number(b);
  return baseDraft({
    statement: `两个邻补角中，一个角为 ${a}x+${b} 度，另一个角为 ${180 - supplement} 度。求 x。`,
    answer,
    wrongs: [Number(answer) + 1, Number(answer) - 1, Math.round((180 - Number(b)) / Number(a)), -Number(answer)],
    solution: `邻补角和为 180°，所以 ${a}x+${b}+${180 - supplement}=180，解得 x=${answer}。`,
    concepts: ["geo_angles", "alg_linear_equations"],
    skills: ["angle_equation", "linear_equation_solving"],
    patterns: ["geometry_to_equation", "supplementary_angle_equation"],
    misconceptions: ["angle_sum_error", "equation_setup_error"],
    theme: "基础几何",
    chapter: "cn-junior-g7-angle-equations",
    chapterTitle: "七年级：角度方程",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_g7_angle_equation",
    cognitiveTags: ["modeling", "geometric_reasoning"],
    hint1: "邻补角相加等于 180°。",
    hint2: "把两个角的表达式相加，建立一元一次方程。",
    commonMistake: "把邻补角当作相等关系，而不是互补关系。",
    variantIdea: "改成对顶角相等，建立另一类角度方程。"
  });
}

function triangleInequalityDraft(i: number): Draft {
  const a = 5 + i;
  const b = 8 + i;
  const lower = Math.abs(a - b);
  const upper = a + b;
  const answer = `${lower}<x<${upper}`;
  return baseDraft({
    statement: `三角形两边长分别为 ${a} 和 ${b}，第三边长为 x。下面哪个范围正确？`,
    answer,
    wrongs: [`x>${upper}`, `x<${upper}`, `${lower}≤x≤${upper}`, `x>${lower}`],
    solution: `三角形任意两边之差小于第三边，任意两边之和大于第三边，所以 ${lower}<x<${upper}。`,
    concepts: ["geo_triangles"],
    skills: ["triangle_inequality", "inequality_reasoning"],
    patterns: ["two_sides_bound_third_side", "geometric_constraint"],
    misconceptions: ["endpoint_inclusion_error", "one_sided_constraint_error"],
    theme: "三角形基础",
    chapter: "cn-junior-g8-triangles",
    chapterTitle: "八年级：三角形基础",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_triangle_inequality",
    cognitiveTags: ["geometric_reasoning", "constraint_reasoning"],
    hint1: "第三边必须大于两边之差。",
    hint2: "第三边还必须小于两边之和。",
    commonMistake: "只写小于两边之和，忘记大于两边之差。",
    variantIdea: "把第三边限制为整数，求可能的取值个数。"
  });
}

function triangleAngleDraft(i: number): Draft {
  const a = 38 + i * 4;
  const b = 64 - i * 3;
  const answer = 180 - a - b;
  return baseDraft({
    statement: `三角形的两个内角分别是 ${a}° 和 ${b}°，第三个内角是多少度？`,
    answer,
    wrongs: [a + b, 180 - a, 180 - b, answer + 10],
    solution: `三角形内角和为 180°，第三个角为 180°-${a}°-${b}°=${answer}°。`,
    concepts: ["geo_triangle_angles", "geo_triangles"],
    skills: ["angle_sum", "subtraction_fluency"],
    patterns: ["triangle_angle_sum", "missing_angle"],
    misconceptions: ["angle_sum_error", "arithmetic_slip"],
    theme: "三角形基础",
    chapter: "cn-junior-g8-triangle-angles",
    chapterTitle: "八年级：三角形内角和",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_triangle_angle_sum",
    cognitiveTags: ["geometric_reasoning", "fluency_precision"],
    hint1: "先回忆三角形三个内角和。",
    hint2: "用 180° 减去两个已知角。",
    commonMistake: "把两个已知角相加后直接作为答案。",
    variantIdea: "把一个角设为另一个角的 2 倍，练习方程建模。"
  });
}

function congruenceCriterionDraft(i: number): Draft {
  const options = [
    ["两边及其夹角对应相等", "SAS"],
    ["两角及其夹边对应相等", "ASA"],
    ["三边对应相等", "SSS"],
    ["直角三角形斜边和一条直角边对应相等", "HL"]
  ];
  const [statementPart, answer] = options[i % options.length];
  return baseDraft({
    statement: `判断三角形全等时，条件“${statementPart}”对应的判定方法是？`,
    answer,
    wrongs: ["AAA", "SSA", "AAS", answer === "HL" ? "SAS" : "HL"],
    solution: `“${statementPart}”对应 ${answer} 判定。注意 AAA 只能说明相似，SSA 一般不能直接判定全等。`,
    concepts: ["geo_congruence", "geo_triangles"],
    skills: ["congruence_criterion", "condition_matching"],
    patterns: ["geometry_proof_condition", "criterion_selection"],
    misconceptions: ["aaa_congruence_error", "ssa_congruence_error"],
    theme: "三角形全等",
    chapter: "cn-junior-g8-congruence",
    chapterTitle: "八年级：三角形全等",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_congruence_criterion",
    cognitiveTags: ["proof_reasoning", "criterion_selection"],
    hint1: "先判断给出的条件包含边还是角。",
    hint2: "注意夹角、夹边这类关键词。",
    commonMistake: "把 AAA 或 SSA 当作全等判定。",
    variantIdea: "给出图形条件，让学生选择可证明全等的三角形。"
  });
}

function pythagoreanDraft(i: number): Draft {
  const triples = [
    [6, 8, 10],
    [5, 12, 13],
    [9, 12, 15],
    [8, 15, 17]
  ];
  const [a, b, c] = triples[i % triples.length];
  return baseDraft({
    statement: `直角三角形的斜边长为 ${c}，一条直角边长为 ${a}，另一条直角边长是多少？`,
    answer: b,
    wrongs: [c - a, a + c, b + 1, c],
    solution: `由勾股定理，另一条直角边的平方为 ${c}^2-${a}^2=${c * c - a * a}，所以另一条直角边为 ${b}。`,
    concepts: ["geo_pythagorean", "geo_triangles"],
    skills: ["pythagorean_theorem", "square_root_fluency"],
    patterns: ["right_triangle_leg_to_hypotenuse", "formula_application"],
    misconceptions: ["add_lengths_error", "leg_hypotenuse_confusion"],
    theme: "直角三角形",
    chapter: "cn-junior-g8-pythagorean",
    chapterTitle: "八年级：直角三角形与勾股定理",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_pythagorean_missing_leg",
    cognitiveTags: ["formula_selection", "geometric_reasoning"],
    hint1: "确认题目给的是斜边和一条直角边。",
    hint2: "用斜边平方减去已知直角边平方。",
    commonMistake: "直接用斜边减去直角边。",
    variantIdea: "给出两条直角边，反求斜边。"
  });
}

function coordinateTranslationDraft(i: number): Draft {
  const x = -3 + i * 2;
  const y = 2 + i;
  const dx = 4 - i;
  const dy = -2 + i;
  const answer = `(${x + dx},${y + dy})`;
  return baseDraft({
    statement: `点 A(${x},${y}) 向右平移 ${dx} 个单位、向上平移 ${dy} 个单位后，得到点 A'。A' 的坐标是多少？`,
    answer,
    wrongs: [`(${x - dx},${y + dy})`, `(${x + dx},${y - dy})`, `(${x + dy},${y + dx})`, `(${dx},${dy})`],
    solution: `向右平移改变横坐标，加 ${dx}；向上平移改变纵坐标，加 ${dy}。所以 A'=(${x + dx},${y + dy})。`,
    concepts: ["geo_coordinate_geometry", "alg_graphing"],
    skills: ["coordinate_translation", "signed_number_operations"],
    patterns: ["coordinate_change", "horizontal_vertical_shift"],
    misconceptions: ["coordinate_order_error", "sign_direction_error"],
    theme: "平面直角坐标系",
    chapter: "cn-junior-g8-coordinate-geometry",
    chapterTitle: "八年级：坐标与平移",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_coordinate_translation",
    cognitiveTags: ["spatial_reasoning", "signed_number_fluency"],
    hint1: "横坐标负责左右移动。",
    hint2: "纵坐标负责上下移动，向下可看成加负数。",
    commonMistake: "把横坐标和纵坐标的变化量写反。",
    variantIdea: "给出平移前后两个点，反求平移向量。"
  });
}

function linearFunctionDraft(i: number): Draft {
  const k = 2 + i;
  const b = -3 + i;
  const x = 4 + i;
  const answer = k * x + b;
  return baseDraft({
    statement: `一次函数 y=${k}x${b >= 0 ? "+" : ""}${b}，当 x=${x} 时，y 的值是多少？`,
    answer,
    wrongs: [k + x + b, k * x, answer + b, answer - k],
    solution: `把 x=${x} 代入，得到 y=${k}×${x}${b >= 0 ? "+" : ""}${b}=${answer}。`,
    concepts: ["alg_functions", "prealg_substitution"],
    skills: ["function_evaluation", "substitution"],
    patterns: ["input_output_mapping", "linear_function_evaluation"],
    misconceptions: ["operation_order_error", "variable_meaning_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-functions",
    chapterTitle: "八年级：一次函数初步",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_linear_function_evaluation",
    cognitiveTags: ["symbol_evaluation", "input_output_mapping"],
    hint1: "把给定的 x 值代入函数式。",
    hint2: "先做乘法，再处理加减。",
    commonMistake: "把 kx 写成 k+x。",
    variantIdea: "给出 y 的值，反求 x。"
  });
}

function triangleAreaDraft(i: number): Draft {
  const base = 10 + i * 2;
  const height = 6 + i;
  const answer = (base * height) / 2;
  return baseDraft({
    statement: `三角形的底为 ${base}，高为 ${height}，面积是多少？`,
    answer,
    wrongs: [base * height, base + height, answer + base, Math.abs(base - height)],
    solution: `三角形面积等于底乘高再除以 2，所以面积为 ${base}×${height}÷2=${answer}。`,
    concepts: ["geo_area", "geo_triangles"],
    skills: ["triangle_area", "formula_application"],
    patterns: ["area_formula", "geometry_measurement"],
    misconceptions: ["missing_half_factor", "perimeter_area_confusion"],
    theme: "三角形基础",
    chapter: "cn-junior-g8-triangle-area",
    chapterTitle: "八年级：三角形面积与高",
    difficulty: 3,
    layer: i < 3 ? "Standard" : "Honors",
    stage: "Bridge",
    problemType: "cn_triangle_area",
    cognitiveTags: ["formula_selection", "geometric_reasoning"],
    hint1: "三角形面积公式里有除以 2。",
    hint2: "先算底乘高，再取一半。",
    commonMistake: "把三角形面积算成底乘高，漏掉除以 2。",
    variantIdea: "给出面积和底，反求高。"
  });
}

function congruenceCorrespondingSideDraft(i: number): Draft {
  const side = 7 + i;
  const labels = [
    ["△ABC≌△DEF", "AB", "DE"],
    ["△ABC≌△DEF", "BC", "EF"],
    ["△PQR≌△XYZ", "PR", "XZ"],
    ["△LMN≌△RST", "MN", "ST"],
    ["△ABC≌△DCE", "AC", "DE"],
    ["△PQR≌△RSP", "PQ", "RS"]
  ][i % 6];
  const [relation, knownSide, targetSide] = labels;
  return baseDraft({
    statement: `已知 ${relation}，且 ${knownSide}=${side}，则对应边 ${targetSide} 的长是多少？`,
    answer: side,
    wrongs: [side + 1, side - 1, side * 2, Math.max(1, side - 3)],
    solution: `全等三角形的对应边相等。由 ${relation} 可知 ${knownSide} 与 ${targetSide} 对应，所以 ${targetSide}=${side}。`,
    concepts: ["geo_congruence", "geo_triangles"],
    skills: ["corresponding_parts", "congruence_reasoning"],
    patterns: ["cpctc", "geometry_correspondence"],
    misconceptions: ["corresponding_order_error", "equal_shape_notation_error"],
    theme: "三角形全等",
    chapter: "cn-junior-g8-congruence-correspondence",
    chapterTitle: "八年级：全等三角形对应关系",
    difficulty: i < 3 ? 3 : 4,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_congruence_corresponding_side",
    cognitiveTags: ["proof_reasoning", "structure_recognition"],
    hint1: "先按全等符号中的字母顺序找对应顶点。",
    hint2: "对应边在全等三角形中长度相等。",
    commonMistake: "只看图形名字相似，忽略全等符号中的对应顺序。",
    variantIdea: "改成给出对应角，判断角度是否相等。"
  });
}

function pythagoreanCoordinateDistanceDraft(i: number): Draft {
  const triples = [
    [0, 0, 6, 8, 10],
    [1, 2, 6, 14, 13],
    [-3, 1, 6, 13, 15],
    [-4, -2, 4, 13, 17],
    [2, -5, 14, 0, 13],
    [-6, 3, 2, 18, 17]
  ];
  const [x1, y1, x2, y2, answer] = triples[i % triples.length];
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return baseDraft({
    statement: `平面直角坐标系中，点 A(${x1},${y1})，点 B(${x2},${y2})。线段 AB 的长度是多少？`,
    answer,
    wrongs: [dx + dy, Math.abs(dx - dy), answer + 1, Math.max(dx, dy)],
    solution: `横向距离为 ${dx}，纵向距离为 ${dy}，把 AB 看成直角三角形的斜边，所以 AB=√(${dx}^2+${dy}^2)=${answer}。`,
    concepts: ["geo_coordinate_geometry", "geo_pythagorean", "alg_graphing"],
    skills: ["coordinate_distance", "pythagorean_theorem"],
    patterns: ["coordinate_right_triangle", "distance_on_plane"],
    misconceptions: ["manhattan_distance_error", "coordinate_difference_error"],
    theme: "平面直角坐标系",
    chapter: "cn-junior-g8-coordinate-distance",
    chapterTitle: "八年级：坐标距离与勾股定理",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_coordinate_pythagorean_distance",
    cognitiveTags: ["spatial_reasoning", "formula_selection"],
    hint1: "先分别求横向距离和纵向距离。",
    hint2: "这两个距离可以作为直角三角形的两条直角边。",
    commonMistake: "直接把横向距离和纵向距离相加。",
    variantIdea: "给出两点距离和一个坐标，反求另一个坐标。"
  });
}

function linearSlopeDraft(i: number): Draft {
  const data = [
    [1, 3, 4, 9, 2],
    [-2, 5, 2, 13, 2],
    [0, -1, 3, 8, 3],
    [-1, -4, 2, 5, 3],
    [2, 7, 6, 15, 2],
    [-3, 1, 1, 9, 2]
  ];
  const [x1, y1, x2, y2, answer] = data[i % data.length];
  return baseDraft({
    statement: `一次函数图像经过点 (${x1},${y1}) 和 (${x2},${y2})，它的斜率是多少？`,
    answer,
    wrongs: [y2 - y1, x2 - x1, answer + 1, -answer],
    solution: `斜率 k=(y₂-y₁)/(x₂-x₁)=(${y2}-${y1})/(${x2}-${x1})=${answer}。`,
    concepts: ["alg_graphing", "alg_functions", "geo_coordinate_geometry"],
    skills: ["slope_from_two_points", "signed_number_operations"],
    patterns: ["rate_of_change", "coordinate_ratio"],
    misconceptions: ["rise_run_confusion", "sign_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-slope",
    chapterTitle: "八年级：一次函数斜率",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_linear_slope_from_two_points",
    cognitiveTags: ["multiplicative_reasoning", "signed_number_fluency"],
    hint1: "斜率表示纵坐标变化量除以横坐标变化量。",
    hint2: "注意两个点的顺序要前后一致。",
    commonMistake: "把横坐标变化量和纵坐标变化量写反。",
    variantIdea: "给出斜率和一个点，判断另一个点是否在同一直线上。"
  });
}

function linearInterceptDraft(i: number): Draft {
  const data = [
    [2, -3, 5, 7],
    [3, 1, 2, 7],
    [-2, 8, 3, 2],
    [4, -5, 3, 7],
    [-1, 6, 4, 2],
    [5, -2, 2, 8]
  ];
  const [k, b, x, answer] = data[i % data.length];
  return baseDraft({
    statement: `一次函数 y=${k}x${b >= 0 ? "+" : ""}${b}。当 x=${x} 时，y 的值是多少？`,
    answer,
    wrongs: [k + x + b, k * x, answer + k, answer - b],
    solution: `把 x=${x} 代入，y=${k}×${x}${b >= 0 ? "+" : ""}${b}=${answer}。`,
    concepts: ["alg_functions", "prealg_substitution", "alg_graphing"],
    skills: ["function_evaluation", "order_of_operations"],
    patterns: ["linear_function_evaluation", "input_output_mapping"],
    misconceptions: ["substitution_error", "operation_order_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-functions",
    chapterTitle: "八年级：一次函数初步",
    difficulty: 3,
    layer: "Standard",
    stage: "Algebra Readiness",
    problemType: "cn_linear_function_evaluation",
    cognitiveTags: ["symbol_evaluation", "input_output_mapping"],
    hint1: "把给定的 x 值代入函数式。",
    hint2: "先乘法，再加减常数项。",
    commonMistake: "把 kx 误算成 k+x。",
    variantIdea: "给出 y 的值，反求 x。"
  });
}

function linearModelingDraft(i: number): Draft {
  const data = [
    [12, 3, 5, 27],
    [8, 4, 6, 32],
    [15, 2, 7, 29],
    [20, 5, 4, 40],
    [6, 7, 3, 27],
    [10, 6, 8, 58]
  ];
  const [start, rate, x, answer] = data[i % data.length];
  return baseDraft({
    statement: `某水箱原有 ${start} 升水，每分钟增加 ${rate} 升。按这个规律，${x} 分钟后水箱中有多少升水？`,
    answer,
    wrongs: [start + rate + x, rate * x, start * x + rate, answer + rate],
    solution: `总量=初始量+每分钟增加量×时间，所以 ${start}+${rate}×${x}=${answer}。`,
    concepts: ["alg_functions", "alg_linear_equations", "prealg_word_to_equation"],
    skills: ["linear_modeling", "word_to_expression"],
    patterns: ["initial_value_plus_rate", "real_world_linear_model"],
    misconceptions: ["rate_total_confusion", "missing_initial_value"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-modeling",
    chapterTitle: "八年级：一次函数实际问题",
    difficulty: i < 3 ? 3 : 4,
    layer: i < 3 ? "Standard" : "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_linear_modeling",
    cognitiveTags: ["modeling", "operation_selection"],
    hint1: "先区分初始量和每分钟变化量。",
    hint2: "总量等于初始量加上变化量乘时间。",
    commonMistake: "只算每分钟增加量乘时间，忘记加上原来的数量。",
    variantIdea: "给出目标总量，反求需要多少分钟。"
  });
}

function similarityScaleDraft(i: number): Draft {
  const data = [
    [3, 5, 9, 15],
    [4, 7, 12, 21],
    [5, 8, 15, 24],
    [6, 11, 18, 33],
    [7, 10, 21, 30],
    [8, 13, 24, 39]
  ];
  const [smallA, smallB, largeA, answer] = data[i % data.length];
  return baseDraft({
    statement: `两个三角形相似。小三角形的一组对应边为 ${smallA} 和 ${smallB}，大三角形中与 ${smallA} 对应的边为 ${largeA}，则与 ${smallB} 对应的边长是多少？`,
    answer,
    wrongs: [smallB + largeA, largeA - smallA + smallB, answer + smallA, Math.round((smallB * smallA) / largeA)],
    solution: `相似三角形对应边成比例，放大倍数为 ${largeA}÷${smallA}=${largeA / smallA}，所以对应边为 ${smallB}×${largeA / smallA}=${answer}。`,
    concepts: ["geo_similarity", "arith_proportions", "geo_triangles"],
    skills: ["similarity_ratio", "proportional_reasoning"],
    patterns: ["scale_factor", "corresponding_sides"],
    misconceptions: ["additive_scaling_error", "correspondence_error"],
    theme: "相似三角形",
    chapter: "cn-junior-g8-similarity",
    chapterTitle: "八年级：相似三角形比例",
    difficulty: i < 3 ? 4 : 5,
    layer: i < 3 ? "Honors" : "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_similarity_scale_factor",
    cognitiveTags: ["multiplicative_reasoning", "structure_recognition"],
    hint1: "先找出两个三角形之间的放大倍数。",
    hint2: "相似图形的对应边用同一个倍数变化。",
    commonMistake: "把边长差当成固定增加量，而不是用比例倍数。",
    variantIdea: "给出周长或面积关系，反推相似比。"
  });
}

function parallelAngleDraft(i: number): Draft {
  const data = [
    [42, 42],
    [58, 58],
    [73, 73],
    [106, 74],
    [121, 59],
    [135, 45]
  ];
  const [given, answer] = data[i % data.length];
  const relation = i < 3 ? "同位角相等" : "邻补角互补";
  return baseDraft({
    statement: `两条平行线被一条直线所截。若其中一个角为 ${given}°，根据${relation}，目标角是多少度？`,
    answer,
    wrongs: [180 - answer, given, answer + 10, Math.max(1, answer - 10)],
    solution: i < 3 ? `平行线形成的同位角相等，所以目标角为 ${answer}°。` : `邻补角和为 180°，所以目标角为 180°-${given}°=${answer}°。`,
    concepts: ["geo_angles", "geo_triangles"],
    skills: ["angle_chasing", "parallel_line_angles"],
    patterns: ["parallel_lines", "angle_relationships"],
    misconceptions: ["supplementary_vs_equal_error", "angle_relation_mismatch"],
    theme: "几何基础",
    chapter: "cn-junior-g8-parallel-angles",
    chapterTitle: "八年级：平行线角度关系",
    difficulty: i < 3 ? 3 : 4,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_parallel_angle_chasing",
    cognitiveTags: ["geometric_reasoning", "relation_selection"],
    hint1: "先判断目标角与已知角是相等关系还是互补关系。",
    hint2: "如果互补，就用 180° 减去已知角。",
    commonMistake: "把互补角误当成相等角。",
    variantIdea: "把角度放入三角形内角和中，做两步角度追踪。"
  });
}

function linearSolveForInputDraft(i: number): Draft {
  const data = [
    [2, 3, 15, 6],
    [3, -4, 14, 6],
    [4, 1, 21, 5],
    [5, -2, 28, 6],
    [-2, 9, -3, 6],
    [-3, 12, -6, 6]
  ];
  const [k, b, y, answer] = data[i % data.length];
  return baseDraft({
    statement: `一次函数 y=${k}x${b >= 0 ? "+" : ""}${b}。当 y=${y} 时，x 的值是多少？`,
    answer,
    wrongs: [k * y + b, y - b, answer + 1, -answer],
    solution: `把 y=${y} 代入，得到 ${y}=${k}x${b >= 0 ? "+" : ""}${b}，解得 x=${answer}。`,
    concepts: ["alg_functions", "alg_linear_equations", "prealg_substitution"],
    skills: ["solve_for_input", "linear_equation_solving"],
    patterns: ["inverse_function_evaluation", "one_variable_equation"],
    misconceptions: ["inverse_operations_error", "substitution_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-inverse",
    chapterTitle: "八年级：一次函数反求自变量",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_linear_solve_for_input",
    cognitiveTags: ["inverse_operations", "symbolic_fluency"],
    hint1: "把给定的 y 值代入函数式。",
    hint2: "把问题转化成一个一元一次方程。",
    commonMistake: "把 y 的值当成 x 直接代入。",
    variantIdea: "给出两个函数值，判断哪一个输入更大。"
  });
}

function linearInterceptFromPointDraft(i: number): Draft {
  const data = [
    [2, 4, 11, 3],
    [3, 2, 10, 4],
    [-1, 5, 1, 6],
    [4, -1, 5, 9],
    [-2, 3, -1, 5],
    [5, 2, 17, 7]
  ];
  const [k, x, y, answer] = data[i % data.length];
  return baseDraft({
    statement: `一次函数 y=${k}x+b 经过点 (${x},${y})，则 b 的值是多少？`,
    answer,
    wrongs: [y + k * x, y - x, answer + k, -answer],
    solution: `把点 (${x},${y}) 代入 y=${k}x+b，得 ${y}=${k}×${x}+b，所以 b=${answer}。`,
    concepts: ["alg_functions", "alg_linear_equations", "alg_graphing"],
    skills: ["linear_intercept", "substitution", "equation_solving"],
    patterns: ["point_on_line", "solve_parameter"],
    misconceptions: ["parameter_substitution_error", "sign_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-intercept",
    chapterTitle: "八年级：一次函数待定系数",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_linear_intercept_from_point",
    cognitiveTags: ["symbolic_fluency", "input_output_mapping"],
    hint1: "点在函数图像上，说明它的坐标满足函数式。",
    hint2: "把 x 和 y 同时代入，再解 b。",
    commonMistake: "只代入 x，忘记点的 y 坐标也要使用。",
    variantIdea: "给出两个点，先求斜率再求截距。"
  });
}

function linearIntersectionDraft(i: number): Draft {
  const data = [
    [2, 1, -1, 10, 3],
    [3, -2, 1, 6, 4],
    [-2, 9, 1, 0, 3],
    [4, -5, -1, 10, 3],
    [2, -7, -3, 8, 3],
    [-1, 12, 2, 3, 3]
  ];
  const [k1, b1, k2, b2, answer] = data[i % data.length];
  return baseDraft({
    statement: `两条直线 y=${k1}x${b1 >= 0 ? "+" : ""}${b1} 与 y=${k2}x${b2 >= 0 ? "+" : ""}${b2} 的交点横坐标是多少？`,
    answer,
    wrongs: [b2 - b1, k1 - k2, answer + 1, -answer],
    solution: `交点处两个 y 值相等，所以 ${k1}x${b1 >= 0 ? "+" : ""}${b1}=${k2}x${b2 >= 0 ? "+" : ""}${b2}，解得 x=${answer}。`,
    concepts: ["alg_graphing", "alg_functions", "alg_linear_equations"],
    skills: ["line_intersection", "linear_equation_solving"],
    patterns: ["equal_outputs", "systems_intuition"],
    misconceptions: ["intercept_difference_error", "equation_setup_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-intersection",
    chapterTitle: "八年级：一次函数交点",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_linear_intersection_x",
    cognitiveTags: ["symbolic_fluency", "structure_recognition"],
    hint1: "交点表示两个函数在同一个 x 下有相同的 y。",
    hint2: "令两个表达式相等，解一元一次方程。",
    commonMistake: "直接用两个截距相减作为横坐标。",
    variantIdea: "继续求交点的纵坐标。"
  });
}

function coordinateMidpointDraft(i: number): Draft {
  const data = [
    [2, 4, 8, 10, "(5,7)"],
    [-4, 6, 2, 12, "(-1,9)"],
    [1, -3, 7, 5, "(4,1)"],
    [-6, -2, 4, 8, "(-1,3)"],
    [0, 5, 10, -1, "(5,2)"],
    [-8, 1, -2, 9, "(-5,5)"]
  ];
  const [x1, y1, x2, y2, answer] = data[i % data.length];
  return baseDraft({
    statement: `点 A(${x1},${y1})，点 B(${x2},${y2})，线段 AB 的中点坐标是多少？`,
    answer,
    wrongs: [`(${Number(x1) + Number(x2)},${Number(y1) + Number(y2)})`, `(${x1},${y2})`, `(${x2},${y1})`, `(${(Number(x2) - Number(x1)) / 2},${(Number(y2) - Number(y1)) / 2})`],
    solution: `中点坐标等于两个端点坐标分别求平均，所以中点为 ${answer}。`,
    concepts: ["geo_coordinate_geometry", "alg_graphing"],
    skills: ["coordinate_midpoint", "average_coordinates"],
    patterns: ["midpoint_formula", "coordinate_average"],
    misconceptions: ["sum_not_average_error", "coordinate_order_error"],
    theme: "平面直角坐标系",
    chapter: "cn-junior-g8-coordinate-midpoint",
    chapterTitle: "八年级：坐标中点",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_coordinate_midpoint",
    cognitiveTags: ["spatial_reasoning", "fluency_precision"],
    hint1: "中点的横坐标是两个横坐标的平均数。",
    hint2: "中点的纵坐标是两个纵坐标的平均数。",
    commonMistake: "把两个坐标直接相加，没有除以 2。",
    variantIdea: "给出一个端点和中点，反求另一个端点。"
  });
}

function similarityMissingSideDraft(i: number): Draft {
  const data = [
    [4, 10, 6, 15],
    [5, 20, 7, 28],
    [6, 15, 8, 20],
    [3, 12, 5, 20],
    [8, 18, 12, 27],
    [7, 21, 9, 27]
  ];
  const [smallKnown, largeKnown, smallTarget, answer] = data[i % data.length];
  return baseDraft({
    statement: `两个三角形相似。小三角形一边长为 ${smallKnown}，对应的大三角形边长为 ${largeKnown}。若小三角形另一边长为 ${smallTarget}，则大三角形对应边长是多少？`,
    answer,
    wrongs: [largeKnown + smallTarget, smallTarget + (largeKnown - smallKnown), Math.round((smallTarget * smallKnown) / largeKnown), answer + smallKnown],
    solution: `相似比为 ${largeKnown}:${smallKnown}，所以对应边长为 ${smallTarget}×${largeKnown}÷${smallKnown}=${answer}。`,
    concepts: ["geo_similarity", "arith_proportions", "geo_triangles"],
    skills: ["similarity_ratio", "missing_side"],
    patterns: ["proportion_equation", "scale_factor"],
    misconceptions: ["additive_scaling_error", "inverse_ratio_error"],
    theme: "相似三角形",
    chapter: "cn-junior-g8-similarity-missing-side",
    chapterTitle: "八年级：相似三角形边长反求",
    difficulty: i < 3 ? 4 : 5,
    layer: i < 3 ? "Honors" : "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_similarity_missing_side",
    cognitiveTags: ["multiplicative_reasoning", "inverse_operations"],
    hint1: "先用一组对应边求出相似比。",
    hint2: "再把这个相似比应用到另一组对应边。",
    commonMistake: "把边长差当成固定差值，忽略相似比。",
    variantIdea: "给出大图形边长，反求小图形对应边。"
  });
}

function twoStepAngleDraft(i: number): Draft {
  const data = [
    [48, 62, 70],
    [35, 85, 60],
    [44, 71, 65],
    [52, 58, 70],
    [66, 49, 65],
    [39, 76, 65]
  ];
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `三角形中两个内角分别为 ${a}° 和 ${b}°，过第三个顶点作一条与其中一边平行的直线。由平行线角关系可得目标角等于第三个内角，目标角是多少度？`,
    answer,
    wrongs: [a + b, 180 - a, 180 - b, answer + 10],
    solution: `先求第三个内角：180°-${a}°-${b}°=${answer}°。平行线产生的对应角相等，所以目标角也是 ${answer}°。`,
    concepts: ["geo_angles", "geo_triangle_angles", "geo_triangles"],
    skills: ["angle_chasing", "triangle_angle_sum"],
    patterns: ["two_step_angle", "parallel_line_transfer"],
    misconceptions: ["skip_triangle_sum_error", "parallel_angle_mismatch"],
    theme: "几何基础",
    chapter: "cn-junior-g8-two-step-angles",
    chapterTitle: "八年级：三角形与平行线角度追踪",
    difficulty: 4,
    layer: "Honors",
    stage: "Bridge",
    problemType: "cn_two_step_angle_chasing",
    cognitiveTags: ["geometric_reasoning", "relation_selection"],
    hint1: "先用三角形内角和求出缺少的角。",
    hint2: "再用平行线中的对应角或内错角关系转移角度。",
    commonMistake: "只看平行线关系，忘记先求三角形中的第三个角。",
    variantIdea: "把其中一个角设为未知数，建立方程求角度。"
  });
}

function pointOnLineDraft(i: number): Draft {
  const data = [
    [2, 1, 3, 7, "是"],
    [3, -2, 4, 10, "是"],
    [-1, 6, 5, 1, "是"],
    [4, -3, 2, 6, "否"],
    [-2, 8, 3, 1, "否"],
    [5, 1, 1, 7, "否"]
  ];
  const [k, b, x, y, answer] = data[i % data.length];
  const expected = Number(k) * Number(x) + Number(b);
  return baseDraft({
    statement: `判断点 (${x},${y}) 是否在直线 y=${k}x${Number(b) >= 0 ? "+" : ""}${b} 上。`,
    answer,
    wrongs: [answer === "是" ? "否" : "是", "无法判断", "只看横坐标即可", "只看纵坐标即可"],
    solution: `把 x=${x} 代入直线方程，得到 y=${k}×${x}${Number(b) >= 0 ? "+" : ""}${b}=${expected}。与点的纵坐标 ${y} 比较，所以答案是“${answer}”。`,
    concepts: ["alg_graphing", "alg_functions", "prealg_substitution"],
    skills: ["point_on_line", "function_evaluation"],
    patterns: ["graph_membership", "input_output_check"],
    misconceptions: ["substitution_error", "coordinate_order_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-point-on-line",
    chapterTitle: "八年级：点与一次函数图像",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_point_on_line",
    cognitiveTags: ["input_output_mapping", "symbol_evaluation"],
    hint1: "点在直线上，说明点的坐标满足方程。",
    hint2: "把横坐标代入，比较算出的 y 和点的纵坐标。",
    commonMistake: "只看横坐标或只看纵坐标，没有代入函数式验证。",
    variantIdea: "给出未知的纵坐标，求使点在直线上的值。"
  });
}

function linearModelingInverseDraft(i: number): Draft {
  const data = [
    [12, 3, 30, 6],
    [8, 4, 40, 8],
    [15, 5, 45, 6],
    [20, 6, 56, 6],
    [6, 7, 41, 5],
    [10, 8, 66, 7]
  ];
  const [start, rate, target, answer] = data[i % data.length];
  return baseDraft({
    statement: `某水箱原有 ${start} 升水，每分钟增加 ${rate} 升。若水箱中共有 ${target} 升水，需要多少分钟？`,
    answer,
    wrongs: [Math.round(target / rate), target - start, answer + 1, Math.round((target + start) / rate)],
    solution: `设需要 x 分钟，${start}+${rate}x=${target}，所以 ${rate}x=${target - start}，x=${answer}。`,
    concepts: ["alg_functions", "alg_linear_equations", "prealg_word_to_equation"],
    skills: ["linear_modeling_inverse", "equation_solving"],
    patterns: ["target_value_model", "solve_time_from_rate"],
    misconceptions: ["missing_initial_value", "division_setup_error"],
    theme: "一次函数初步",
    chapter: "cn-junior-g8-linear-modeling-inverse",
    chapterTitle: "八年级：一次函数应用反求",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_linear_modeling_inverse",
    cognitiveTags: ["modeling", "inverse_operations"],
    hint1: "先写出总量=初始量+变化量×时间。",
    hint2: "把目标总量代入，再解时间。",
    commonMistake: "直接用目标总量除以每分钟增加量，忘记先减去初始量。",
    variantIdea: "给出时间和目标，反求每分钟增加量。"
  });
}

function coordinateTriangleAreaDraft(i: number): Draft {
  const data = [
    [0, 0, 8, 0, 0, 6, 24],
    [1, 2, 7, 2, 1, 10, 24],
    [-3, 1, 5, 1, -3, 7, 24],
    [2, -1, 10, -1, 2, 5, 24],
    [-4, -2, 2, -2, -4, 8, 30],
    [3, 1, 11, 1, 3, 9, 32]
  ];
  const [x1, y1, x2, y2, x3, y3, answer] = data[i % data.length];
  const base = Math.abs(Number(x2) - Number(x1));
  const height = Math.abs(Number(y3) - Number(y1));
  return baseDraft({
    statement: `坐标平面内三角形三个顶点为 A(${x1},${y1})，B(${x2},${y2})，C(${x3},${y3})。若 AB 水平，三角形面积是多少？`,
    answer,
    wrongs: [base * height, base + height, answer + base, Math.abs(base - height)],
    solution: `AB 的长为 ${base}，C 到 AB 的高为 ${height}，面积为 ${base}×${height}÷2=${answer}。`,
    concepts: ["geo_coordinate_geometry", "geo_area", "geo_triangles"],
    skills: ["coordinate_area", "triangle_area"],
    patterns: ["base_height_on_coordinate_plane", "geometry_measurement"],
    misconceptions: ["missing_half_factor", "coordinate_distance_error"],
    theme: "平面直角坐标系",
    chapter: "cn-junior-g8-coordinate-area",
    chapterTitle: "八年级：坐标三角形面积",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_coordinate_triangle_area",
    cognitiveTags: ["spatial_reasoning", "formula_selection"],
    hint1: "先从坐标中读出水平底边长度。",
    hint2: "再找第三点到底边所在直线的垂直距离。",
    commonMistake: "算出底乘高后忘记除以 2。",
    variantIdea: "给出面积和两个点，反求第三点可能的纵坐标。"
  });
}

function pythagoreanConverseDraft(i: number): Draft {
  const data = [
    [6, 8, 10, "是"],
    [5, 12, 13, "是"],
    [7, 24, 25, "是"],
    [8, 15, 18, "否"],
    [9, 12, 14, "否"],
    [10, 11, 15, "否"]
  ];
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `三条边长分别为 ${a}、${b}、${c} 的三角形是否为直角三角形？`,
    answer,
    wrongs: [answer === "是" ? "否" : "是", "无法判断", "只看最长边即可", "只看两短边之和即可"],
    solution: `检验最大边 ${c} 是否满足 ${a}^2+${b}^2=${c}^2。计算后可判断答案为“${answer}”。`,
    concepts: ["geo_pythagorean", "geo_triangles"],
    skills: ["pythagorean_converse", "square_fluency"],
    patterns: ["right_triangle_check", "converse_theorem"],
    misconceptions: ["largest_side_error", "add_lengths_error"],
    theme: "直角三角形",
    chapter: "cn-junior-g8-pythagorean-converse",
    chapterTitle: "八年级：勾股定理逆定理",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_pythagorean_converse",
    cognitiveTags: ["formula_selection", "constraint_reasoning"],
    hint1: "先确定最长边，把它当作可能的斜边。",
    hint2: "比较两条较短边平方和与最长边平方。",
    commonMistake: "没有先找最长边，或只比较边长和。",
    variantIdea: "给出含未知数的一边，求能构成直角三角形的值。"
  });
}

function quadraticVertexDraft(i: number): Draft {
  const data = [
    [1, -4, 3, 2],
    [1, -6, 5, 3],
    [2, -8, 1, 2],
    [1, 2, -8, -1],
    [2, 4, -3, -1],
    [1, -10, 7, 5]
  ];
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `二次函数 y=${a}x^2${Number(b) >= 0 ? "+" : ""}${b}x${Number(c) >= 0 ? "+" : ""}${c} 的对称轴是 x 等于多少？`,
    answer,
    wrongs: [-answer, Number(b), Number(c), answer + 1],
    solution: `二次函数 y=ax^2+bx+c 的对称轴为 x=-b/(2a)。这里 a=${a}，b=${b}，所以 x=${answer}。`,
    concepts: ["alg_quadratics", "alg_functions"],
    skills: ["quadratic_axis", "formula_application"],
    patterns: ["quadratic_vertex_form", "axis_of_symmetry"],
    misconceptions: ["sign_error", "coefficient_confusion"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-axis",
    chapterTitle: "九年级：二次函数对称轴",
    difficulty: i < 3 ? 4 : 5,
    layer: i < 3 ? "Honors" : "AMC8",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_axis",
    cognitiveTags: ["formula_selection", "symbolic_fluency"],
    hint1: "先确定二次项系数 a 和一次项系数 b。",
    hint2: "对称轴公式是 x=-b/(2a)。",
    commonMistake: "漏掉负号，或把常数项 c 当成 b。",
    variantIdea: "进一步代入对称轴求顶点纵坐标。"
  });
}

function quadraticRootsDraft(i: number): Draft {
  const data = [
    [2, 5, "2或5"],
    [3, 7, "3或7"],
    [-1, 4, "-1或4"],
    [-2, 6, "-2或6"],
    [1, 8, "1或8"],
    [-3, 5, "-3或5"]
  ];
  const [r1, r2, answer] = data[i % data.length];
  const root1 = Number(r1);
  const root2 = Number(r2);
  const sum = root1 + root2;
  const product = root1 * root2;
  return baseDraft({
    statement: `方程 x^2${-sum >= 0 ? "+" : ""}${-sum}x${product >= 0 ? "+" : ""}${product}=0 的两个根是多少？`,
    answer,
    wrongs: [`${-root1}或${-root2}`, String(sum), String(product), `${root1 + 1}或${root2 + 1}`],
    solution: `该方程可分解为 (x-${root1})(x-${root2})=0，所以 x=${root1} 或 x=${root2}。`,
    concepts: ["alg_quadratics", "alg_factoring"],
    skills: ["quadratic_factoring", "zero_product_property"],
    patterns: ["factor_to_roots", "quadratic_solving"],
    misconceptions: ["sign_error", "sum_product_confusion"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-roots",
    chapterTitle: "九年级：二次方程因式分解",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_factored_roots",
    cognitiveTags: ["factor_structure", "symbolic_fluency"],
    hint1: "观察常数项和一次项系数，寻找两个数的和与积。",
    hint2: "分解后用零乘积性质求根。",
    commonMistake: "分解后把根的符号写反。",
    variantIdea: "给出两个根，反写二次方程。"
  });
}

function circleArcAngleDraft(i: number): Draft {
  const data = [
    [80, 40],
    [100, 50],
    [120, 60],
    [140, 70],
    [160, 80],
    [70, 35]
  ];
  const [arc, answer] = data[i % data.length];
  return baseDraft({
    statement: `圆中一条弧的度数为 ${arc}°，它所对的圆周角是多少度？`,
    answer,
    wrongs: [arc, 180 - arc, answer + 10, Math.max(1, answer - 10)],
    solution: `同弧所对圆周角等于弧度数的一半，所以圆周角为 ${arc}°÷2=${answer}°。`,
    concepts: ["geo_circles", "geo_angles"],
    skills: ["inscribed_angle", "angle_relationship"],
    patterns: ["arc_to_inscribed_angle", "circle_angle"],
    misconceptions: ["central_inscribed_confusion", "half_angle_error"],
    theme: "圆",
    chapter: "cn-junior-g9-circle-inscribed-angle",
    chapterTitle: "九年级：圆周角与弧",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_inscribed_angle",
    cognitiveTags: ["geometric_reasoning", "relation_selection"],
    hint1: "圆周角和它所对的弧之间有一半关系。",
    hint2: "圆周角等于弧度数除以 2。",
    commonMistake: "把圆周角直接等于弧度数。",
    variantIdea: "给出圆周角，反求所对弧的度数。"
  });
}

function circleAreaDraft(i: number): Draft {
  const radii = [3, 4, 5, 6, 7, 8];
  const r = radii[i % radii.length];
  const answer = `${r * r}π`;
  return baseDraft({
    statement: `半径为 ${r} 的圆，面积是多少？`,
    answer,
    wrongs: [`${2 * r}π`, `${r}π`, `${2 * r * r}π`, String(r * r)],
    solution: `圆面积公式为 S=πr^2。半径 r=${r}，所以面积为 ${r * r}π。`,
    concepts: ["geo_circles", "geo_area"],
    skills: ["circle_area", "formula_application"],
    patterns: ["area_formula", "circle_measurement"],
    misconceptions: ["circumference_area_confusion", "missing_square_error"],
    theme: "圆",
    chapter: "cn-junior-g9-circle-area",
    chapterTitle: "九年级：圆的面积",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_circle_area",
    cognitiveTags: ["formula_selection", "fluency_precision"],
    hint1: "圆面积用半径的平方。",
    hint2: "公式是 S=πr^2，不是 2πr。",
    commonMistake: "把周长公式 2πr 当成面积公式。",
    variantIdea: "给出面积，反求半径。"
  });
}

function probabilitySimpleDraft(i: number): Draft {
  const data = [
    [3, 5, "3/8"],
    [4, 6, "2/5"],
    [2, 7, "2/9"],
    [5, 5, "1/2"],
    [6, 9, "2/5"],
    [1, 4, "1/5"]
  ];
  const [target, other, answer] = data[i % data.length];
  const total = Number(target) + Number(other);
  return baseDraft({
    statement: `袋中有 ${target} 个红球和 ${other} 个蓝球，随机摸出 1 个球，摸到红球的概率是多少？`,
    answer,
    wrongs: [`${other}/${total}`, `${target}/${other}`, `${target}/${target}`, `${total}/${target}`],
    solution: `总球数为 ${target}+${other}=${total}，红球有 ${target} 个，所以概率为 ${target}/${total}，化简得 ${answer}。`,
    concepts: ["counting_probability", "arith_fractions"],
    skills: ["simple_probability", "fraction_simplification"],
    patterns: ["favorable_over_total", "single_draw_probability"],
    misconceptions: ["part_over_other_part_error", "denominator_error"],
    theme: "概率统计",
    chapter: "cn-junior-g9-probability-basic",
    chapterTitle: "九年级：简单概率",
    difficulty: 3,
    layer: "Standard",
    stage: "AMC8 Transfer",
    problemType: "cn_simple_probability",
    cognitiveTags: ["operation_selection", "fraction_reasoning"],
    hint1: "概率等于有利结果数除以总结果数。",
    hint2: "总数包括红球和蓝球。",
    commonMistake: "用红球数除以蓝球数，而不是除以总球数。",
    variantIdea: "改成不放回摸两次，练习乘法原理。"
  });
}

function statisticsMeanMedianDraft(i: number): Draft {
  const data = [
    [[4, 6, 8, 10, 12], 8],
    [[3, 5, 7, 9, 11], 7],
    [[2, 6, 6, 8, 13], 7],
    [[5, 5, 10, 10, 15], 9],
    [[1, 4, 7, 10, 13], 7],
    [[6, 8, 8, 9, 14], 9]
  ] as const;
  const [values, answer] = data[i % data.length];
  return baseDraft({
    statement: `一组数据为 ${values.join("，")}，这组数据的平均数是多少？`,
    answer,
    wrongs: [values[2], answer + 1, answer - 1, values[0] + values[values.length - 1]],
    solution: `平均数等于总和除以个数。这组数据总和为 ${values.reduce((sum, value) => sum + value, 0)}，共有 ${values.length} 个数，所以平均数为 ${answer}。`,
    concepts: ["stats_mean", "arith_natural_numbers"],
    skills: ["mean_calculation", "arithmetic_fluency"],
    patterns: ["sum_divide_count", "data_summary"],
    misconceptions: ["median_mean_confusion", "sum_without_dividing"],
    theme: "概率统计",
    chapter: "cn-junior-g9-statistics-mean",
    chapterTitle: "九年级：平均数",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_statistics_mean",
    cognitiveTags: ["fluency_precision", "data_reasoning"],
    hint1: "先把所有数据相加。",
    hint2: "再除以数据个数。",
    commonMistake: "把中位数当作平均数，或只求总和不除以个数。",
    variantIdea: "给出平均数和部分数据，反求缺失数据。"
  });
}

function quadraticMinimumDraft(i: number): Draft {
  const data = [
    [1, 2, -3],
    [2, -1, 4],
    [1, -3, 2],
    [3, 1, -5],
    [2, 4, 1],
    [1, -2, -6]
  ];
  const [a, h, k] = data[i % data.length];
  return baseDraft({
    statement: `二次函数 y=${a}(x${Number(h) >= 0 ? "-" : "+"}${Math.abs(Number(h))})^2${Number(k) >= 0 ? "+" : ""}${k} 的最小值是多少？`,
    answer: k,
    wrongs: [h, a, Number(k) + Number(a), -Number(k)],
    solution: `函数写成顶点式 y=a(x-h)^2+k，且 a=${a}>0，所以最小值为 k=${k}。`,
    concepts: ["alg_quadratics", "alg_functions"],
    skills: ["quadratic_vertex_form", "minimum_value"],
    patterns: ["vertex_form_minimum", "quadratic_graph"],
    misconceptions: ["vertex_coordinate_confusion", "coefficient_as_minimum"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-minimum",
    chapterTitle: "九年级：二次函数最值",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_minimum_value",
    cognitiveTags: ["structure_recognition", "symbolic_fluency"],
    hint1: "观察二次函数是否已经写成顶点式。",
    hint2: "当 a>0 时，顶点的纵坐标就是最小值。",
    commonMistake: "把顶点横坐标或二次项系数当成最小值。",
    variantIdea: "把 a 改成负数，判断最大值。"
  });
}

function quadraticTranslationDraft(i: number): Draft {
  const data = [
    [2, 3, "向右2个单位，向上3个单位"],
    [-1, 4, "向左1个单位，向上4个单位"],
    [3, -2, "向右3个单位，向下2个单位"],
    [-2, -5, "向左2个单位，向下5个单位"],
    [4, 1, "向右4个单位，向上1个单位"],
    [-3, 2, "向左3个单位，向上2个单位"]
  ];
  const [h, k, answer] = data[i % data.length];
  return baseDraft({
    statement: `函数 y=(x${Number(h) >= 0 ? "-" : "+"}${Math.abs(Number(h))})^2${Number(k) >= 0 ? "+" : ""}${k} 可由 y=x^2 怎样平移得到？`,
    answer,
    wrongs: [
      `向${Number(h) >= 0 ? "左" : "右"}${Math.abs(Number(h))}个单位，向${Number(k) >= 0 ? "上" : "下"}${Math.abs(Number(k))}个单位`,
      `向${Number(h) >= 0 ? "右" : "左"}${Math.abs(Number(h))}个单位，向${Number(k) >= 0 ? "下" : "上"}${Math.abs(Number(k))}个单位`,
      `只向${Number(h) >= 0 ? "右" : "左"}${Math.abs(Number(h))}个单位`,
      `只向${Number(k) >= 0 ? "上" : "下"}${Math.abs(Number(k))}个单位`
    ],
    solution: `顶点式 y=(x-h)^2+k 表示由 y=x^2 平移到顶点 (${h},${k})，所以答案为“${answer}”。`,
    concepts: ["alg_quadratics", "alg_graphing", "alg_functions"],
    skills: ["quadratic_translation", "vertex_interpretation"],
    patterns: ["graph_transformation", "vertex_form"],
    misconceptions: ["horizontal_shift_sign_error", "vertical_shift_error"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-translation",
    chapterTitle: "九年级：二次函数图像平移",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_translation",
    cognitiveTags: ["spatial_reasoning", "structure_recognition"],
    hint1: "顶点式中的 x-h 表示水平方向移动。",
    hint2: "括号外的 +k 表示竖直方向移动。",
    commonMistake: "把 x-h 的方向看反。",
    variantIdea: "给出平移方式，反写函数解析式。"
  });
}

function similarityAreaRatioDraft(i: number): Draft {
  const data = [
    [2, 3, "4:9"],
    [3, 5, "9:25"],
    [4, 7, "16:49"],
    [5, 6, "25:36"],
    [1, 4, "1:16"],
    [2, 5, "4:25"]
  ];
  const [a, b, answer] = data[i % data.length];
  return baseDraft({
    statement: `两个相似图形的对应边长比为 ${a}:${b}，它们的面积比是多少？`,
    answer,
    wrongs: [`${a}:${b}`, `${b}:${a}`, `${Number(a) + Number(b)}:${Number(b) * 2}`, `${Number(a) * 2}:${Number(b) * 2}`],
    solution: `相似图形面积比等于边长比的平方，所以面积比为 ${a}^2:${b}^2=${answer}。`,
    concepts: ["geo_similarity", "geo_area", "arith_proportions"],
    skills: ["similarity_area_ratio", "square_ratio"],
    patterns: ["scale_factor_squared", "area_similarity"],
    misconceptions: ["linear_area_ratio_error", "ratio_order_error"],
    theme: "相似三角形",
    chapter: "cn-junior-g9-similarity-area-ratio",
    chapterTitle: "九年级：相似图形面积比",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_similarity_area_ratio",
    cognitiveTags: ["multiplicative_reasoning", "structure_recognition"],
    hint1: "面积是二维量，比例会平方。",
    hint2: "把边长比的两个数分别平方。",
    commonMistake: "直接把边长比当作面积比。",
    variantIdea: "给出面积比，反求边长比。"
  });
}

function circleTangentRadiusDraft(i: number): Draft {
  const data = [
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
    [7, 24, 25],
    [9, 12, 15],
    [10, 24, 26]
  ];
  const [radius, tangent, answer] = data[i % data.length];
  return baseDraft({
    statement: `从圆外一点 P 作圆的切线 PA，A 为切点。已知半径 OA=${radius}，切线 PA=${tangent}，则 OP 的长是多少？`,
    answer,
    wrongs: [Number(radius) + Number(tangent), Math.abs(Number(tangent) - Number(radius)), answer + 1, Number(tangent)],
    solution: `半径垂直于切线，所以 △OAP 是直角三角形。OP=√(${radius}^2+${tangent}^2)=${answer}。`,
    concepts: ["geo_circles", "geo_pythagorean", "geo_triangles"],
    skills: ["tangent_radius_perpendicular", "pythagorean_theorem"],
    patterns: ["circle_tangent_right_triangle", "geometry_synthesis"],
    misconceptions: ["tangent_radius_relation_error", "add_lengths_error"],
    theme: "圆",
    chapter: "cn-junior-g9-circle-tangent",
    chapterTitle: "九年级：圆的切线与半径",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_tangent_radius",
    cognitiveTags: ["geometric_reasoning", "formula_selection"],
    hint1: "切点处的半径与切线垂直。",
    hint2: "把 OA 和 PA 看成直角三角形的两条直角边。",
    commonMistake: "直接把半径和切线长相加。",
    variantIdea: "给出 OP 和半径，反求切线长。"
  });
}

function probabilityComplementDraft(i: number): Draft {
  const data = [
    ["1/5", "4/5"],
    ["2/7", "5/7"],
    ["3/10", "7/10"],
    ["1/4", "3/4"],
    ["5/12", "7/12"],
    ["2/9", "7/9"]
  ];
  const [eventProbability, answer] = data[i % data.length];
  return baseDraft({
    statement: `某事件发生的概率为 ${eventProbability}，它不发生的概率是多少？`,
    answer,
    wrongs: [eventProbability, "1", "0", `${eventProbability}+1`],
    solution: `事件不发生的概率是补事件概率，等于 1-${eventProbability}=${answer}。`,
    concepts: ["counting_probability", "arith_fractions"],
    skills: ["complement_probability", "fraction_subtraction"],
    patterns: ["one_minus_probability", "event_complement"],
    misconceptions: ["complement_confusion", "fraction_subtraction_error"],
    theme: "概率统计",
    chapter: "cn-junior-g9-probability-complement",
    chapterTitle: "九年级：补事件概率",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_probability_complement",
    cognitiveTags: ["operation_selection", "fraction_reasoning"],
    hint1: "事件发生和不发生构成全部情况。",
    hint2: "用 1 减去事件发生的概率。",
    commonMistake: "把不发生的概率仍写成原概率。",
    variantIdea: "给出不发生概率，反求发生概率。"
  });
}

function statisticsRangeMedianDraft(i: number): Draft {
  const data = [
    [[2, 5, 7, 9, 14], 12],
    [[3, 4, 8, 11, 15], 12],
    [[1, 6, 6, 10, 13], 12],
    [[5, 7, 12, 16, 20], 15],
    [[4, 4, 9, 13, 18], 14],
    [[6, 8, 10, 14, 21], 15]
  ] as const;
  const [values, answer] = data[i % data.length];
  const median = values[Math.floor(values.length / 2)];
  return baseDraft({
    statement: `一组数据为 ${values.join("，")}，这组数据的极差是多少？`,
    answer,
    wrongs: [median, values[0] + values[values.length - 1], answer + 1, answer - 1],
    solution: `极差等于最大值减最小值，所以极差为 ${values[values.length - 1]}-${values[0]}=${answer}。`,
    concepts: ["stats_range", "stats_median"],
    skills: ["range_calculation", "data_reading"],
    patterns: ["max_minus_min", "data_summary"],
    misconceptions: ["range_median_confusion", "sum_endpoints_error"],
    theme: "概率统计",
    chapter: "cn-junior-g9-statistics-range",
    chapterTitle: "九年级：极差与中位数辨析",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_statistics_range",
    cognitiveTags: ["data_reasoning", "fluency_precision"],
    hint1: "先找到这组数据中的最大值和最小值。",
    hint2: "极差是最大值减最小值。",
    commonMistake: "把中位数当成极差。",
    variantIdea: "给出极差和部分数据，反推可能的最大值。"
  });
}

function quadraticDiscriminantDraft(i: number): Draft {
  const data = [
    [1, -5, 6, 1],
    [1, -4, 4, 0],
    [2, 3, 5, -31],
    [1, 2, -3, 16],
    [3, -6, 3, 0],
    [2, -7, 3, 25]
  ];
  const [a, b, c, answer] = data[i % data.length];
  return baseDraft({
    statement: `一元二次方程 ${a}x^2${Number(b) >= 0 ? "+" : ""}${b}x${Number(c) >= 0 ? "+" : ""}${c}=0 的判别式 Δ 的值是多少？`,
    answer,
    wrongs: [Number(b) * Number(b) + 4 * Number(a) * Number(c), Number(b) - 4 * Number(a) * Number(c), -Number(answer), Number(answer) + 4],
    solution: `判别式 Δ=b^2-4ac=${b}^2-4×${a}×${c}=${answer}。`,
    concepts: ["alg_quadratics", "alg_functions"],
    skills: ["quadratic_discriminant", "formula_application"],
    patterns: ["discriminant", "quadratic_roots_structure"],
    misconceptions: ["discriminant_sign_error", "coefficient_confusion"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-discriminant",
    chapterTitle: "九年级：一元二次方程判别式",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_discriminant",
    cognitiveTags: ["formula_selection", "symbolic_fluency"],
    hint1: "先找出 a、b、c。",
    hint2: "判别式公式是 Δ=b^2-4ac。",
    commonMistake: "把减号写成加号，或把 b 当成常数项。",
    variantIdea: "根据 Δ 判断方程实根个数。"
  });
}

function quadraticApplicationDraft(i: number): Draft {
  const data = [
    [12, 3, 36],
    [16, 4, 64],
    [20, 5, 100],
    [10, 2, 20],
    [18, 6, 108],
    [14, 7, 98]
  ];
  const [width, height, answer] = data[i % data.length];
  return baseDraft({
    statement: `一个矩形花坛一边靠墙，另外三边用 ${width + 2 * height} 米篱笆围成。若垂直墙的边长为 ${height} 米，则花坛面积是多少平方米？`,
    answer,
    wrongs: [width + height, (width + 2 * height) * height, answer + height, width * 2 + height],
    solution: `靠墙时篱笆只围三边，另一条平行墙的边长为 ${width} 米。面积=${width}×${height}=${answer}。`,
    concepts: ["alg_quadratics", "geo_area", "prealg_word_to_equation"],
    skills: ["quadratic_modeling", "area_model"],
    patterns: ["rectangle_fence_model", "optimization_readiness"],
    misconceptions: ["perimeter_area_confusion", "missing_wall_constraint"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-modeling",
    chapterTitle: "九年级：二次函数应用模型",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_quadratic_area_model",
    cognitiveTags: ["modeling", "operation_selection"],
    hint1: "靠墙的一边不需要篱笆。",
    hint2: "先求平行墙的边长，再算面积。",
    commonMistake: "把篱笆总长直接乘以高，混淆周长和面积。",
    variantIdea: "把垂直墙边长设为 x，写出面积表达式。"
  });
}

function circleArcLengthDraft(i: number): Draft {
  const data = [
    [6, 60, "2π"],
    [9, 120, "6π"],
    [12, 90, "6π"],
    [8, 180, "8π"],
    [10, 72, "4π"],
    [15, 144, "12π"]
  ];
  const [r, degree, answer] = data[i % data.length];
  return baseDraft({
    statement: `半径为 ${r} 的圆中，圆心角为 ${degree}° 的弧长是多少？`,
    answer,
    wrongs: [`${2 * Number(r)}π`, `${Number(r) * Number(r)}π`, `${Number(r)}π`, String(Number(degree) / 2)],
    solution: `弧长=圆周长×圆心角/360°=2π×${r}×${degree}/360=${answer}。`,
    concepts: ["geo_arc_length", "geo_circles"],
    skills: ["arc_length", "fraction_of_circumference"],
    patterns: ["sector_fraction", "circle_measurement"],
    misconceptions: ["circumference_full_circle_error", "degree_fraction_error"],
    theme: "圆",
    chapter: "cn-junior-g9-arc-length",
    chapterTitle: "九年级：弧长",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_arc_length",
    cognitiveTags: ["formula_selection", "fraction_reasoning"],
    hint1: "先求完整圆的周长。",
    hint2: "弧长只占整个圆周长的 圆心角/360。",
    commonMistake: "直接使用完整圆周长，没有乘角度比例。",
    variantIdea: "给出弧长和半径，反求圆心角。"
  });
}

function circleChordDistanceDraft(i: number): Draft {
  const data = [
    [5, 6, 4],
    [13, 10, 12],
    [10, 12, 8],
    [17, 16, 15],
    [15, 18, 12],
    [25, 14, 24]
  ];
  const [radius, chord, answer] = data[i % data.length];
  const halfChord = Number(chord) / 2;
  return baseDraft({
    statement: `圆的半径为 ${radius}，一条弦长为 ${chord}。圆心到这条弦的距离是多少？`,
    answer,
    wrongs: [halfChord, Number(radius) - halfChord, Number(answer) + 1, Number(radius) + halfChord],
    solution: `圆心到弦的垂线平分弦，半弦长为 ${halfChord}。由勾股定理，距离为 √(${radius}^2-${halfChord}^2)=${answer}。`,
    concepts: ["geo_circles", "geo_pythagorean"],
    skills: ["chord_distance", "pythagorean_theorem"],
    patterns: ["radius_chord_right_triangle", "circle_geometry"],
    misconceptions: ["forget_half_chord", "subtract_lengths_error"],
    theme: "圆",
    chapter: "cn-junior-g9-chord-distance",
    chapterTitle: "九年级：垂径定理与弦",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_chord_distance",
    cognitiveTags: ["geometric_reasoning", "formula_selection"],
    hint1: "圆心到弦的垂线会平分弦。",
    hint2: "半径、半弦和圆心到弦的距离组成直角三角形。",
    commonMistake: "直接用整条弦长进入勾股定理。",
    variantIdea: "给出圆心到弦距离和半径，反求弦长。"
  });
}

function similarityApplicationDraft(i: number): Draft {
  const data = [
    [2, 6, 3, 9],
    [3, 12, 4, 16],
    [4, 10, 6, 15],
    [5, 20, 7, 28],
    [6, 18, 8, 24],
    [7, 21, 5, 15]
  ];
  const [shadowSmall, shadowLarge, heightSmall, answer] = data[i % data.length];
  return baseDraft({
    statement: `同一时刻，一根 ${heightSmall} 米高的竹竿影长 ${shadowSmall} 米，一棵树影长 ${shadowLarge} 米。树高是多少米？`,
    answer,
    wrongs: [Number(shadowLarge) - Number(shadowSmall) + Number(heightSmall), Number(shadowLarge) + Number(heightSmall), Math.round((Number(heightSmall) * Number(shadowSmall)) / Number(shadowLarge)), Number(answer) + 2],
    solution: `同一时刻太阳光形成相似三角形，高与影长成比例。树高=${heightSmall}×${shadowLarge}÷${shadowSmall}=${answer}。`,
    concepts: ["geo_similarity", "arith_proportions"],
    skills: ["similarity_application", "proportional_reasoning"],
    patterns: ["shadow_similarity", "real_world_ratio"],
    misconceptions: ["additive_scaling_error", "inverse_ratio_error"],
    theme: "相似三角形",
    chapter: "cn-junior-g9-similarity-application",
    chapterTitle: "九年级：相似三角形实际应用",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_similarity_shadow_application",
    cognitiveTags: ["modeling", "multiplicative_reasoning"],
    hint1: "同一时刻的物体高度和影长成比例。",
    hint2: "用竹竿的高影比建立比例式。",
    commonMistake: "把影长差当成高度差。",
    variantIdea: "给出树高和树影，反求竹竿影长。"
  });
}

function probabilityTwoStepDraft(i: number): Draft {
  const data = [
    [2, 3, "1/3"],
    [3, 4, "3/7"],
    [1, 5, "1/6"],
    [4, 6, "2/5"],
    [2, 6, "1/4"],
    [5, 5, "1/2"]
  ];
  const [red, blue, answer] = data[i % data.length];
  const redCount = Number(red);
  const blueCount = Number(blue);
  const total = redCount + blueCount;
  return baseDraft({
    statement: `袋中有 ${red} 个红球和 ${blue} 个蓝球，先随机摸出 1 个球后放回，再随机摸 1 个球。第一次摸到红球的概率是多少？`,
    answer,
    wrongs: [`${blueCount}/${total}`, `${redCount}/${blueCount}`, `${redCount}/${total * total}`, `${redCount * 2}/${total}`],
    solution: `题目只问第一次摸到红球，放回与第二次不影响第一次。概率为 ${red}/${total}，化简得 ${answer}。`,
    concepts: ["counting_probability", "arith_fractions"],
    skills: ["probability_reading", "event_scope"],
    patterns: ["single_event_in_multi_step_context", "favorable_over_total"],
    misconceptions: ["unneeded_second_step_error", "denominator_error"],
    theme: "概率统计",
    chapter: "cn-junior-g9-probability-two-step",
    chapterTitle: "九年级：多步情境概率辨析",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_probability_two_step_scope",
    cognitiveTags: ["operation_selection", "probabilistic_reasoning"],
    hint1: "先看清题目问的是哪一次、哪个事件。",
    hint2: "如果只问第一次，第二次信息不用参与计算。",
    commonMistake: "看到两次摸球就把概率平方或乘起来。",
    variantIdea: "改成求两次都摸到红球的概率。"
  });
}

function quadraticXInterceptCountDraft(i: number): Draft {
  const data = [
    [1, -5, 6, "两个"],
    [1, -4, 4, "一个"],
    [2, 3, 5, "没有"],
    [1, 2, -3, "两个"],
    [3, -6, 3, "一个"],
    [2, -7, 3, "两个"]
  ];
  const [a, b, c, answer] = data[i % data.length];
  const delta = Number(b) * Number(b) - 4 * Number(a) * Number(c);
  return baseDraft({
    statement: `二次函数 y=${a}x^2${Number(b) >= 0 ? "+" : ""}${b}x${Number(c) >= 0 ? "+" : ""}${c} 的图像与 x 轴有几个交点？`,
    answer,
    wrongs: ["两个", "一个", "没有", String(delta)].filter((value) => value !== answer),
    solution: `图像与 x 轴交点个数由 Δ=b^2-4ac 判断。这里 Δ=${delta}，所以交点个数为“${answer}”。`,
    concepts: ["alg_quadratics", "alg_graphing"],
    skills: ["discriminant_interpretation", "graph_intercepts"],
    patterns: ["roots_to_graph_intersections", "quadratic_graph"],
    misconceptions: ["discriminant_interpretation_error", "graph_root_confusion"],
    theme: "二次函数",
    chapter: "cn-junior-g9-quadratic-x-intercepts",
    chapterTitle: "九年级：二次函数与 x 轴交点",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_quadratic_x_intercept_count",
    cognitiveTags: ["structure_recognition", "graph_reasoning"],
    hint1: "与 x 轴交点对应方程 y=0 的实根。",
    hint2: "用判别式判断实根个数。",
    commonMistake: "只看开口方向，不判断判别式。",
    variantIdea: "给出交点个数，反推参数范围。"
  });
}

function quadraticRectangleModelDraft(i: number): Draft {
  const data = [
    [20, 4, 64],
    [24, 5, 95],
    [18, 3, 45],
    [30, 6, 144],
    [22, 4, 56],
    [28, 7, 147]
  ];
  const [perimeter, width, answer] = data[i % data.length];
  const length = Number(perimeter) / 2 - Number(width);
  return baseDraft({
    statement: `一个矩形周长为 ${perimeter}，宽为 ${width}，它的面积是多少？`,
    answer,
    wrongs: [Number(perimeter) * Number(width), Number(perimeter) + Number(width), Number(answer) + Number(width), Number(length) + Number(width)],
    solution: `矩形周长 2(长+宽)=${perimeter}，所以长=${perimeter}/2-${width}=${length}。面积=${length}×${width}=${answer}。`,
    concepts: ["geo_area", "alg_quadratics", "alg_linear_equations"],
    skills: ["area_model", "perimeter_to_dimension"],
    patterns: ["rectangle_model", "optimization_readiness"],
    misconceptions: ["perimeter_area_confusion", "half_perimeter_error"],
    theme: "二次函数",
    chapter: "cn-junior-g9-rectangle-area-model",
    chapterTitle: "九年级：面积模型与二次函数准备",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_rectangle_area_model",
    cognitiveTags: ["modeling", "operation_selection"],
    hint1: "周长给出的是两倍的长加宽。",
    hint2: "先求长，再求面积。",
    commonMistake: "直接用周长乘宽。",
    variantIdea: "设宽为 x，写出面积关于 x 的表达式。"
  });
}

function circleSectorAreaDraft(i: number): Draft {
  const data = [
    [6, 60, "6π"],
    [8, 90, "16π"],
    [10, 72, "20π"],
    [12, 120, "48π"],
    [9, 80, "18π"],
    [15, 144, "90π"]
  ];
  const [r, degree, answer] = data[i % data.length];
  return baseDraft({
    statement: `半径为 ${r} 的圆中，圆心角为 ${degree}° 的扇形面积是多少？`,
    answer,
    wrongs: [`${Number(r) * Number(r)}π`, `${2 * Number(r)}π`, `${Number(r)}π`, String(Number(degree) / 2)],
    solution: `扇形面积=圆面积×圆心角/360°=π×${r}^2×${degree}/360=${answer}。`,
    concepts: ["geo_circles", "geo_area"],
    skills: ["sector_area", "fraction_of_circle_area"],
    patterns: ["sector_fraction", "circle_area"],
    misconceptions: ["arc_length_sector_area_confusion", "degree_fraction_error"],
    theme: "圆",
    chapter: "cn-junior-g9-sector-area",
    chapterTitle: "九年级：扇形面积",
    difficulty: 5,
    layer: "AMC8",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_sector_area",
    cognitiveTags: ["formula_selection", "fraction_reasoning"],
    hint1: "扇形面积是整个圆面积的一部分。",
    hint2: "比例是圆心角除以 360°。",
    commonMistake: "把弧长公式当成扇形面积公式。",
    variantIdea: "给出扇形面积和半径，反求圆心角。"
  });
}

function circleSimilarityDraft(i: number): Draft {
  const data = [
    [3, 9, "1:3"],
    [4, 12, "1:3"],
    [5, 10, "1:2"],
    [6, 18, "1:3"],
    [7, 21, "1:3"],
    [8, 20, "2:5"]
  ];
  const [r1, r2, answer] = data[i % data.length];
  const radius1 = Number(r1);
  const radius2 = Number(r2);
  return baseDraft({
    statement: `两个圆的半径分别为 ${r1} 和 ${r2}，它们的周长比是多少？`,
    answer,
    wrongs: [`${radius1 * radius1}:${radius2 * radius2}`, `${radius2}:${radius1}`, `${radius1 + radius2}:${radius2}`, `${radius1}:${radius2 * 2}`],
    solution: `圆周长 C=2πr，周长比等于半径比，所以为 ${answer}。`,
    concepts: ["geo_circles", "arith_proportions"],
    skills: ["circle_scale_ratio", "proportional_reasoning"],
    patterns: ["radius_to_circumference_ratio", "similar_circles"],
    misconceptions: ["area_circumference_ratio_confusion", "ratio_order_error"],
    theme: "圆",
    chapter: "cn-junior-g9-circle-ratio",
    chapterTitle: "九年级：圆的比例关系",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_circle_circumference_ratio",
    cognitiveTags: ["multiplicative_reasoning", "structure_recognition"],
    hint1: "圆周长和半径成正比。",
    hint2: "周长比就是半径比。",
    commonMistake: "把周长比误写成半径平方比。",
    variantIdea: "改问面积比，比较两种关系。"
  });
}

function probabilityExpectedCountDraft(i: number): Draft {
  const data = [
    ["1/4", 40, 10],
    ["1/5", 50, 10],
    ["3/10", 60, 18],
    ["2/5", 80, 32],
    ["1/3", 90, 30],
    ["3/8", 64, 24]
  ];
  const [probability, trials, answer] = data[i % data.length];
  return baseDraft({
    statement: `某事件发生的概率为 ${probability}，重复试验 ${trials} 次，预计大约发生多少次？`,
    answer,
    wrongs: [trials, Number(answer) + 5, Number(answer) - 5, Number(trials) - Number(answer)],
    solution: `预计次数=概率×试验次数，所以约为 ${probability}×${trials}=${answer} 次。`,
    concepts: ["counting_probability", "arith_fractions"],
    skills: ["expected_count", "fraction_multiplication"],
    patterns: ["probability_times_trials", "expected_frequency"],
    misconceptions: ["probability_vs_count_confusion", "complement_count_error"],
    theme: "概率统计",
    chapter: "cn-junior-g9-expected-count",
    chapterTitle: "九年级：概率与频数估计",
    difficulty: 4,
    layer: "Honors",
    stage: "AMC8 Transfer",
    problemType: "cn_probability_expected_count",
    cognitiveTags: ["multiplicative_reasoning", "data_reasoning"],
    hint1: "概率可以看成长期频率的估计。",
    hint2: "用概率乘以总次数。",
    commonMistake: "把概率当作次数，或算成不发生的次数。",
    variantIdea: "给出预计次数和总次数，反求概率。"
  });
}

function statisticsMissingValueDraft(i: number): Draft {
  const data = [
    [[6, 8, 10, 12], 10, 14],
    [[3, 5, 7, 9], 7, 11],
    [[4, 6, 8, 10], 8, 12],
    [[2, 8, 10, 15], 9, 10],
    [[5, 7, 11, 13], 10, 14],
    [[1, 6, 9, 14], 8, 10]
  ] as const;
  const [known, mean, answer] = data[i % data.length];
  const sumKnown = known.reduce((sum, value) => sum + value, 0);
  return baseDraft({
    statement: `5 个数的平均数为 ${mean}，其中 4 个数为 ${known.join("，")}，第 5 个数是多少？`,
    answer,
    wrongs: [mean, sumKnown, answer + 2, Math.max(0, answer - 2)],
    solution: `5 个数总和为 ${mean}×5=${Number(mean) * 5}。已知 4 个数和为 ${sumKnown}，所以第 5 个数为 ${Number(mean) * 5}-${sumKnown}=${answer}。`,
    concepts: ["stats_mean", "alg_linear_equations"],
    skills: ["missing_value_from_mean", "linear_equation_solving"],
    patterns: ["mean_total_relationship", "data_inverse_problem"],
    misconceptions: ["mean_as_missing_value", "forget_total_count"],
    theme: "概率统计",
    chapter: "cn-junior-g9-statistics-missing-value",
    chapterTitle: "九年级：平均数反求",
    difficulty: 4,
    layer: "Honors",
    stage: "Algebra Readiness",
    problemType: "cn_statistics_missing_value",
    cognitiveTags: ["inverse_operations", "data_reasoning"],
    hint1: "平均数乘以个数得到总和。",
    hint2: "用总和减去已知四个数的和。",
    commonMistake: "直接把平均数当成缺失值。",
    variantIdea: "给出缺失值范围，判断平均数可能范围。"
  });
}

function baseDraft(input: Omit<Draft, "answer" | "wrongs"> & { answer: string | number; wrongs: Array<string | number> }): Draft {
  return {
    ...input,
    answer: normalizeAnswer(String(input.answer)),
    wrongs: input.wrongs.map((wrong) => normalizeAnswer(String(wrong)))
  };
}

function mapDraft(id: string, draft: Draft, block: CleanedBlock, index: number) {
  const choices = buildChoices(String(draft.answer), draft.wrongs.map(String), index);
  const problem: ProblemRow = {
    id,
    statement: latexText(draft.statement),
    answer: String(draft.answer),
    answer_type: "multiple_choice",
    choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
    difficulty: String(draft.difficulty),
    concepts: draft.concepts.join(";"),
    skills: draft.skills.join(";"),
    patterns: draft.patterns.join(";"),
    misconceptions: draft.misconceptions.join(";"),
    solution: latexText(draft.solution),
    course: "CN Junior High Math",
    theme: draft.theme,
    chapter: draft.chapter,
    chapter_title: draft.chapterTitle,
    sequence: String(CONFIG.sequenceBase + index),
    source_collection: CONFIG.sourceCollection,
    source_file: `${block.sourceFile}; block=${block.id}; pages=${block.pageStart}-${block.pageEnd}; lesson=${block.lessonNo ?? "unknown"}; column=${block.cleanedColumn}`,
    taxonomy_layer: draft.layer,
    taxonomy_stage: draft.stage,
    problem_type: draft.problemType,
    cognitive_tags: draft.cognitiveTags.join(";"),
    estimated_time_seconds: String(70 + Math.max(0, draft.difficulty - 1) * 20),
    notes: `${CONFIG.gradeLabel} junior-high pilot item generated from cleaned OCR coverage signals. Original-equivalent project-native content; no full textbook exercise text is reproduced.`,
    language: "zh",
    curriculum_system: "CN",
    region: "CN",
    display_track: "中文校内",
    grade_band: "初中",
    content_status: "pilot"
  };

  const distractors = choices
    .filter((choice) => normalize(choice.value) !== normalize(problem.answer))
    .map((choice): DistractorRow => ({
      problem_id: id,
      choice_label: choice.label,
      value: choice.value,
      misconception: inferMisconception(draft.problemType),
      cognitive_tag: draft.cognitiveTags[0] ?? "general_reasoning",
      explanation: `这个选项通常来自${formatMisconception(inferMisconception(draft.problemType))}。`
    }));

  const explanation: ExplanationRow = {
    problem_id: id,
    hint_1: latexText(draft.hint1),
    hint_2: latexText(draft.hint2),
    step_by_step: latexText(`Step 1: ${draft.hint1} Step 2: ${draft.solution} Step 3: 得到答案 ${problem.answer}。`),
    common_mistake: latexText(draft.commonMistake),
    why_correct: latexText(`答案 ${problem.answer} 正确。${draft.solution}`),
    variant_idea: latexText(draft.variantIdea)
  };

  return { problem, distractors, explanation };
}

function renderReport(problems: ProblemRow[], blocks: CleanedBlock[]) {
  return [
    `# Jian Zi Sheng ${CONFIG.gradeLabel} Junior ${CONFIG.label}`,
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Source collection: ${CONFIG.sourceCollection}`,
    `Problems: ${problems.length}`,
    "",
    "## Policy",
    "",
    "- This is a small pilot generated from cleaned OCR coverage signals.",
    "- Items are project-native original-equivalent problems and should be reviewed before larger junior-high imports.",
    "- Source block ids are retained for QA traceability; OCR problem text is not promoted directly.",
    "",
    "## Distribution",
    "",
    ...Object.entries(countBy(problems, (problem) => problem.chapter_title)).map(([chapter, count]) => `- ${chapter}: ${count}`),
    "",
    "## Source Blocks",
    "",
    ...blocks.map((block) => `- ${block.id}: pages ${block.pageStart}-${block.pageEnd}, lesson ${block.lessonNo ?? "unknown"}, ${block.cleanedColumn}, candidates ${block.questionCandidates.length}`),
    ""
  ].join("\n");
}

function buildChoices(answer: string, wrongs: string[], variant: number) {
  const values = unique([answer, ...wrongs]).slice(0, 5);
  while (values.length < 5) values.push(fallbackWrong(answer, values.length));
  const rotated = rotate(values, variant % values.length);
  if (!rotated.some((value) => normalize(value) === normalize(answer))) rotated[0] = answer;
  return rotated.slice(0, 5).map((value, index) => ({ label: String.fromCharCode(65 + index), value }));
}

function fallbackWrong(answer: string, offset: number) {
  const numeric = Number(answer);
  if (Number.isFinite(numeric)) return normalizeAnswer(String(numeric + offset + 1));
  if (answer.includes(",")) return answer.replace(")", `+${offset + 1})`);
  return `${answer}+${offset + 1}`;
}

function inferMisconception(problemType: string) {
  if (problemType.includes("circle") && problemType.includes("angle")) return "circle_angle_relation_error";
  if (problemType.includes("circle") && problemType.includes("area")) return "circle_area_formula_error";
  if (problemType.includes("probability")) return "probability_denominator_error";
  if (problemType.includes("statistics")) return "mean_median_confusion";
  if (problemType.includes("quadratic")) return "quadratic_structure_error";
  if (problemType.includes("angle")) return "angle_sum_error";
  if (problemType.includes("congruence")) return "criterion_selection_error";
  if (problemType.includes("pythagorean")) return "formula_selection_error";
  if (problemType.includes("area")) return "area_formula_error";
  if (problemType.includes("coordinate")) return "coordinate_order_error";
  if (problemType.includes("slope")) return "rise_run_confusion";
  if (problemType.includes("modeling")) return "linear_modeling_error";
  if (problemType.includes("function")) return "substitution_error";
  return "constraint_reasoning_error";
}

function formatMisconception(value: string) {
  const labels: Record<string, string> = {
    angle_sum_error: "三角形角和关系使用错误",
    constraint_reasoning_error: "几何约束条件理解不完整",
    coordinate_order_error: "坐标顺序或方向判断错误",
    criterion_selection_error: "全等判定条件选择错误",
    formula_selection_error: "公式选择或代入错误",
    area_formula_error: "面积公式或单位关系使用错误",
    circle_angle_relation_error: "圆周角和弧度数关系理解错误",
    circle_area_formula_error: "圆面积公式和圆周长公式混淆",
    linear_modeling_error: "线性模型中的初始量和变化量区分错误",
    mean_median_confusion: "平均数和中位数概念混淆",
    probability_denominator_error: "概率分母没有使用总结果数",
    quadratic_structure_error: "二次式结构、符号或因式分解关系判断错误",
    rise_run_confusion: "斜率中纵向变化和横向变化顺序混淆",
    substitution_error: "代入和运算顺序错误"
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function latexText(value: string) {
  return value
    .replace(/(\d+)\^2/g, (_, base) => `$${base}^2$`)
    .replace(/(^|[^A-Za-z0-9$])([A-Za-z])=([-]?\d+)(?![A-Za-z])/g, (_, prefix, variable, number) => `${prefix}$${variable}=${number}$`)
    .replace(/y=([-\d]+)x([+-]\d+)/g, (_, k, b) => `$y=${k}x${b}$`)
    .replace(/(\d+)×(\d+)/g, (_, left, right) => `$${left} \\\\times ${right}$`);
}

function normalizeAnswer(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(6)));
  return value;
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

function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function getBatchConfig(batchId: string) {
  const configs = {
    pilot: {
      buildDrafts,
      grade: "grade8",
      gradeLabel: "Grade 8",
      idPrefix: "cn_jzs_jr_g8_pilot",
      label: "Pilot",
      outputSubdir: "grade8-pilot",
      sequenceBase: 22000,
      sourceBlockLimit: 24,
      sourceCollection: "jianzisheng_cn_junior_grade8_pilot_v0",
      sourceOffset: 0
    },
    batch2: {
      buildDrafts: buildBatch2Drafts,
      grade: "grade8",
      gradeLabel: "Grade 8",
      idPrefix: "cn_jzs_jr_g8_b2",
      label: "Batch 2",
      outputSubdir: "grade8-batch2",
      sequenceBase: 22100,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade8_batch2_v0",
      sourceOffset: 12
    },
    batch3: {
      buildDrafts: buildBatch3Drafts,
      grade: "grade8",
      gradeLabel: "Grade 8",
      idPrefix: "cn_jzs_jr_g8_b3",
      label: "Batch 3",
      outputSubdir: "grade8-batch3",
      sequenceBase: 22200,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade8_batch3_v0",
      sourceOffset: 24
    },
    batch4: {
      buildDrafts: buildBatch4Drafts,
      idPrefix: "cn_jzs_jr_g8_b4",
      grade: "grade8",
      gradeLabel: "Grade 8",
      label: "Batch 4",
      outputSubdir: "grade8-batch4",
      sequenceBase: 22300,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade8_batch4_v0",
      sourceOffset: 36
    },
    grade9Pilot: {
      buildDrafts: buildGrade9PilotDrafts,
      idPrefix: "cn_jzs_jr_g9_pilot",
      grade: "grade9",
      gradeLabel: "Grade 9",
      label: "Pilot",
      outputSubdir: "grade9-pilot",
      sequenceBase: 23000,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade9_pilot_v0",
      sourceOffset: 0
    },
    grade9Batch2: {
      buildDrafts: buildGrade9Batch2Drafts,
      idPrefix: "cn_jzs_jr_g9_b2",
      grade: "grade9",
      gradeLabel: "Grade 9",
      label: "Batch 2",
      outputSubdir: "grade9-batch2",
      sequenceBase: 23100,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade9_batch2_v0",
      sourceOffset: 18
    },
    grade9Batch3: {
      buildDrafts: buildGrade9Batch3Drafts,
      idPrefix: "cn_jzs_jr_g9_b3",
      grade: "grade9",
      gradeLabel: "Grade 9",
      label: "Batch 3",
      outputSubdir: "grade9-batch3",
      sequenceBase: 23200,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade9_batch3_v0",
      sourceOffset: 36
    },
    grade9Batch4: {
      buildDrafts: buildGrade9Batch4Drafts,
      idPrefix: "cn_jzs_jr_g9_b4",
      grade: "grade9",
      gradeLabel: "Grade 9",
      label: "Batch 4",
      outputSubdir: "grade9-batch4",
      sequenceBase: 23300,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade9_batch4_v0",
      sourceOffset: 48
    },
    grade7Batch1: {
      buildDrafts: buildGrade7Batch1Drafts,
      idPrefix: "cn_jzs_jr_g7_b1",
      grade: "grade7",
      gradeLabel: "Grade 7",
      label: "Batch 1",
      outputSubdir: "grade7-batch1",
      sequenceBase: 21000,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade7_batch1_v0",
      sourceOffset: 0
    },
    grade7Batch2: {
      buildDrafts: buildGrade7Batch2Drafts,
      idPrefix: "cn_jzs_jr_g7_b2",
      grade: "grade7",
      gradeLabel: "Grade 7",
      label: "Batch 2",
      outputSubdir: "grade7-batch2",
      sequenceBase: 21100,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade7_batch2_v0",
      sourceOffset: 12
    },
    grade7Batch3: {
      buildDrafts: buildGrade7Batch3Drafts,
      idPrefix: "cn_jzs_jr_g7_b3",
      grade: "grade7",
      gradeLabel: "Grade 7",
      label: "Batch 3",
      outputSubdir: "grade7-batch3",
      sequenceBase: 21200,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade7_batch3_v0",
      sourceOffset: 24
    },
    grade7Batch4: {
      buildDrafts: buildGrade7Batch4Drafts,
      idPrefix: "cn_jzs_jr_g7_b4",
      grade: "grade7",
      gradeLabel: "Grade 7",
      label: "Batch 4",
      outputSubdir: "grade7-batch4",
      sequenceBase: 21300,
      sourceBlockLimit: 36,
      sourceCollection: "jianzisheng_cn_junior_grade7_batch4_v0",
      sourceOffset: 27
    }
  } satisfies Record<
    string,
    {
      buildDrafts: () => Draft[];
      grade: string;
      gradeLabel: string;
      idPrefix: string;
      label: string;
      outputSubdir: string;
      sequenceBase: number;
      sourceBlockLimit: number;
      sourceCollection: string;
      sourceOffset: number;
    }
  >;

  const config = configs[batchId as keyof typeof configs];
  if (!config) throw new Error(`Unknown batch id: ${batchId}. Valid values: ${Object.keys(configs).join(", ")}`);
  return config;
}

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

main();
