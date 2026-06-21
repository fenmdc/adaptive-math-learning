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
  column: string;
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
  grade_band: "小学";
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

type BatchConfig = {
  batchId: string;
  boundedNumbers: boolean;
  idPrefix: string;
  latex: boolean;
  outputSubdir: string;
  perGrade: number;
  sequenceBase: number;
  sourceCollection: string;
  sourceOffset: number;
  variantSalt: number;
  variantStyle: string;
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const CLEANED_DIR = path.join(DATASET_DIR, "review", "cleaned");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const GRADES = ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

function main() {
  const config = readConfig();
  const outputDir = path.join(DATASET_DIR, config.outputSubdir);
  const blocksByGrade = new Map(GRADES.map((grade) => [grade, selectSourceBlocks(grade, config)]));
  const problems: ProblemRow[] = [];
  const distractors: DistractorRow[] = [];
  const explanations: ExplanationRow[] = [];

  GRADES.forEach((grade, gradeIndex) => {
    const blocks = blocksByGrade.get(grade) ?? [];
    for (let variant = 0; variant < config.perGrade; variant += 1) {
      const sourceBlock = blocks[variant % blocks.length];
      const draftVariant = config.sourceOffset + variant + (grade === "grade5" ? config.variantSalt : 0);
      const draft = maybeLatexDraft(buildDraft(grade, draftVariant, sourceBlock, config), config);
      const id = `${config.idPrefix}_g${grade.replace("grade", "")}_${String(variant + 1).padStart(3, "0")}`;
      const mapped = mapDraft(id, draft, gradeIndex, variant, sourceBlock, config);
      problems.push(mapped.problem);
      distractors.push(...mapped.distractors);
      explanations.push(mapped.explanation);
    }
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "pilot-source-blocks.json"), `${JSON.stringify(Object.fromEntries(blocksByGrade), null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "pilot-report.md"), renderPilotReport(problems, blocksByGrade, config));
  fs.writeFileSync(path.join(STAGING_DIR, "problem_staging.csv"), toCsv(problems));
  fs.writeFileSync(path.join(STAGING_DIR, "distractors.csv"), toCsv(distractors));
  fs.writeFileSync(path.join(STAGING_DIR, "example_explanations.csv"), toCsv(explanations));

  console.log("Jian Zi Sheng elementary pilot staging");
  console.log(`- Batch: ${config.batchId}`);
  console.log(`- Source collection: ${config.sourceCollection}`);
  console.log(`- Problems: ${problems.length}`);
  console.log(`- Distractors: ${distractors.length}`);
  console.log(`- Explanations: ${explanations.length}`);
  console.log(`- Pilot report: ${path.relative(process.cwd(), path.join(outputDir, "pilot-report.md"))}`);
  console.log("- Active staging CSVs now contain the elementary pilot batch only.");
}

function readConfig(): BatchConfig {
  return {
    batchId: readArg("--batch-id") ?? "pilot",
    boundedNumbers: hasFlag("--bounded-numbers"),
    idPrefix: readArg("--id-prefix") ?? "cn_jzs_elem_pilot",
    latex: hasFlag("--latex"),
    outputSubdir: readArg("--output-subdir") ?? "pilot",
    perGrade: Number(readArg("--per-grade") ?? "6"),
    sequenceBase: Number(readArg("--sequence-base") ?? "14000"),
    sourceCollection: readArg("--source-collection") ?? "jianzisheng_cn_elementary_pilot_v0",
    sourceOffset: Number(readArg("--source-offset") ?? "0"),
    variantSalt: Number(readArg("--variant-salt") ?? "0"),
    variantStyle: readArg("--variant-style") ?? "default"
  };
}

function selectSourceBlocks(grade: string, config: BatchConfig) {
  const filePath = path.join(CLEANED_DIR, `${grade}-cleaned-blocks.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing cleaned review file: ${filePath}. Run npm run clean:jianzisheng-elementary first.`);
  }

  const blocks = JSON.parse(fs.readFileSync(filePath, "utf8")) as CleanedBlock[];
  const candidates = blocks
    .filter((block) => ["thinking_training", "competition_boost", "worked_example"].includes(block.cleanedColumn))
    .filter((block) => block.reviewPriority !== "high")
    .filter((block) => block.lessonNo !== null)
    .filter((block) => block.questionCandidates.length > 0)
    .sort((a, b) => scoreBlock(b) - scoreBlock(a) || a.pageStart - b.pageStart);

  if (candidates.length === 0) {
    throw new Error(`No usable pilot source blocks for ${grade}`);
  }

  return candidates.slice(config.sourceOffset, config.sourceOffset + config.perGrade);
}

function scoreBlock(block: CleanedBlock) {
  let score = block.questionCandidates.length;
  if (block.cleanedColumn === "thinking_training") score += 5;
  if (block.cleanedColumn === "competition_boost") score += 3;
  if (block.confidence === "high") score += 3;
  if (block.reviewPriority === "normal") score += 2;
  return score;
}

function buildDraft(grade: string, variant: number, block: CleanedBlock, config: BatchConfig): Draft {
  const gradeNo = Number(grade.replace("grade", ""));
  if (gradeNo === 1) return grade1Draft(variant, block, config);
  if (gradeNo === 2) return grade2Draft(variant, block, config);
  if (gradeNo === 3) return grade3Draft(variant, block, config);
  if (gradeNo === 4) return grade4Draft(variant, block, config);
  if (gradeNo === 5) return grade5Draft(variant, block);
  return grade6Draft(variant, block, config);
}

function grade1Draft(i: number, block: CleanedBlock, config: BatchConfig): Draft {
  const step = config.boundedNumbers ? 1 + ((i + Math.floor(i / 5)) % 4) : 1 + (i % 3);
  const start = config.boundedNumbers ? 10 + ((i * 7) % 80) : 3 + i;
  const useMissingMiddle = config.variantStyle === "batch7-plus";
  const missingIndex = useMissingMiddle ? 2 : 4;
  const answer = start + step * missingIndex;
  const values = [0, 1, 2, 3, 4].map((index) => start + step * index);
  const sequenceText = useMissingMiddle
    ? `${values[0]}, ${values[1]}, __, ${values[3]}, ${values[4]}`
    : `${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, __`;
  return baseDraft(block, {
    statement: `观察数列：${sequenceText}。空格里应填多少？`,
    answer,
    wrongs: [answer - step, answer + step, start + step * 5, answer - 1],
    solution: useMissingMiddle
      ? `相邻两个数每次都增加 ${step}，所以 ${values[1]} 后面再加 ${step}，中间空格是 ${answer}。`
      : `相邻两个数每次都增加 ${step}，所以最后一个已知数 ${start + step * 3} 后面再加 ${step}，得到 ${answer}。`,
    concepts: ["arith_natural_numbers"],
    skills: ["sequence_observation", "addition_fluency"],
    patterns: ["constant_difference_pattern", "number_sequence"],
    misconceptions: ["endpoint_error", "skip_count_error"],
    theme: "数与规律",
    chapter: "cn-primary-g1-number-patterns",
    chapterTitle: "一年级：数的认识与找规律",
    difficulty: 1,
    layer: "Foundation",
    stage: "Foundation",
    problemType: "cn_number_pattern",
    cognitiveTags: ["pattern_recognition", "fluency_precision"],
    hint1: "先比较相邻两个数相差多少。",
    hint2: "每一步的变化量相同。",
    commonMistake: "只看最后一个数，没有确认前面每一步的变化。",
    variantIdea: "把递增规律改成递减规律。"
  });
}

function grade2Draft(i: number, block: CleanedBlock, config: BatchConfig): Draft {
  const boxes = config.boundedNumbers ? 4 + (i % 8) : 3 + i;
  const each = config.boundedNumbers ? 6 + ((i + Math.floor(i / 3)) % 7) : 4 + (i % 5);
  const used = config.boundedNumbers ? 2 + ((i + 1) % 5) : 2 + (i % 4);
  const answer = boxes * each - used;
  return baseDraft(block, {
    statement: config.boundedNumbers
      ? `有 ${boxes} 包贴纸，每包 ${each} 张，送给同学 ${used} 张后，还剩多少张？`
      : `有 ${boxes} 盒彩笔，每盒 ${each} 支，借给同学 ${used} 支后，还剩多少支？`,
    answer,
    wrongs: [boxes + each - used, boxes * each + used, boxes * (each - used), answer + used],
    solution: `先求一共有 ${boxes} x ${each} = ${boxes * each}，再减去送出或借出的 ${used}，剩 ${answer}。`,
    concepts: ["arith_natural_numbers"],
    skills: ["multiplication_modeling", "two_step_word_problem"],
    patterns: ["part_whole_reasoning", "operation_selection"],
    misconceptions: ["operation_selection_error", "one_step_only_error"],
    theme: "应用题基础",
    chapter: "cn-primary-g2-word-arithmetic",
    chapterTitle: "二年级：乘法模型与两步应用题",
    difficulty: 2,
    layer: "Foundation",
    stage: "Foundation",
    problemType: "cn_two_step_word_problem",
    cognitiveTags: ["operation_selection", "modeling_transfer"],
    hint1: "先求总数。",
    hint2: "借出以后要从总数里减去。",
    commonMistake: "把盒数和每盒数量直接相加。",
    variantIdea: "改成又买来若干支，练习先乘后加。"
  });
}

function grade3Draft(i: number, block: CleanedBlock, config: BatchConfig): Draft {
  const divisor = config.boundedNumbers ? 3 + (i % 6) : 4 + (i % 4);
  const quotient = config.boundedNumbers ? 12 + ((i * 3) % 24) : 8 + i;
  const remainder = i % divisor;
  const total = divisor * quotient + remainder;
  return baseDraft(block, {
    statement: config.boundedNumbers
      ? `${total} 颗彩珠，每 ${divisor} 颗串成一组，可以串成几整组，还剩几颗？`
      : `${total} 个小正方形，每 ${divisor} 个分成一组，可以分成几整组，还剩几个？`,
    answer: `${quotient},${remainder}`,
    wrongs: [`${quotient + 1},${remainder}`, `${quotient},${divisor - remainder}`, String(quotient), String(remainder)],
    solution: `${total} = ${divisor} x ${quotient} + ${remainder}，所以可以分成 ${quotient} 整组，还剩 ${remainder} 个。`,
    concepts: ["nt_remainders", "arith_natural_numbers"],
    skills: ["division_with_remainder", "quotient_remainder_model"],
    patterns: ["division_structure", "multiple_plus_remainder"],
    misconceptions: ["remainder_as_quotient_error", "endpoint_error"],
    theme: "除法与余数",
    chapter: "cn-primary-g3-remainders",
    chapterTitle: "三年级：除法、余数与周期",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_remainder_model",
    cognitiveTags: ["number_structure", "fluency_precision"],
    hint1: "把总数写成 除数 x 商 + 余数。",
    hint2: "余数一定小于每组的个数。",
    commonMistake: "看到有剩余就把商多加 1。",
    variantIdea: "改成按颜色循环排列，求某个位置的颜色。"
  });
}

function grade4Draft(i: number, block: CleanedBlock, config: BatchConfig): Draft {
  const length = config.boundedNumbers ? 12 + ((i * 2) % 18) : 9 + i;
  const width = config.boundedNumbers ? 5 + ((i + 2) % 8) : 4 + (i % 5);
  const answer = length * width;
  return baseDraft(block, {
    statement: config.boundedNumbers
      ? `一块长方形展板长 ${length} 厘米，宽 ${width} 厘米，面积是多少平方厘米？`
      : `一个长方形长 ${length} 厘米，宽 ${width} 厘米，面积是多少平方厘米？`,
    answer,
    wrongs: [2 * (length + width), length + width, answer + length, answer - width],
    solution: `长方形面积 = 长 x 宽 = ${length} x ${width} = ${answer} 平方厘米。`,
    concepts: ["geo_area", "arith_natural_numbers"],
    skills: ["area_formula", "multiplication_fluency"],
    patterns: ["measurement_formula", "rectangle_model"],
    misconceptions: ["area_perimeter_confusion", "formula_selection_error"],
    theme: "图形与测量",
    chapter: "cn-primary-g4-geometry-area",
    chapterTitle: "四年级：图形周长与面积",
    difficulty: 2,
    layer: "Foundation",
    stage: "Bridge",
    problemType: "cn_rectangle_area",
    cognitiveTags: ["formula_selection", "geometric_reasoning"],
    hint1: "判断题目问的是面积还是周长。",
    hint2: "长方形面积用长乘宽。",
    commonMistake: "把面积公式和周长公式混用。",
    variantIdea: "给出面积和长，反求宽。"
  });
}

function grade5Draft(i: number, block: CleanedBlock): Draft {
  const denominatorPool = i >= 100
    ? [32, 33, 34, 35, 36, 38, 39, 40, 42, 45, 48, 50, 54, 56, 60]
    : [7, 9, 10, 11, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 30];
  const denominator = denominatorPool[i % denominatorPool.length];
  const numeratorLimit = Math.max(2, Math.floor(denominator / 3));
  const a = 1 + (i % numeratorLimit);
  const b = 1 + ((Math.floor(i / 2) + 2) % numeratorLimit);
  const numerator = a + b;
  const answer = simplifyFraction(numerator, denominator);
  return baseDraft(block, {
    statement: `计算：${a}/${denominator} + ${b}/${denominator} = ?`,
    answer,
    wrongs: [`${a + b}/${denominator + denominator}`, `${Math.abs(a - b)}/${denominator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator}`],
    solution: `同分母分数相加，分母不变，分子相加：${a}/${denominator} + ${b}/${denominator} = ${numerator}/${denominator} = ${answer}。`,
    concepts: ["arith_fractions"],
    skills: ["fraction_addition", "fraction_simplification"],
    patterns: ["part_whole_reasoning", "denominator_alignment"],
    misconceptions: ["add_denominators_error", "simplification_error"],
    theme: "分数与运算",
    chapter: "cn-primary-g5-fractions",
    chapterTitle: "五年级：分数计算与分数应用",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_fraction_computation",
    cognitiveTags: ["part_whole_reasoning", "fluency_precision"],
    hint1: "两个分数的分母相同。",
    hint2: "分子相加后记得约分。",
    commonMistake: "把分母也相加。",
    variantIdea: "换成异分母分数，需要先通分。"
  });
}

function grade6Draft(i: number, block: CleanedBlock, config: BatchConfig): Draft {
  const base = config.boundedNumbers ? 120 + ((i * 20) % 480) : 80 + i * 10;
  const percent = [10, 15, 20, 25, 30, 40][i % 6];
  const answer = base * (100 - percent) / 100;
  return baseDraft(block, {
    statement: config.boundedNumbers
      ? `一个书包标价 ${base} 元，按标价的 ${100 - percent}% 付款，售价是多少元？`
      : `一件商品原价 ${base} 元，降价 ${percent}% 后售价是多少元？`,
    answer,
    wrongs: [base - percent, base * percent / 100, base + percent, answer + percent],
    solution: `打 ${100 - percent} 折或降价 ${percent}% 后，支付原价的 ${100 - percent}%，售价为 ${base} x ${100 - percent}% = ${answer} 元。`,
    concepts: ["arith_percentages", "arith_ratios"],
    skills: ["percent_discount", "proportional_reasoning"],
    patterns: ["percent_of_quantity", "multiplicative_reasoning"],
    misconceptions: ["percent_base_error", "additive_percent_error"],
    theme: "比与百分数",
    chapter: "cn-primary-g6-ratio-percent",
    chapterTitle: "六年级：比、比例与百分数",
    difficulty: 3,
    layer: "Standard",
    stage: "Bridge",
    problemType: "cn_percent_word_problem",
    cognitiveTags: ["multiplicative_reasoning", "modeling_transfer"],
    hint1: "降价后支付的是原价的百分之多少？",
    hint2: "用原价乘以剩下的百分比。",
    commonMistake: "直接用原价减去百分数本身。",
    variantIdea: "把降价改成涨价，比较计算结构。"
  });
}

function baseDraft(block: CleanedBlock, input: Omit<Draft, "answer" | "wrongs"> & { answer: string | number; wrongs: Array<string | number> }): Draft {
  return {
    ...input,
    answer: normalizeAnswer(String(input.answer)),
    wrongs: input.wrongs.map((wrong) => normalizeAnswer(String(wrong)))
  };
}

function mapDraft(id: string, draft: Draft, gradeIndex: number, variant: number, block: CleanedBlock, config: BatchConfig) {
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
    course: "CN Primary Math",
    theme: draft.theme,
    chapter: draft.chapter,
    chapter_title: draft.chapterTitle,
    sequence: String(config.sequenceBase + gradeIndex * 100 + variant),
    source_collection: config.sourceCollection,
    source_file: `${block.sourceFile}; block=${block.id}; pages=${block.pageStart}-${block.pageEnd}; lesson=${block.lessonNo ?? "unknown"}; column=${block.cleanedColumn}`,
    taxonomy_layer: draft.layer,
    taxonomy_stage: draft.stage,
    problem_type: draft.problemType,
    cognitive_tags: draft.cognitiveTags.join(";"),
    estimated_time_seconds: String(60 + Math.max(0, draft.difficulty - 1) * 20),
    notes: `${config.batchId} Chinese elementary item generated from cleaned OCR review signals. Uses original-equivalent auto-gradable content; source block is retained only for QA traceability.`,
    language: "zh",
    curriculum_system: "CN",
    region: "CN",
    display_track: "中文校内",
    grade_band: "小学",
    content_status: "pilot"
  };

  const distractors = choices
    .filter((choice) => normalize(choice.value) !== normalize(problem.answer))
    .map((choice): DistractorRow => ({
      problem_id: id,
      choice_label: choice.label,
      value: choice.value,
      misconception: inferMisconception(problem.problem_type, choice.value, problem.answer),
      cognitive_tag: draft.cognitiveTags[0] ?? "general_reasoning",
      explanation: `这个选项通常来自${formatMisconception(inferMisconception(problem.problem_type, choice.value, problem.answer))}。`
    }));

  const explanation: ExplanationRow = {
    problem_id: id,
    hint_1: draft.hint1,
    hint_2: draft.hint2,
    step_by_step: [`Step 1: ${draft.hint1}`, `Step 2: ${draft.solution}`, `Step 3: 检查答案格式，得到 ${problem.answer}。`].join(" "),
    common_mistake: draft.commonMistake,
    why_correct: `答案 ${problem.answer} 正确，因为它保持了题目中的数量关系。${draft.solution}`,
    variant_idea: draft.variantIdea
  };

  return { problem, distractors, explanation };
}

function renderPilotReport(problems: ProblemRow[], blocksByGrade: Map<string, CleanedBlock[]>, config: BatchConfig) {
  return [
    "# Jian Zi Sheng Elementary Pilot Batch",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Batch: ${config.batchId}`,
    `Problems: ${problems.length}`,
    `Source collection: ${config.sourceCollection}`,
    `Per grade: ${config.perGrade}`,
    `Source offset: ${config.sourceOffset}`,
    `Variant salt: ${config.variantSalt}`,
    `Variant style: ${config.variantStyle}`,
    `Bounded numbers: ${config.boundedNumbers ? "enabled" : "disabled"}`,
    `LaTeX authoring: ${config.latex ? "enabled" : "disabled"}`,
    "",
    "## Policy",
    "",
    "- This batch is written to active staging for validation only.",
    "- `content_status` is `pilot`; promotion should happen only after manual review.",
    "- Problems are original-equivalent auto-gradable items generated from cleaned OCR coverage signals.",
    "- Source OCR block ids are retained in `source_file` for QA traceability.",
    "",
    "## Distribution",
    "",
    ...Object.entries(countBy(problems, (problem) => problem.chapter_title)).map(([chapter, count]) => `- ${chapter}: ${count}`),
    "",
    "## Source Blocks",
    "",
    ...[...blocksByGrade.entries()].flatMap(([grade, blocks]) => [
      `### ${grade}`,
      "",
      ...blocks.map((block) => `- ${block.id}: pages ${block.pageStart}-${block.pageEnd}, lesson ${block.lessonNo ?? "unknown"}, ${block.column} -> ${block.cleanedColumn}, candidates ${block.questionCandidates.length}`)
    ]),
    ""
  ].join("\n");
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

function inferMisconception(problemType: string, value: string, answer: string) {
  if (problemType.includes("percent")) return "percent_base_error";
  if (problemType.includes("area")) return "area_perimeter_confusion";
  if (problemType.includes("pattern")) return "pattern_step_error";
  if (value.includes("/") || answer.includes("/")) return "fraction_structure_error";
  if (value.includes(",")) return "remainder_format_error";
  return "operation_error";
}

function formatMisconception(value: string) {
  const labels: Record<string, string> = {
    area_perimeter_confusion: "面积和周长公式混淆",
    fraction_structure_error: "分数结构理解错误",
    operation_error: "运算步骤选择错误",
    pattern_step_error: "规律步长判断错误",
    percent_base_error: "百分数基准量理解错误",
    remainder_format_error: "余数或答案格式理解错误"
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

function maybeLatexDraft(draft: Draft, config: BatchConfig): Draft {
  if (!config.latex) return draft;

  return {
    ...draft,
    statement: latexText(draft.statement),
    solution: latexText(draft.solution),
    hint1: latexText(draft.hint1),
    hint2: latexText(draft.hint2),
    commonMistake: latexText(draft.commonMistake),
    variantIdea: latexText(draft.variantIdea)
  };
}

function latexText(value: string) {
  return value
    .replace(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)%/g, (_, left, right) => `$${left} \\\\times ${right}\\\\%$`)
    .replace(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/g, (_, left, right) => `$${left} \\\\times ${right}$`)
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, numerator, denominator) => `$\\\\frac{${numerator}}{${denominator}}$`)
    .replace(/(\d+(?:\.\d+)?)%/g, (_, percent) => `$${percent}\\\\%$`);
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

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

main();
