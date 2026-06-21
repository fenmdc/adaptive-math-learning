import fs from "fs";
import path from "path";
import katex from "katex";
import type { Problem } from "../packages/adaptive-engine";
import type { ExampleExplanation } from "../apps/web/app/shared/explanationQuality";

type TextLocation = {
  field: string;
  id: string;
  text: string;
};

type Issue = {
  field: string;
  id: string;
  snippet: string;
  type: IssueType;
};

type IssueType =
  | "adjacent_math_text"
  | "ascii_inequality"
  | "ascii_multiplication"
  | "double_latex_escape"
  | "english_answer_label"
  | "english_step_label"
  | "katex_render_error"
  | "split_equation_after_math"
  | "unbalanced_dollar";

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const REPORT_PATH = path.join(process.cwd(), "datasets/reports/cn-math-text-qa-v0.md");
const FIX = process.argv.includes("--fix");

const EXPLANATION_FIELDS: Array<keyof ExampleExplanation> = [
  "hint1",
  "hint2",
  "stepByStep",
  "commonMistake",
  "whyCorrect",
  "variantIdea"
];

function main() {
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const cnIds = new Set(problems.filter(isChineseProblem).map((problem) => problem.id));
  const before = auditChineseMathText(problems, explanations);
  const changes = FIX ? applyFixes(problems, explanations, cnIds) : 0;
  const after = auditChineseMathText(problems, explanations);

  if (FIX && changes > 0) {
    fs.writeFileSync(PROBLEMS_PATH, `${JSON.stringify(problems, null, 2)}\n`);
    fs.writeFileSync(EXPLANATIONS_PATH, `${JSON.stringify(explanations, null, 2)}\n`);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(before, after, changes));

  console.log("CN math text QA");
  console.log(`- Mode: ${FIX ? "fix" : "audit"}`);
  console.log(`- CN text fields: ${before.locations.length}`);
  console.log(`- Issues before: ${before.issues.length}`);
  console.log(`- Text fields changed: ${changes}`);
  console.log(`- Issues after: ${after.issues.length}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);

  if (after.issues.some((issue) => issue.type === "unbalanced_dollar" || issue.type === "katex_render_error")) {
    process.exit(1);
  }
}

function applyFixes(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>,
  cnIds: Set<string>
) {
  let changes = 0;

  problems.filter(isChineseProblem).forEach((problem) => {
    changes += updateString(problem, "statement", normalizeChineseMathText);
    changes += updateString(problem, "solution", normalizeChineseMathText);
    problem.choices?.forEach((choice) => {
      if (typeof choice !== "object" || choice === null) return;
      changes += updateString(choice, "text", normalizeLatexEscapes);
      changes += updateString(choice, "value", normalizeLatexEscapes);
    });
    problem.distractors?.forEach((distractor) => {
      changes += updateString(distractor, "explanation", normalizeChineseMathText);
      changes += updateString(distractor, "value", normalizeLatexEscapes);
    });
  });

  Object.entries(explanations).forEach(([id, explanation]) => {
    if (!cnIds.has(id)) return;
    EXPLANATION_FIELDS.forEach((field) => {
      changes += updateString(explanation, field, normalizeChineseExplanationText);
    });
  });

  return changes;
}

function auditChineseMathText(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
) {
  const locations = collectChineseTextLocations(problems, explanations);
  const issues = locations.flatMap(findIssues);

  return {
    issueCounts: countBy(issues, (issue) => issue.type),
    issues,
    locations
  };
}

function collectChineseTextLocations(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
) {
  const locations: TextLocation[] = [];
  const cnProblems = problems.filter(isChineseProblem);
  const cnIds = new Set(cnProblems.map((problem) => problem.id));

  cnProblems.forEach((problem) => {
    pushLocation(locations, problem.id, "problem.statement", problem.statement);
    pushLocation(locations, problem.id, "problem.solution", problem.solution);
    problem.choices?.forEach((choice, index) => {
      if (typeof choice === "string") {
        pushLocation(locations, problem.id, `choice.${index + 1}`, choice);
        return;
      }
      pushLocation(locations, problem.id, `choice.${choice.label}`, choice.text);
    });
    problem.distractors?.forEach((distractor) => {
      pushLocation(locations, problem.id, `distractor.${distractor.choiceLabel}`, distractor.explanation);
    });
  });

  Object.entries(explanations).forEach(([id, explanation]) => {
    if (!cnIds.has(id)) return;
    EXPLANATION_FIELDS.forEach((field) => pushLocation(locations, id, `explanation.${field}`, explanation[field]));
  });

  return locations;
}

function findIssues(location: TextLocation): Issue[] {
  const issues: Issue[] = [];
  const text = location.text;

  addIssueIf(issues, location, "double_latex_escape", /\\{2,}(?=(times|frac|leq|geq|le|ge|cdot|div|Delta)\b|%)/.test(text));
  addIssueIf(issues, location, "unbalanced_dollar", countUnescapedDollars(text) % 2 === 1);
  addIssueIf(issues, location, "split_equation_after_math", /\$[^$]+\$\s*=\s*-?\d/.test(text));
  addIssueIf(issues, location, "english_step_label", /\bStep\s+\d+\s*:/.test(text));
  addIssueIf(issues, location, "english_answer_label", /\bAnswer\b|\banswer\s*=|\bmodel\b/.test(text));
  addIssueIf(issues, location, "ascii_multiplication", /\d+(?:\.\d+)?\s+x\s+\d+(?:\.\d+)?%?/.test(text));
  addIssueIf(issues, location, "ascii_inequality", /<=|>=/.test(text));
  addIssueIf(issues, location, "adjacent_math_text", hasAdjacentMathText(text));

  extractLatex(text).forEach((latex) => {
    try {
      katex.renderToString(latex, {
        displayMode: false,
        output: "html",
        strict: false,
        throwOnError: true
      });
    } catch {
      issues.push(toIssue(location, "katex_render_error"));
    }
  });

  return issues;
}

function normalizeChineseExplanationText(value: string) {
  return normalizeChineseMathText(value)
    .replace(/\bStep\s+1\s*:/g, "步骤 1：")
    .replace(/\bStep\s+2\s*:/g, "步骤 2：")
    .replace(/\bStep\s+3\s*:/g, "步骤 3：")
    .replace(/\bAnswer\s+(.+?)\s+is correct because\s*/g, "答案 $1 正确，因为")
    .replace(/\banswer\s*=\s*/gi, "答案为 ")
    .replace(/\bthis problem uses the\s+/g, "本题使用 ")
    .replace(/\bstructure\b/g, "结构")
    .replace(/\bmodel\b/g, "模型")
    .replace(/本题使用\s+[a-z_]+\s+结构[.。]?/g, "本题使用了对应的数学关系。")
    .replace(/这个\s+模型\s+保持/g, "这个模型保持")
    .replace(/结构\.\s*核心理由/g, "结构。核心理由")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeChineseMathText(value: string) {
  return repairPartialMathSegments(mapOutsideLatex(normalizeLatexEscapes(value), normalizeTextSegment))
    .replace(/\$([^$]+)\$\s*=\s*(-?\d+(?:\.\d+)?)/g, (_, expression, result) => `$${expression} = ${result}$`)
    .replace(/\s+([，。；：？！])/g, "$1")
    .replace(/([，。；：？！])\s+/g, "$1")
    .trim();
}

function normalizeTextSegment(value: string) {
  return value
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/\b([A-Za-z])\^(\d+)\b/g, "$$$1^{$2}$$")
    .replace(/(-?\d+(?:\.\d+)?)\s*×\s*(-?\d+(?:\.\d+)?)/g, (_, left, right) => `$${left} \\times ${right}$`)
    .replace(/(\d+(?:\.\d+)?)(?:\s+x\s+\d+(?:\.\d+)?){2,}/g, (raw) => (
      `$${raw.replace(/\s+x\s+/g, " \\times ")}$`
    ))
    .replace(/(\d+(?:\.\d+)?)\s+x\s+(\d+(?:\.\d+)?)%/g, (_, left, right) => `$${left} \\times ${right}\\%$`)
    .replace(/(\d+(?:\.\d+)?)\s+x\s+(\d+(?:\.\d+)?)/g, (_, left, right) => `$${left} \\times ${right}$`)
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, numerator, denominator) => `$\\frac{${numerator}}{${denominator}}$`)
    .replace(/除数\s+x\s+商/g, "除数 × 商")
    .replace(/长\s+x\s+宽/g, "长 × 宽");
}

function repairPartialMathSegments(value: string) {
  return value
    .replace(/\$\$(x\s*=\s*-?\d+(?:\.\d+)?)\$\$/g, (_, expression) => `$${expression}$`)
    .replace(/\$(y\s*=\s*-?\d+x\s*[+-]\s*-?\d+)，/g, (_, expression) => `$${expression}$，`)
    .replace(/\$(y\s*=\s*-?\d+x\s*[+-]\s*-?\d+)。/g, (_, expression) => `$${expression}$。`)
    .replace(/\$(y\s*=\s*-?\d+x\s*\+\s*b)\s+经过/g, (_, expression) => `$${expression}$ 经过`)
    .replace(/\$(y\s*=\s*-?\d+x\s*\+\s*b)，得\s*(-?\d+)=\$(.*?)\$\+b/g, (_, expression, result, product) => `$${expression}$，得 $${result}=${product}+b$`)
    .replace(/\$(y\s*=\s*-?\d+x\s*\+\s*b)，得\s*(-?\d+)=-\$(.*?)\$\+b/g, (_, expression, result, product) => `$${expression}$，得 $${result}=-${product}+b$`)
    .replace(/\$(y\s*=\s*-?\d+x\s*\+\s*b)，得\s*(-?\d+)=(-?\d+)\s*×\s*(-?\d+)\+b/g, (_, expression, result, left, right) => `$${expression}$，得 $${result}=${left} \\times ${right}+b$`)
    .replace(/\$(y\s*=\s*-?\d+x\s*[+-]\s*-?\d+)\s+与\s+\$(y\s*=\s*-?\d+x\s*[+-]\s*-?\d+)\s+的/g, (_, first, second) => `$${first}$ 与 $${second}$ 的`)
    .replace(/\$(y\s*=\s*-?\d+x\s*[+-]\s*-?\d+)\s+上/g, (_, expression) => `$${expression}$ 上`)
    .replace(/\$(y\s*=\s*-?\d+)\$\s*×\s*(-?\d+)(\s*[+-]\s*-?\d+\s*=\s*-?\d+(?:\.\d+)?)/g, (_, expression, xValue, rest) => `$${expression}\\times ${xValue}${rest}$`)
    .replace(/\$([A-Z])\$\s*([A-Z]\s*=\s*-?\d+(?:\.\d+)?)\$/g, (_, first, rest) => `$${first}${rest}$`)
    .replace(/([A-Z])\$([A-Z]\s*=\s*-?\d+(?:\.\d+)?)\$/g, (_, first, rest) => `$${first}${rest}$`)
    .replace(/(-?\d+)\s*\+\s*(-?\d+)\$(x\s*=\s*-?\d+(?:\.\d+)?)\$/g, (_, left, coefficient, rest) => `$${left}+${coefficient}${rest}$`)
    .replace(/(-?\d+)\$(x\s*=\s*-?\d+(?:\.\d+)?)\$/g, (_, coefficient, rest) => `$${coefficient}${rest}$`)
    .replace(/\$(\d+\s*\\times\s*\d+)\$(x\s*=\s*-?\d+x?)/g, (_, product, tail) => `$${product}${tail}$`)
    .replace(/-\$(\d+\s*\\times\s*\d+)\$(x\s*=\s*-?\d+x?)/g, (_, product, tail) => `$-${product}${tail}$`)
    .replace(/\$(-?\d+\s*\\times\s*-?\d+)\$x=(-?\d+x)/g, (_, product, result) => `$${product}x=${result}$`)
    .replace(/\$(y\s*=\s*-?\d+)\$\s*x\s*([+-]\s*-?\d+)/g, (_, expression, rest) => `$${expression}x${rest}$`)
    .replace(/\$(y\s*=\s*-?\d+)\$\s*x\s*\+\s*b/g, (_, expression) => `$${expression}x+b$`)
    .replace(/\$(\d+(?:\s*\\times\s*\d+)+)\$\s*x\s*\$(\d+(?:\s*\\times\s*\d+)*)\$\s*x\s*(\d+)/g, (_, left, middle, right) => `$${left} \\times ${middle} \\times ${right}$`)
    .replace(/(\d+)\s*=\s*\$(\d+\s*\\times\s*\d+)\$\s*\+\s*(\d+)/g, (_, left, product, remainder) => `$${left} = ${product} + ${remainder}$`);
}

function normalizeLatexEscapes(value: string) {
  return value.replace(/\\{2,}(?=(times|frac|leq|geq|le|ge|cdot|div|Delta)\b|%)/g, "\\");
}

function mapOutsideLatex(value: string, transform: (segment: string) => string) {
  const parts: string[] = [];
  let cursor = 0;
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^)]+?\\\))/g;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(transform(value.slice(cursor, index)));
    parts.push(match[0]);
    cursor = index + match[0].length;
  }

  if (cursor < value.length) parts.push(transform(value.slice(cursor)));
  return parts.join("");
}

function extractLatex(value: string) {
  const expressions: string[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^)]+?\\\))/g;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    expressions.push(
      raw
        .replace(/^\$\$|\$\$$/g, "")
        .replace(/^\$|\$$/g, "")
        .replace(/^\\\[|\\\]$/g, "")
        .replace(/^\\\(|\\\)$/g, "")
    );
  }

  return expressions;
}

function hasAdjacentMathText(value: string) {
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^)]+?\\\))/g;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    const before = start > 0 ? value[start - 1] : "";
    const after = end < value.length ? value[end] : "";

    if (isAdjacentText(before) || isAdjacentText(after)) return true;
  }

  return false;
}

function isAdjacentText(value: string) {
  return /[A-Za-z0-9一-龥]/.test(value);
}

function renderReport(
  before: ReturnType<typeof auditChineseMathText>,
  after: ReturnType<typeof auditChineseMathText>,
  changes: number
) {
  const beforeCounts = before.issueCounts;
  const afterCounts = after.issueCounts;
  const issueTypes: IssueType[] = [
    "double_latex_escape",
    "split_equation_after_math",
    "english_step_label",
    "english_answer_label",
    "ascii_multiplication",
    "ascii_inequality",
    "adjacent_math_text",
    "unbalanced_dollar",
    "katex_render_error"
  ];

  return [
    "# CN Math Text QA v0",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Mode: ${FIX ? "fix" : "audit"}`,
    "",
    "## Summary",
    "",
    `- CN text fields scanned: ${before.locations.length}`,
    `- Text fields changed: ${changes}`,
    `- Issues before: ${before.issues.length}`,
    `- Issues after: ${after.issues.length}`,
    "",
    "## Issue Counts",
    "",
    "| Issue | Before | After |",
    "| --- | ---: | ---: |",
    ...issueTypes.map((type) => `| ${type} | ${beforeCounts[type] ?? 0} | ${afterCounts[type] ?? 0} |`),
    "",
    "## Remaining Samples",
    "",
    ...renderSamples(after.issues),
    "",
    "## QA Policy",
    "",
    "- `double_latex_escape`, `unbalanced_dollar`, and `katex_render_error` are blocking issues.",
    "- `english_step_label` and `english_answer_label` should be removed from Chinese student-facing explanations.",
    "- `ascii_multiplication` is normalized to either `×` in prose or `\\times` inside LaTeX.",
    "- `adjacent_math_text` is tracked as polish debt because Chinese prose often sits next to inline math intentionally."
  ].join("\n");
}

function renderSamples(issues: Issue[]) {
  if (issues.length === 0) return ["No remaining QA issues detected."];

  return issues.slice(0, 30).map((issue) => (
    `- ${issue.type}: \`${issue.id}\` ${issue.field} — ${issue.snippet}`
  ));
}

function updateString<T extends Record<string, unknown>>(
  target: T,
  field: keyof T,
  transform: (value: string) => string
) {
  const value = target[field];
  if (typeof value !== "string") return 0;
  const next = transform(value);
  if (next === value) return 0;
  target[field] = next as T[keyof T];
  return 1;
}

function pushLocation(locations: TextLocation[], id: string, field: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return;
  locations.push({ field, id, text: value });
}

function addIssueIf(issues: Issue[], location: TextLocation, type: IssueType, condition: boolean) {
  if (condition) issues.push(toIssue(location, type));
}

function toIssue(location: TextLocation, type: IssueType): Issue {
  return {
    field: location.field,
    id: location.id,
    snippet: location.text.replace(/\s+/g, " ").slice(0, 140),
    type
  };
}

function isChineseProblem(problem: Problem) {
  return problem.locale?.curriculumSystem === "CN" || problem.locale?.language === "zh";
}

function countUnescapedDollars(value: string) {
  return [...value.matchAll(/(?<!\\)\$/g)].length;
}

function countBy<T, K extends string>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Partial<Record<K, number>>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

main();
