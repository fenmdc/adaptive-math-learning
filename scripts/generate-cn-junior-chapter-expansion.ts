import fs from "fs";
import path from "path";
import type { Problem } from "../packages/adaptive-engine";

type ProblemRow = Record<string, string>;

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
  wrongs: Array<string | number>;
  statement: string;
  solution: string;
  hint1: string;
  hint2: string;
  commonMistake: string;
  variantIdea: string;
};

const APP_PROBLEMS_PATH = path.join(process.cwd(), "apps/web/data/problems.json");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12/junior/chapter-expansion-v1");
const SOURCE_COLLECTION = "jianzisheng_cn_junior_chapter_expansion_v1";
const TARGET_PER_CHAPTER = Number(readArg("--target") ?? "20");
const SEQUENCE_BASE = 24000;

function main() {
  const problems = readJson<Problem[]>(APP_PROBLEMS_PATH);
  const cnJunior = problems.filter(isCnJunior);
  const groups = groupBy(cnJunior, (problem) => chapterKey(problem));
  const rows: ProblemRow[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];
  const unsupported: Array<{ chapterTitle: string; problemType: string }> = [];

  [...groups.values()]
    .sort((a, b) => first(a).curriculum.sequence - first(b).curriculum.sequence || first(a).curriculum.chapterTitle.localeCompare(first(b).curriculum.chapterTitle, "zh-Hans-CN"))
    .forEach((items, chapterIndex) => {
      const template = first(items);
      const target = Math.max(0, TARGET_PER_CHAPTER - items.length);

      for (let localIndex = 0; localIndex < target; localIndex += 1) {
        const draft = buildDraft(template, localIndex, items.length);
        if (!draft) {
          unsupported.push({
            chapterTitle: template.curriculum.chapterTitle,
            problemType: template.taxonomy?.problemType ?? "unknown"
          });
          break;
        }

        const id = `${SOURCE_COLLECTION}_${slugify(template.curriculum.chapter)}_${String(localIndex + 1).padStart(3, "0")}`;
        const mapped = mapDraft(id, draft, template, chapterIndex, localIndex);
        rows.push(mapped.problem);
        distractors.push(...mapped.distractors);
        explanations.push(mapped.explanation);
      }
    });

  fs.mkdirSync(DATASET_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATASET_DIR, "problems.json"), `${JSON.stringify(rows, null, 2)}\n`);
  fs.writeFileSync(path.join(DATASET_DIR, "expansion-report.md"), renderReport(cnJunior, rows, unsupported));
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(rows));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log("CN junior chapter expansion staging");
  console.log(`- Target per chapter: ${TARGET_PER_CHAPTER}`);
  console.log(`- Existing CN junior problems: ${cnJunior.length}`);
  console.log(`- Generated problems: ${rows.length}`);
  console.log(`- Unsupported chapter templates: ${unsupported.length}`);
  console.log(`- Dataset: ${path.relative(process.cwd(), DATASET_DIR)}`);
  console.log("- Active staging CSVs now contain the chapter expansion batch only.");
}

function buildDraft(template: Problem, index: number, existingCount: number): Draft | null {
  const type = template.taxonomy?.problemType ?? "";
  const n = index + existingCount + 1;

  if (type.includes("integer_operation")) return integerOperation(n);
  if (type.includes("rational_number_order")) return rationalOrder(n);
  if (type.includes("absolute_value") || type.includes("number_line_distance")) return numberLineDistance(n);
  if (type.includes("signed_fraction") || type.includes("fraction")) return fractionOperation(n);
  if (type.includes("like_terms")) return likeTerms(n);
  if (type.includes("distributive") || type.includes("two_step_expression")) return distributive(n);
  if (type.includes("expression_evaluation") || type === "cn_function_evaluation") return expressionEvaluation(n);
  if (type.includes("linear_equation_word")) return linearEquationWord(n);
  if (type.includes("equation_with_parentheses")) return equationWithParentheses(n);
  if (type.includes("linear_equation") || type === "cn_linear_equation_solving") return linearEquation(n);
  if (type.includes("negative_coefficient_inequality")) return negativeInequality(n);
  if (type.includes("inequality_word")) return inequalityWord(n);
  if (type.includes("inequality_number_line")) return inequalityNumberLine(n);
  if (type.includes("linear_inequality")) return linearInequality(n);
  if (type.includes("proportion")) return proportionEquation(n);
  if (type.includes("perimeter_expression")) return perimeterExpression(n);
  if (type.includes("area_expression") || type.includes("rectangle_area_model")) return rectangleAreaExpression(n);
  if (type.includes("vertical_angle")) return verticalAngle(n);
  if (type.includes("supplementary_angle") || type.includes("angle_equation")) return angleEquation(n);
  if (type.includes("triangle_angle")) return triangleAngle(n);
  if (type.includes("triangle_inequality")) return triangleInequality(n);
  if (type.includes("triangle_area") || type.includes("coordinate_triangle_area")) return triangleArea(n);
  if (type.includes("congruence_criterion")) return congruenceCriterion(n);
  if (type.includes("congruence_corresponding_side")) return congruenceSide(n);
  if (type.includes("pythagorean_converse")) return pythagoreanConverse(n);
  if (type.includes("pythagorean") || type.includes("coordinate_pythagorean_distance")) return pythagorean(n);
  if (type.includes("coordinate_quadrant")) return coordinateQuadrant(n);
  if (type.includes("coordinate_translation")) return coordinateTranslation(n);
  if (type.includes("coordinate_midpoint")) return coordinateMidpoint(n);
  if (type.includes("point_on_line")) return pointOnLine(n);
  if (type.includes("linear_slope")) return linearSlope(n);
  if (type.includes("linear_intercept_from_point")) return linearIntercept(n);
  if (type.includes("linear_intersection")) return linearIntersection(n);
  if (type.includes("linear_solve_for_input") || type.includes("linear_modeling_inverse")) return linearInverse(n);
  if (type.includes("linear_modeling")) return linearModeling(n);
  if (type.includes("linear_function")) return linearFunction(n);
  if (type.includes("parallel_angle") || type.includes("two_step_angle")) return parallelAngle(n);
  if (type.includes("similarity_area_ratio")) return similarityAreaRatio(n);
  if (type.includes("similarity")) return similaritySide(n);
  if (type.includes("quadratic_discriminant") || type.includes("quadratic_x_intercept")) return quadraticDiscriminant(n);
  if (type.includes("quadratic_translation")) return quadraticTranslation(n);
  if (type.includes("quadratic_minimum") || type.includes("quadratic_axis")) return quadraticVertex(n);
  if (type.includes("quadratic") || type.includes("factorization")) return quadraticRoots(n);
  if (type.includes("circle_inscribed_angle")) return circleInscribedAngle(n);
  if (type.includes("circle_arc_length")) return circleArcLength(n);
  if (type.includes("circle_sector_area")) return sectorArea(n);
  if (type.includes("circle_area")) return circleArea(n);
  if (type.includes("circle_tangent") || type.includes("circle_chord")) return circleRightTriangle(n);
  if (type.includes("circle_circumference_ratio")) return circleRatio(n);
  if (type.includes("probability_expected")) return probabilityExpected(n);
  if (type.includes("probability_complement")) return probabilityComplement(n);
  if (type.includes("probability")) return probabilityBasic(n);
  if (type.includes("statistics_missing")) return statisticsMissing(n);
  if (type.includes("statistics_range")) return statisticsRange(n);
  if (type.includes("statistics") || type.includes("mean")) return statisticsMean(n);
  if (type.includes("geometry_ratio_angle")) return triangleAngle(n);

  return null;
}

function mapDraft(id: string, draft: Draft, template: Problem, chapterIndex: number, localIndex: number) {
  const answer = normalizeAnswer(String(draft.answer));
  const choices = buildChoices(answer, draft.wrongs.map((wrong) => normalizeAnswer(String(wrong))), localIndex);
  const problem: ProblemRow = {
    id,
    statement: draft.statement,
    answer,
    answer_type: "multiple_choice",
    choices: choices.map((choice) => `${choice.label}:${choice.value}`).join("|"),
    difficulty: String(template.difficulty || 3),
    concepts: template.concepts.join(";"),
    skills: template.skills.join(";"),
    patterns: template.patterns.join(";"),
    misconceptions: template.misconceptions.join(";"),
    solution: draft.solution,
    course: template.curriculum.course,
    theme: template.curriculum.theme,
    chapter: template.curriculum.chapter,
    chapter_title: template.curriculum.chapterTitle,
    sequence: String(SEQUENCE_BASE + chapterIndex * TARGET_PER_CHAPTER + localIndex),
    source_collection: SOURCE_COLLECTION,
    source_file: `local-ocr-derived: ${template.curriculum.sourceCollection}; chapter=${template.curriculum.chapter}; expansion=v1`,
    taxonomy_layer: template.taxonomy?.layer ?? "Standard",
    taxonomy_stage: template.taxonomy?.stage ?? "Bridge",
    problem_type: template.taxonomy?.problemType ?? "cn_junior_chapter_practice",
    cognitive_tags: (template.taxonomy?.cognitiveTags ?? ["fluency_precision"]).join(";"),
    estimated_time_seconds: String(template.taxonomy?.estimatedTimeSeconds ?? 90),
    notes: "Chapter-level expansion from existing cleaned Jian Zi Sheng junior OCR coverage signals. Project-native original-equivalent variants; no direct textbook exercise text is reproduced.",
    language: "zh",
    curriculum_system: "CN",
    region: "CN",
    display_track: "中文校内",
    grade_band: "初中",
    content_status: "production"
  };
  const distractors = choices
    .filter((choice) => normalize(choice.value) !== normalize(answer))
    .map((choice): DistractorRow => ({
      problem_id: id,
      choice_label: choice.label,
      value: choice.value,
      misconception: template.misconceptions[0] ?? "operation_error",
      cognitive_tag: template.taxonomy?.cognitiveTags?.[0] ?? "fluency_precision",
      explanation: `这个选项通常来自${formatMisconception(template.misconceptions[0] ?? "operation_error")}。`
    }));
  const explanation: ExplanationRow = {
    problem_id: id,
    hint_1: draft.hint1,
    hint_2: draft.hint2,
    step_by_step: `步骤 1：${draft.hint1} 步骤 2：${draft.solution} 步骤 3：得到答案 ${answer}。`,
    common_mistake: draft.commonMistake,
    why_correct: `答案 ${answer} 正确。${draft.solution}`,
    variant_idea: draft.variantIdea
  };

  return { distractors, explanation, problem };
}

function integerOperation(n: number): Draft {
  const a = -18 + (n % 13);
  const b = 7 + ((n * 5) % 19);
  const answer = a + b;
  return simple(`计算：${a}${b >= 0 ? "+" : ""}${b}，结果是多少？`, answer, [Math.abs(a) + Math.abs(b), -answer, a - b, answer + 2], `异号或同号有理数相加时，先判断符号，再处理绝对值，所以结果是 ${answer}。`, "先判断两个数的符号。", "注意负号和绝对值的关系。", "只把绝对值相加，忽略符号。");
}

function rationalOrder(n: number): Draft {
  const values = [-n - 3, -Math.floor(n / 2) - 1, n % 5, n + 2];
  const ordered = [...values].sort((a, b) => a - b);
  const answer = ordered.join("<");
  return simple(`把 ${values.join("，")} 按从小到大的顺序排列，正确的是哪一项？`, answer, [[...ordered].reverse().join("<"), `${ordered[1]}<${ordered[0]}<${ordered[2]}<${ordered[3]}`, `${ordered[0]}<${ordered[2]}<${ordered[1]}<${ordered[3]}`, values.join("<")], `在数轴上越靠左的数越小，所以顺序为 ${answer}。`, "把所有数放到数轴上比较。", "负数比较大小时，绝对值越大反而越小。", "只比较数字大小，忘记负号。");
}

function numberLineDistance(n: number): Draft {
  const a = -12 - (n % 8);
  const b = 3 + ((n * 3) % 14);
  const answer = Math.abs(b - a);
  return simple(`数轴上点 A 表示 ${a}，点 B 表示 ${b}，AB 的长度是多少？`, answer, [Math.abs(a) + Math.abs(b), a + b, answer + 1, Math.abs(answer - 2)], `数轴上两点距离等于差的绝对值：|${b}-${a}|=${answer}。`, "距离不考虑方向。", "用两个数差的绝对值。", "把两个数直接相加或得到负距离。");
}

function fractionOperation(n: number): Draft {
  const denominator = 6 + (n % 7);
  const a = 1 + (n % 4);
  const b = 1 + ((n * 2) % 4);
  const answer = simplifyFraction(a + b, denominator);
  return simple(`计算：${a}/${denominator}+${b}/${denominator}，结果是多少？`, answer, [`${a + b}/${denominator * 2}`, `${Math.abs(a - b)}/${denominator}`, `${a + b + 1}/${denominator}`, "1"], `同分母分数相加，分母不变，分子相加，得到 ${answer}。`, "先确认两个分数的分母相同。", "同分母相加只合并分子。", "把分母也相加。");
}

function likeTerms(n: number): Draft {
  const a = 2 + (n % 7);
  const b = -5 + (n % 9);
  const c = -4 + (n % 8);
  const coefficient = a + b;
  const answer = `${coefficient}x${c >= 0 ? "+" : ""}${c}`;
  return simple(`合并同类项：${a}x${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c}，结果是多少？`, answer, [`${coefficient + c}x`, `${a - b}x${c >= 0 ? "+" : ""}${c}`, `${coefficient}x`, `${a}x${b >= 0 ? "+" : ""}${b}x`], `只有含 x 的项可以合并，常数项保持不变，所以结果是 ${answer}。`, "先找同类项。", "只合并 x 项的系数。", "把常数项也合并进 x 的系数。");
}

function distributive(n: number): Draft {
  const a = [-4, -3, -2, 2, 3, 4, 5][n % 7];
  const b = -3 + (n % 7);
  const c = -5 + ((n * 2) % 11);
  const coefficient = a * b;
  const constant = a * c;
  const answer = `${coefficient}x${constant >= 0 ? "+" : ""}${constant}`;
  return simple(`化简：${a}(${b}x${c >= 0 ? "+" : ""}${c})，结果是多少？`, answer, [`${coefficient}x${c >= 0 ? "+" : ""}${c}`, `${a + b}x${constant >= 0 ? "+" : ""}${constant}`, `${coefficient}x`, `${constant}x${b >= 0 ? "+" : ""}${b}`], `用 ${a} 分别乘括号里的每一项，得到 ${coefficient}x 和 ${constant}，所以结果是 ${answer}。`, "括号外的数要乘括号里的每一项。", "注意负数相乘的符号。", "只乘第一项，漏乘常数项。");
}

function expressionEvaluation(n: number): Draft {
  const a = -4 + (n % 9);
  const b = -6 + ((n * 3) % 13);
  const x = -3 + (n % 8);
  const answer = a * x + b;
  return simple(`当 x=${x} 时，代数式 ${a}x${b >= 0 ? "+" : ""}${b} 的值是多少？`, answer, [a + x + b, a * x, answer + 2, -answer], `把 x=${x} 代入，得到 ${a}×${x}${b >= 0 ? "+" : ""}${b}=${answer}。`, "把 x 的值代入表达式。", "先乘法，再加减。", "把 ax 误算成 a+x。");
}

function linearEquation(n: number): Draft {
  const a = 2 + (n % 7);
  const x = 3 + (n % 9);
  const b = -8 + ((n * 5) % 17);
  const c = a * x + b;
  return simple(`解方程：${a}x${b >= 0 ? "+" : ""}${b}=${c}，x 的值是多少？`, x, [c - b, Math.round(c / a), x + 1, -x], `先移项得 ${a}x=${c - b}，再两边除以 ${a}，得到 x=${x}。`, "先把常数项移到另一边。", "再把 x 的系数化为 1。", "移项忘记变号。");
}

function equationWithParentheses(n: number): Draft {
  const a = 2 + (n % 5);
  const b = -4 + (n % 9);
  const x = 3 + (n % 8);
  const c = -5 + ((n * 2) % 11);
  const total = a * (x + b) + c;
  return simple(`解方程：${a}(x${b >= 0 ? "+" : ""}${b})${c >= 0 ? "+" : ""}${c}=${total}，x 的值是多少？`, x, [x + 1, x - 1, Math.round(total / a), -x], `先去括号或先移项都可以，化简后解得 x=${x}。`, "可以先去括号。", "括号外的数要乘括号内每一项。", "去括号时漏乘常数项。");
}

function linearEquationWord(n: number): Draft {
  const rate = 4 + (n % 8);
  const fixed = 2 + (n % 7);
  const answer = 5 + (n % 8);
  const total = rate * answer + fixed;
  return simple(`某活动门票每张 ${rate} 元，另需一次性服务费 ${fixed} 元。共花 ${total} 元，买了多少张票？`, answer, [Math.round(total / rate), total - fixed, answer + 1, answer - 1], `设买了 x 张票，列方程 ${rate}x+${fixed}=${total}，解得 x=${answer}。`, "先设未知数表示票数。", "总费用包括服务费和每张票费用。", "直接用总费用除以单价，忘记服务费。");
}

function linearInequality(n: number): Draft {
  const a = 2 + (n % 6);
  const threshold = 3 + (n % 7);
  const b = -5 + (n % 9);
  const c = a * threshold + b;
  return simple(`解不等式：${a}x${b >= 0 ? "+" : ""}${b}>${c}，正确结果是哪一项？`, `x>${threshold}`, [`x<${threshold}`, `x>${threshold - 1}`, `x<${threshold - 1}`, `x=${threshold}`], `先移项，再除以正数 ${a}，不等号方向不变，所以 x>${threshold}。`, "先像解方程一样移项。", "除以正数时不等号方向不变。", "把不等式当成等式或方向写反。");
}

function negativeInequality(n: number): Draft {
  const a = -(2 + (n % 6));
  const threshold = 3 + (n % 7);
  const b = -4 + (n % 9);
  const c = a * threshold + b;
  return simple(`解不等式：${a}x${b >= 0 ? "+" : ""}${b}<${c}，正确结果是哪一项？`, `x>${threshold}`, [`x<${threshold}`, `x>${threshold - 1}`, `x<${threshold - 1}`, `x=${threshold}`], `移项后两边除以负数 ${a}，不等号方向要改变，所以 x>${threshold}。`, "先移项。", "两边除以负数时，不等号方向必须改变。", "除以负数后没有改变不等号方向。");
}

function inequalityWord(n: number): Draft {
  const price = 4 + (n % 8);
  const fixed = 3 + (n % 7);
  const answer = 5 + (n % 8);
  const budget = price * answer + fixed + (n % price);
  return simple(`每本练习册 ${price} 元，另需运费 ${fixed} 元。总费用不超过 ${budget} 元，最多可以买几本？`, answer, [answer + 1, answer - 1, Math.floor(budget / price), answer + 2], `设买 x 本，列不等式 ${price}x+${fixed}≤${budget}，解得最多可以买 ${answer} 本。`, "不超过表示小于或等于。", "总费用包括固定运费和每本价格。", "忘记运费或把不等号方向写反。");
}

function inequalityNumberLine(n: number): Draft {
  const value = -4 + (n % 10);
  const forms = [
    [`x>${value}`, `空心圆在 ${value}，向右`],
    [`x<${value}`, `空心圆在 ${value}，向左`],
    [`x≥${value}`, `实心圆在 ${value}，向右`],
    [`x≤${value}`, `实心圆在 ${value}，向左`]
  ];
  const [ineq, answer] = forms[n % forms.length];
  return simple(`不等式 ${ineq} 在数轴上的表示是哪一种？`, answer, [`空心圆在 ${value}，向左`, `实心圆在 ${value}，向右`, `空心圆在 ${value}，向右`, `实心圆在 ${value}，向左`], `严格不等号用空心圆，含等号用实心圆；大于向右，小于向左。因此答案是“${answer}”。`, "先判断端点是否包含。", "大于向右，小于向左。", "空心圆、实心圆或方向用反。");
}

function proportionEquation(n: number): Draft {
  const a = 2 + (n % 7);
  const b = 3 + (n % 8);
  const c = b * (2 + (n % 6));
  const answer = (a * c) / b;
  return simple(`解比例：${a}:${b}=x:${c}，x 的值是多少？`, answer, [b * c / a, a + c, answer + 2, answer - 2], `把比例写成 ${a}/${b}=x/${c}，所以 x=${a}×${c}÷${b}=${answer}。`, "把比写成分数形式。", "对应位置要保持一致。", "把比例方向写反。");
}

function perimeterExpression(n: number): Draft {
  const a = 2 + (n % 6);
  const b = -4 + (n % 9);
  const width = 3 + (n % 8);
  const constant = 2 * (b + width);
  const answer = `${2 * a}x${constant >= 0 ? "+" : ""}${constant}`;
  return simple(`长方形的长为 ${a}x${b >= 0 ? "+" : ""}${b}，宽为 ${width}，它的周长是多少？`, answer, [`${a}x${b + width >= 0 ? "+" : ""}${b + width}`, `${a * width}x`, `${2 * a}x+${2 * width}`, `${constant}x`], `周长为 2(长+宽)，代入并化简得 ${answer}。`, "先写出长方形周长公式。", "把含 x 的长和常数宽代入后化简。", "把周长公式和面积公式混淆。");
}

function rectangleAreaExpression(n: number): Draft {
  const a = 2 + (n % 8);
  const width = 3 + (n % 9);
  const answer = `${a * width}x`;
  return simple(`长方形的长为 ${a}x，宽为 ${width}，面积是多少？`, answer, [`${a + width}x`, `${2 * a + 2 * width}x`, `${a}x+${width}`, String(a * width)], `面积=长×宽，所以 ${a}x×${width}=${answer}。`, "先回忆长方形面积公式。", "系数相乘，x 保留。", "把面积算成周长或漏写 x。");
}

function verticalAngle(n: number): Draft {
  const angle = 30 + ((n * 7) % 120);
  return simple(`两条直线相交，其中一个角为 ${angle}°，它的对顶角是多少度？`, angle, [180 - angle, 90 - angle, angle + 10, Math.max(1, angle - 10)], `对顶角相等，所以它的对顶角也是 ${angle}°。`, "先判断是否为对顶角。", "对顶角大小相等。", "把对顶角当成邻补角。");
}

function angleEquation(n: number): Draft {
  const a = 2 + (n % 6);
  const answer = 10 + (n % 18);
  const b = 5 + (n % 15);
  const other = 180 - (a * answer + b);
  return simple(`两个邻补角中，一个角为 ${a}x+${b} 度，另一个角为 ${other} 度。求 x。`, answer, [answer + 1, answer - 1, Math.round((180 - b) / a), -answer], `邻补角和为 180°，所以 ${a}x+${b}+${other}=180，解得 x=${answer}。`, "邻补角相加等于 180°。", "把两个角的表达式相加建立方程。", "把邻补角当成相等关系。");
}

function triangleAngle(n: number): Draft {
  const a = 35 + (n % 45);
  const b = 40 + ((n * 3) % 50);
  const answer = 180 - a - b;
  return simple(`三角形两个内角分别是 ${a}° 和 ${b}°，第三个内角是多少度？`, answer, [a + b, 180 - a, 180 - b, answer + 10], `三角形内角和为 180°，第三个角为 180°-${a}°-${b}°=${answer}°。`, "三角形三个内角和是 180°。", "用 180° 减去两个已知角。", "把两个已知角之和当成答案。");
}

function triangleInequality(n: number): Draft {
  const a = 4 + (n % 9);
  const b = 7 + ((n * 2) % 10);
  const low = Math.abs(a - b);
  const high = a + b;
  return simple(`三角形两边长分别为 ${a} 和 ${b}，第三边长为 x。下面哪个范围正确？`, `${low}<x<${high}`, [`x>${high}`, `x<${high}`, `${low}≤x≤${high}`, `x>${low}`], `第三边必须大于两边之差且小于两边之和，所以 ${low}<x<${high}。`, "第三边大于两边之差。", "第三边小于两边之和。", "只写一边限制或包含端点。");
}

function triangleArea(n: number): Draft {
  const base = 8 + (n % 12);
  const height = 5 + ((n * 2) % 10);
  const answer = (base * height) / 2;
  return simple(`三角形的底为 ${base}，高为 ${height}，面积是多少？`, answer, [base * height, base + height, answer + base, Math.abs(base - height)], `三角形面积=底×高÷2，所以面积为 ${base}×${height}÷2=${answer}。`, "三角形面积公式里有除以 2。", "先算底乘高，再取一半。", "漏掉除以 2。");
}

function congruenceCriterion(n: number): Draft {
  const cases = [["两边及其夹角对应相等", "SAS"], ["两角及其夹边对应相等", "ASA"], ["三边对应相等", "SSS"], ["直角三角形斜边和一条直角边对应相等", "HL"], ["两角及其中一角的对边对应相等", "AAS"]];
  const [condition, answer] = cases[n % cases.length];
  return simple(`判断三角形全等时，条件“${condition}”对应的判定方法是？`, answer, ["AAA", "SSA", "SAS", "ASA"].filter((x) => x !== answer), `“${condition}”对应 ${answer} 判定。`, "先判断条件包含边还是角。", "注意夹角、夹边等关键词。", "把 AAA 或 SSA 当作全等判定。");
}

function congruenceSide(n: number): Draft {
  const side = 6 + (n % 15);
  const cases = [["△ABC≌△DEF", "AB", "DE"], ["△ABC≌△DEF", "BC", "EF"], ["△PQR≌△XYZ", "PR", "XZ"], ["△LMN≌△RST", "MN", "ST"]];
  const [relation, known, target] = cases[n % cases.length];
  return simple(`已知 ${relation}，且 ${known}=${side}，则对应边 ${target} 的长是多少？`, side, [side + 1, side - 1, side * 2, Math.max(1, side - 3)], `全等三角形的对应边相等，所以 ${target}=${side}。`, "按全等符号中的字母顺序找对应顶点。", "对应边在全等三角形中长度相等。", "忽略全等符号中的对应顺序。");
}

function pythagorean(n: number): Draft {
  const triples = [[6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [7, 24, 25], [10, 24, 26]];
  const [a, b, c] = triples[n % triples.length];
  return simple(`直角三角形的斜边长为 ${c}，一条直角边长为 ${a}，另一条直角边长是多少？`, b, [c - a, a + c, b + 1, c], `由勾股定理，另一条直角边为 √(${c}^2-${a}^2)=${b}。`, "确认题目给的是斜边和一条直角边。", "用斜边平方减去已知直角边平方。", "直接用斜边减直角边。");
}

function pythagoreanConverse(n: number): Draft {
  const cases = [[6, 8, 10, "是"], [5, 12, 13, "是"], [8, 15, 18, "否"], [9, 12, 14, "否"], [7, 24, 25, "是"]];
  const [a, b, c, answer] = cases[n % cases.length];
  return simple(`三条边长分别为 ${a}、${b}、${c} 的三角形是否为直角三角形？`, answer, [answer === "是" ? "否" : "是", "无法判断", "只看最长边即可", "只看两短边之和即可"], `检验最大边是否满足 ${a}^2+${b}^2=${c}^2，可判断答案为“${answer}”。`, "先确定最长边。", "比较两短边平方和与最长边平方。", "没有先找最长边。");
}

function coordinateQuadrant(n: number): Draft {
  const cases = [[3, 5, "第一象限"], [-4, 6, "第二象限"], [-5, -2, "第三象限"], [7, -3, "第四象限"], [0, 8, "y轴上"], [-6, 0, "x轴上"]];
  const [x, y, answer] = cases[n % cases.length];
  return simple(`点 P(${x},${y}) 位于哪里？`, answer, ["第一象限", "第二象限", "第三象限", "第四象限", "x轴上", "y轴上"].filter((v) => v !== answer), `根据横坐标和纵坐标的符号判断，点 P 位于${answer}。`, "先看横坐标正负。", "如果坐标为 0，点在坐标轴上。", "把横纵坐标顺序看反。");
}

function coordinateTranslation(n: number): Draft {
  const x = -6 + (n % 13);
  const y = -4 + ((n * 2) % 11);
  const dx = -3 + (n % 7);
  const dy = -2 + ((n * 3) % 7);
  const answer = `(${x + dx},${y + dy})`;
  return simple(`点 A(${x},${y}) 平移向量 (${dx},${dy}) 后，得到点 A'。A' 的坐标是多少？`, answer, [`(${x - dx},${y + dy})`, `(${x + dx},${y - dy})`, `(${x + dy},${y + dx})`, `(${dx},${dy})`], `横坐标加 ${dx}，纵坐标加 ${dy}，所以 A'=${answer}。`, "横坐标负责左右变化。", "纵坐标负责上下变化。", "把横纵变化量写反。");
}

function coordinateMidpoint(n: number): Draft {
  const x1 = -8 + (n % 10);
  const y1 = -4 + ((n * 2) % 10);
  const x2 = x1 + 2 * (2 + (n % 5));
  const y2 = y1 + 2 * (3 + (n % 4));
  const answer = `(${(x1 + x2) / 2},${(y1 + y2) / 2})`;
  return simple(`点 A(${x1},${y1})，点 B(${x2},${y2})，线段 AB 的中点坐标是多少？`, answer, [`(${x1 + x2},${y1 + y2})`, `(${x1},${y2})`, `(${x2},${y1})`, `(${(x2 - x1) / 2},${(y2 - y1) / 2})`], `中点坐标等于两个端点坐标分别求平均，所以中点为 ${answer}。`, "中点横坐标是两个横坐标平均数。", "中点纵坐标是两个纵坐标平均数。", "直接相加没有除以 2。");
}

function pointOnLine(n: number): Draft {
  const k = [-3, -2, -1, 2, 3, 4][n % 6];
  const b = -5 + (n % 11);
  const x = -2 + (n % 8);
  const expected = k * x + b;
  const yes = n % 2 === 0;
  const y = yes ? expected : expected + 1;
  const answer = yes ? "是" : "否";
  return simple(`判断点 (${x},${y}) 是否在直线 y=${k}x${b >= 0 ? "+" : ""}${b} 上。`, answer, [answer === "是" ? "否" : "是", "无法判断", "只看横坐标即可", "只看纵坐标即可"], `把 x=${x} 代入直线方程，得到 y=${expected}。与点的纵坐标 ${y} 比较，所以答案是“${answer}”。`, "点在直线上说明坐标满足方程。", "把横坐标代入后比较纵坐标。", "只看一个坐标，没有代入验证。");
}

function linearFunction(n: number): Draft {
  const k = [-3, -2, 2, 3, 4, 5][n % 6];
  const b = -6 + ((n * 2) % 13);
  const x = -2 + (n % 9);
  const answer = k * x + b;
  return simple(`一次函数 y=${k}x${b >= 0 ? "+" : ""}${b}，当 x=${x} 时，y 的值是多少？`, answer, [k + x + b, k * x, answer + k, answer - b], `把 x=${x} 代入，得到 y=${k}×${x}${b >= 0 ? "+" : ""}${b}=${answer}。`, "把给定的 x 值代入函数式。", "先乘法，再加减。", "把 kx 误算成 k+x。");
}

function linearSlope(n: number): Draft {
  const x1 = -3 + (n % 6);
  const slope = [-2, -1, 2, 3, 4][n % 5];
  const dx = 2 + (n % 4);
  const y1 = -5 + (n % 11);
  const x2 = x1 + dx;
  const y2 = y1 + slope * dx;
  return simple(`一次函数图像经过点 (${x1},${y1}) 和 (${x2},${y2})，它的斜率是多少？`, slope, [y2 - y1, x2 - x1, slope + 1, -slope], `斜率 k=(y₂-y₁)/(x₂-x₁)=(${y2}-${y1})/(${x2}-${x1})=${slope}。`, "斜率是纵坐标变化量除以横坐标变化量。", "两个点的顺序要前后一致。", "把横向变化和纵向变化写反。");
}

function linearIntercept(n: number): Draft {
  const k = [-3, -2, 2, 3, 4][n % 5];
  const x = -2 + (n % 8);
  const b = -6 + ((n * 3) % 13);
  const y = k * x + b;
  return simple(`一次函数 y=${k}x+b 经过点 (${x},${y})，则 b 的值是多少？`, b, [y + k * x, y - x, b + k, -b], `把点 (${x},${y}) 代入 y=${k}x+b，得 ${y}=${k}×${x}+b，所以 b=${b}。`, "点在函数图像上，坐标满足函数式。", "把 x 和 y 同时代入，再解 b。", "只代入 x，忘记 y 坐标。");
}

function linearIntersection(n: number): Draft {
  const x = 2 + (n % 6);
  const k1 = [-2, -1, 2, 3, 4][n % 5];
  const k2 = k1 + (k1 > 0 ? -3 : 3);
  const b1 = -5 + (n % 10);
  const y = k1 * x + b1;
  const b2 = y - k2 * x;
  return simple(`两条直线 y=${k1}x${b1 >= 0 ? "+" : ""}${b1} 与 y=${k2}x${b2 >= 0 ? "+" : ""}${b2} 的交点横坐标是多少？`, x, [b2 - b1, k1 - k2, x + 1, -x], `交点处两个 y 值相等，令两个表达式相等可解得 x=${x}。`, "交点表示两个函数在同一个 x 下有相同 y。", "令两个表达式相等。", "直接用两个截距相减。");
}

function linearModeling(n: number): Draft {
  const start = 5 + (n % 20);
  const rate = 2 + (n % 8);
  const time = 3 + (n % 9);
  const answer = start + rate * time;
  return simple(`某水箱原有 ${start} 升水，每分钟增加 ${rate} 升。${time} 分钟后水箱中有多少升水？`, answer, [start + rate + time, rate * time, start * time + rate, answer + rate], `总量=初始量+每分钟增加量×时间，所以 ${start}+${rate}×${time}=${answer}。`, "区分初始量和每分钟变化量。", "总量等于初始量加变化量乘时间。", "忘记加初始量。");
}

function linearInverse(n: number): Draft {
  const start = 6 + (n % 18);
  const rate = 2 + (n % 8);
  const answer = 4 + (n % 8);
  const target = start + rate * answer;
  return simple(`某水箱原有 ${start} 升水，每分钟增加 ${rate} 升。若水箱中共有 ${target} 升水，需要多少分钟？`, answer, [Math.round(target / rate), target - start, answer + 1, Math.round((target + start) / rate)], `设需要 x 分钟，${start}+${rate}x=${target}，解得 x=${answer}。`, "先写出总量模型。", "把目标总量代入再解时间。", "直接用目标总量除以每分钟增加量。");
}

function parallelAngle(n: number): Draft {
  const given = 35 + ((n * 11) % 110);
  const equal = n % 2 === 0;
  const answer = equal ? given : 180 - given;
  return simple(`两条平行线被一条直线所截。若一个相关角为 ${given}°，目标角与它${equal ? "相等" : "互补"}，目标角是多少度？`, answer, [180 - answer, given, answer + 10, Math.max(1, answer - 10)], equal ? `对应角或内错角相等，所以目标角为 ${answer}°。` : `互补角和为 180°，所以目标角为 ${answer}°。`, "先判断角之间是相等还是互补。", "互补时用 180° 减去已知角。", "把互补角误当成相等角。");
}

function similaritySide(n: number): Draft {
  const small = 3 + (n % 7);
  const scale = 2 + (n % 4);
  const target = 4 + ((n * 2) % 9);
  const answer = target * scale;
  return simple(`两个三角形相似。小三角形一边长为 ${small}，对应的大三角形边长为 ${small * scale}。若小三角形另一边长为 ${target}，则大三角形对应边长是多少？`, answer, [target + small * scale, target + scale, Math.round(target / scale), answer + small], `相似比为 ${scale}，所以对应边为 ${target}×${scale}=${answer}。`, "先求两个三角形之间的放大倍数。", "相似图形对应边用同一个倍数变化。", "把边长差当作固定增加量。");
}

function similarityAreaRatio(n: number): Draft {
  const a = 2 + (n % 5);
  const b = a + 1 + (n % 4);
  const answer = `${a * a}:${b * b}`;
  return simple(`两个相似图形的对应边长比为 ${a}:${b}，它们的面积比是多少？`, answer, [`${a}:${b}`, `${b}:${a}`, `${2 * a}:${2 * b}`, `${a + b}:${b}`], `相似图形面积比等于边长比的平方，所以面积比为 ${answer}。`, "面积是二维量，比例会平方。", "把边长比的两个数分别平方。", "直接把边长比当面积比。");
}

function quadraticRoots(n: number): Draft {
  const r1 = -3 + (n % 7);
  const r2 = r1 + 3 + (n % 5);
  const sum = r1 + r2;
  const product = r1 * r2;
  const answer = `${r1}或${r2}`;
  return simple(`方程 x^2${-sum >= 0 ? "+" : ""}${-sum}x${product >= 0 ? "+" : ""}${product}=0 的两个根是多少？`, answer, [`${-r1}或${-r2}`, String(sum), String(product), `${r1 + 1}或${r2 + 1}`], `该方程可分解为 (x-${r1})(x-${r2})=0，所以 x=${r1} 或 x=${r2}。`, "寻找两个数的和与积。", "分解后用零乘积性质求根。", "把根的符号写反。");
}

function quadraticDiscriminant(n: number): Draft {
  const a = 1 + (n % 3);
  const b = -8 + (n % 17);
  const c = -5 + ((n * 2) % 11);
  const answer = b * b - 4 * a * c;
  return simple(`一元二次方程 ${a}x^2${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c}=0 的判别式 Δ 的值是多少？`, answer, [b * b + 4 * a * c, b - 4 * a * c, -answer, answer + 4], `判别式 $\\Delta=b^2-4ac=${b}^2-4\\times ${a}\\times ${c}=${answer}$。`, "先找出 a、b、c。", "判别式公式是 $\\Delta=b^2-4ac$。", "把减号写成加号。");
}

function quadraticVertex(n: number): Draft {
  const h = -3 + (n % 7);
  const k = -6 + ((n * 2) % 13);
  return simple(`二次函数 y=(x${h >= 0 ? "-" : "+"}${Math.abs(h)})^2${k >= 0 ? "+" : ""}${k} 的最小值是多少？`, k, [h, 1, k + 1, -k], `函数为顶点式，且开口向上，所以最小值为 ${k}。`, "观察是否为顶点式。", "开口向上时顶点纵坐标是最小值。", "把顶点横坐标当成最小值。");
}

function quadraticTranslation(n: number): Draft {
  const h = -4 + (n % 9);
  const k = -5 + ((n * 2) % 11);
  const answer = `向${h >= 0 ? "右" : "左"}${Math.abs(h)}个单位，向${k >= 0 ? "上" : "下"}${Math.abs(k)}个单位`;
  return simple(`函数 y=(x${h >= 0 ? "-" : "+"}${Math.abs(h)})^2${k >= 0 ? "+" : ""}${k} 可由 y=x^2 怎样平移得到？`, answer, [`向${h >= 0 ? "左" : "右"}${Math.abs(h)}个单位，向${k >= 0 ? "上" : "下"}${Math.abs(k)}个单位`, `向${h >= 0 ? "右" : "左"}${Math.abs(h)}个单位，向${k >= 0 ? "下" : "上"}${Math.abs(k)}个单位`, `只向右${Math.abs(h)}个单位`, `只向上${Math.abs(k)}个单位`], `顶点式表示顶点为 (${h},${k})，所以答案为“${answer}”。`, "顶点式中的 x-h 表示水平移动。", "括号外的 +k 表示竖直移动。", "把 x-h 的方向看反。");
}

function circleInscribedAngle(n: number): Draft {
  const arc = 60 + ((n * 10) % 240);
  const answer = arc / 2;
  return simple(`圆中一条弧的度数为 ${arc}°，它所对的圆周角是多少度？`, answer, [arc, 180 - arc, answer + 10, Math.max(1, answer - 10)], `同弧所对圆周角等于弧度数的一半，所以为 ${answer}°。`, "圆周角和所对弧有一半关系。", "用弧度数除以 2。", "把圆周角直接等于弧度数。");
}

function circleArea(n: number): Draft {
  const r = 3 + (n % 10);
  return simple(`半径为 ${r} 的圆，面积是多少？`, `${r * r}π`, [`${2 * r}π`, `${r}π`, `${2 * r * r}π`, String(r * r)], `圆面积公式为 S=πr^2，所以面积为 ${r * r}π。`, "圆面积用半径的平方。", "公式是 S=πr^2。", "把周长公式当成面积公式。");
}

function circleArcLength(n: number): Draft {
  const r = 4 + (n % 9);
  const degree = [60, 90, 120, 180][n % 4];
  const coeff = simplifyFraction(2 * r * degree, 360);
  const answer = coeff === "1" ? "π" : `${coeff}π`;
  return simple(`半径为 ${r} 的圆中，圆心角为 ${degree}° 的弧长是多少？`, answer, [`${2 * r}π`, `${r * r}π`, `${r}π`, String(degree / 2)], `弧长=2πr×圆心角/360°，所以弧长为 ${answer}。`, "先求完整圆的周长。", "再乘圆心角占 360° 的比例。", "直接使用完整圆周长。");
}

function sectorArea(n: number): Draft {
  const r = 4 + (n % 9);
  const degree = [60, 90, 120, 180][n % 4];
  const coeff = simplifyFraction(r * r * degree, 360);
  const answer = coeff === "1" ? "π" : `${coeff}π`;
  return simple(`半径为 ${r} 的圆中，圆心角为 ${degree}° 的扇形面积是多少？`, answer, [`${r * r}π`, `${2 * r}π`, `${r}π`, String(degree / 2)], `扇形面积=πr^2×圆心角/360°，所以面积为 ${answer}。`, "扇形面积是整个圆面积的一部分。", "比例是圆心角除以 360°。", "把弧长公式当成扇形面积公式。");
}

function circleRightTriangle(n: number): Draft {
  const triples = [[5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15]];
  const [a, b, c] = triples[n % triples.length];
  return simple(`圆的半径为 ${a}，切线段长为 ${b}，则圆心到圆外点的距离是多少？`, c, [a + b, Math.abs(b - a), c + 1, b], `半径与切线垂直，形成直角三角形，所以距离为 √(${a}^2+${b}^2)=${c}。`, "切点处半径与切线垂直。", "用勾股定理。", "直接把半径和切线长相加。");
}

function circleRatio(n: number): Draft {
  const a = 2 + (n % 7);
  const b = a * (2 + (n % 3));
  const answer = simplifyRatio(a, b);
  return simple(`两个圆的半径分别为 ${a} 和 ${b}，它们的周长比是多少？`, answer, [`${a * a}:${b * b}`, `${b}:${a}`, `${a + b}:${b}`, `${a}:${2 * b}`], `圆周长与半径成正比，所以周长比等于半径比 ${answer}。`, "圆周长和半径成正比。", "周长比就是半径比。", "把周长比误写成半径平方比。");
}

function probabilityBasic(n: number): Draft {
  const red = 2 + (n % 7);
  const blue = 3 + ((n * 2) % 9);
  const total = red + blue;
  const answer = simplifyFraction(red, total);
  return simple(`袋中有 ${red} 个红球和 ${blue} 个蓝球，随机摸出 1 个球，摸到红球的概率是多少？`, answer, [simplifyFraction(blue, total), `${red}/${blue}`, "1", simplifyFraction(red + 1, total)], `概率=有利结果数÷总结果数，所以为 ${red}/${total}=${answer}。`, "概率等于有利结果数除以总结果数。", "总数包括红球和蓝球。", "用红球数除以蓝球数。");
}

function probabilityComplement(n: number): Draft {
  const numerator = 1 + (n % 5);
  const denominator = numerator + 3 + (n % 6);
  const answer = simplifyFraction(denominator - numerator, denominator);
  return simple(`某事件发生的概率为 ${numerator}/${denominator}，它不发生的概率是多少？`, answer, [`${numerator}/${denominator}`, "1", "0", `${numerator + 1}/${denominator}`], `不发生是补事件，概率为 1-${numerator}/${denominator}=${answer}。`, "发生和不发生构成全部情况。", "用 1 减去发生概率。", "把不发生概率仍写成原概率。");
}

function probabilityExpected(n: number): Draft {
  const denominator = 4 + (n % 7);
  const numerator = 1 + (n % Math.max(2, denominator - 1));
  const trials = denominator * (8 + (n % 8));
  const answer = (trials * numerator) / denominator;
  return simple(`某事件发生的概率为 ${numerator}/${denominator}，重复试验 ${trials} 次，预计大约发生多少次？`, answer, [trials, answer + 5, Math.max(0, answer - 5), trials - answer], `预计次数=概率×试验次数，所以约为 ${numerator}/${denominator}×${trials}=${answer} 次。`, "概率可以看成长期频率。", "用概率乘以总次数。", "把概率当成次数。");
}

function statisticsMean(n: number): Draft {
  const start = 2 + (n % 8);
  const values = [start, start + 2, start + 4, start + 6, start + 8];
  const answer = start + 4;
  return simple(`一组数据为 ${values.join("，")}，这组数据的平均数是多少？`, answer, [values[2], answer + 1, answer - 1, values[0] + values[4]], `平均数等于总和除以个数，所以平均数为 ${answer}。`, "先把所有数据相加。", "再除以数据个数。", "把中位数或总和当成平均数。");
}

function statisticsRange(n: number): Draft {
  const min = 1 + (n % 8);
  const max = min + 9 + (n % 8);
  const values = [min, min + 2, min + 5, max - 2, max];
  const answer = max - min;
  return simple(`一组数据为 ${values.join("，")}，这组数据的极差是多少？`, answer, [values[2], min + max, answer + 1, answer - 1], `极差=最大值-最小值=${max}-${min}=${answer}。`, "先找到最大值和最小值。", "极差是最大值减最小值。", "把中位数当成极差。");
}

function statisticsMissing(n: number): Draft {
  const known = [3 + (n % 5), 5 + (n % 6), 8 + (n % 7), 10 + (n % 8)];
  const missing = 6 + (n % 10);
  const mean = (known.reduce((a, b) => a + b, 0) + missing) / 5;
  return simple(`5 个数的平均数为 ${mean}，其中 4 个数为 ${known.join("，")}，第 5 个数是多少？`, missing, [mean, known.reduce((a, b) => a + b, 0), missing + 2, Math.max(0, missing - 2)], `5 个数总和为 ${mean}×5，减去已知 4 个数的和，得到第 5 个数为 ${missing}。`, "平均数乘以个数得到总和。", "用总和减去已知数据和。", "直接把平均数当成缺失值。");
}

function simple(statement: string, answer: string | number, wrongs: Array<string | number>, solution: string, hint1: string, hint2: string, commonMistake: string): Draft {
  return {
    answer,
    commonMistake,
    hint1,
    hint2,
    solution,
    statement,
    variantIdea: "换一组数值，继续练习同一章节的核心结构。",
    wrongs
  };
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
  if (answer.includes(":")) {
    const [a, b] = answer.split(":").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return `${a + offset + 1}:${b}`;
  }
  if (answer.includes("/")) {
    const [a, b] = answer.split("/").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return `${a + offset + 1}/${b}`;
  }
  return `${answer}+${offset + 1}`;
}

function renderReport(existing: Problem[], generated: ProblemRow[], unsupported: Array<{ chapterTitle: string; problemType: string }>) {
  const existingByChapter = countBy(existing, (problem) => problem.curriculum.chapterTitle);
  const generatedByChapter = countBy(generated, (problem) => problem.chapter_title);
  const rows = [...new Set([...Object.keys(existingByChapter), ...Object.keys(generatedByChapter)])]
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((chapter) => [chapter, existingByChapter[chapter] ?? 0, generatedByChapter[chapter] ?? 0]);

  return [
    "# CN Junior Chapter Expansion v1",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Source collection: ${SOURCE_COLLECTION}`,
    `Target per chapter: ${TARGET_PER_CHAPTER}`,
    `Generated problems: ${generated.length}`,
    "",
    "## Chapter Fill Plan",
    "",
    "| Chapter | Existing | Added | Projected |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map(([chapter, existingCount, added]) => `| ${chapter} | ${existingCount} | ${added} | ${Number(existingCount) + Number(added)} |`),
    "",
    "## Unsupported",
    "",
    unsupported.length === 0 ? "No unsupported chapter templates." : unsupported.map((row) => `- ${row.chapterTitle}: ${row.problemType}`).join("\n"),
    "",
    "## Policy",
    "",
    "- Each generated problem is auto-gradable multiple choice with distractor and explanation rows.",
    "- The expansion uses existing promoted CN junior chapters as metadata anchors.",
    "- Items are original-equivalent variants based on cleaned local OCR coverage signals, not direct textbook exercise copies."
  ].join("\n");
}

function isCnJunior(problem: Problem) {
  return problem.locale?.curriculumSystem === "CN" && problem.curriculum?.course === "CN Junior High Math";
}

function chapterKey(problem: Problem) {
  return `${problem.curriculum.course}::${problem.curriculum.chapter}`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  items.forEach((item) => groups.set(getKey(item), [...(groups.get(getKey(item)) ?? []), item]));
  return groups;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function first<T>(items: T[]) {
  if (!items[0]) throw new Error("Expected at least one item");
  return items[0];
}

function normalizeAnswer(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(6)));
  return value;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
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

function rotate<T>(values: T[], amount: number) {
  return [...values.slice(amount), ...values.slice(0, amount)];
}

function simplifyFraction(numerator: number, denominator: number) {
  const factor = gcd(Math.abs(numerator), Math.abs(denominator));
  const a = numerator / factor;
  const b = denominator / factor;
  return b === 1 ? String(a) : `${a}/${b}`;
}

function simplifyRatio(left: number, right: number) {
  const factor = gcd(Math.abs(left), Math.abs(right));
  return `${left / factor}:${right / factor}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatMisconception(value: string) {
  return value.replace(/_/g, " ");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toCsv<T extends Record<string, string>>(rows: T[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")).join("\n")}\n`;
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main();
