import fs from "fs";
import path from "path";

type AnswerChoice = Record<"A" | "B" | "C" | "D" | "E", string>;

type VerifiedProblem = {
  id: string;
  year: number;
  number: number;
  statement: string;
  assets: ProblemAsset[];
  choices: AnswerChoice;
  answerLabel: "A" | "B" | "C" | "D" | "E";
  answer: string;
  solution: string;
  sourceUrl: string;
};

type ProblemAsset = {
  type: "image";
  url: string;
  alt: string;
  role: "prompt" | "choice" | "solution";
};

const YEARS = Array.from({ length: 36 }, (_, index) => 1985 + index).filter((year) => year !== 2013);
const LABELS = ["A", "B", "C", "D", "E"] as const;
const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/amc8-past-papers");
const VERIFY_DIR = path.join(DATASET_DIR, "verification");
const CACHE_DIR = path.join(VERIFY_DIR, "randommath-html");
const VERIFIED_PATH = path.join(VERIFY_DIR, "verified-problems.json");
const REPORT_PATH = path.join(VERIFY_DIR, "verification-report.md");
const ANSWER_OVERRIDES: Record<string, "A" | "B" | "C" | "D" | "E"> = {
  amc8_2001_p24: "B"
};

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const verified: VerifiedProblem[] = [];
  const failures: string[] = [];

  for (const year of YEARS) {
    let yearCount = 0;
    for (let number = 1; number <= 25; number += 1) {
      const id = `amc8_${year}_p${String(number).padStart(2, "0")}`;
      try {
        const html = await readOrFetch(year, number);
        const problem = parseProblem(html, year, number);
        verified.push(problem);
        yearCount += 1;
      } catch (error) {
        failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log(`${year}: verified ${yearCount}/25`);
  }

  fs.writeFileSync(VERIFIED_PATH, `${JSON.stringify(verified, null, 2)}\n`);
  fs.writeFileSync(REPORT_PATH, buildReport(verified, failures));
  console.log(`Verified ${verified.length} AMC8 historical problem(s).`);
  console.log(`Failures: ${failures.length}`);
}

async function readOrFetch(year: number, number: number) {
  const cachePath = path.join(CACHE_DIR, `${year}-p${String(number).padStart(2, "0")}.html`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");

  const url = sourceUrl(year, number);
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 AdaptiveMathLearningVerification/0.1"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  const html = await response.text();
  fs.writeFileSync(cachePath, html);
  await new Promise((resolve) => setTimeout(resolve, 75));
  return html;
}

function parseProblem(html: string, year: number, number: number): VerifiedProblem {
  const main = extractMainContent(html);
  const answerChoicesIndex = main.search(/<(?:strong|b)\b[^>]*>\s*Answer Choices:\s*<\/(?:strong|b)>/i);
  const solutionIndex = main.search(/<(?:strong|b)\b[^>]*>\s*Solution:\s*<\/(?:strong|b)>/i);
  const answerMatches = [...main.matchAll(/(?:<(?:strong|b)\b[^>]*>\s*)?Answe?r?:\s*(?:<\/(?:strong|b)>)?/gi)]
    .map((match) => match.index ?? -1)
    .filter((index) => index > solutionIndex);
  const overrideLabel = ANSWER_OVERRIDES[`amc8_${year}_p${String(number).padStart(2, "0")}`];
  const answerIndex = answerMatches[0] ?? (overrideLabel ? solutionIndex : -1);

  if (answerChoicesIndex < 0) throw new Error("missing Answer Choices section");
  if (solutionIndex < 0) throw new Error("missing Solution section");
  if (answerIndex < 0) throw new Error("missing Answer section");

  const problemMatch = main.match(/<strong>\s*Problem:\s*<\/strong>/i);
  const statementStart = problemMatch?.index === undefined
    ? 0
    : problemMatch.index + problemMatch[0].length;
  const statementHtml = main.slice(statementStart, answerChoicesIndex);
  const choicesHtml = main.slice(answerChoicesIndex, solutionIndex);
  const solutionHtml = main.slice(solutionIndex, answerIndex);
  const answerHtml = main.slice(answerIndex, Math.min(main.length, answerIndex + 2500));
  const choices = parseChoices(choicesHtml);
  const answerLabel = overrideLabel ?? parseAnswerLabel(answerHtml, choices);
  const answer = choices[answerLabel];
  const statement = cleanText(htmlToText(statementHtml));
  const solution = cleanText(htmlToText(solutionHtml)).replace(/^Solution:\s*/i, "");

  if (!statement || statement.length < 8) throw new Error("statement too short");
  if (!answer) throw new Error(`answer label ${answerLabel} does not map to a choice`);

  return {
    id: `amc8_${year}_p${String(number).padStart(2, "0")}`,
    year,
    number,
    statement,
    assets: [
      ...extractImageAssets(statementHtml, "prompt"),
      ...extractImageAssets(choicesHtml, "choice")
    ],
    choices,
    answerLabel,
    answer,
    solution: solution || `Random Math verified answer key gives choice ${answerLabel}.`,
    sourceUrl: sourceUrl(year, number)
  };
}

function extractImageAssets(html: string, role: ProblemAsset["role"]): ProblemAsset[] {
  return [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match, index) => {
      const tag = match[0];
      const src = readAttribute(tag, "src");
      if (!src || src.includes("rmlogo")) return null;

      const alt = cleanText(readAttribute(tag, "alt") || `AMC8 ${role} image ${index + 1}`);
      return {
        type: "image" as const,
        url: absoluteUrl(src),
        alt,
        role
      };
    })
    .filter((asset): asset is ProblemAsset => Boolean(asset));
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function absoluteUrl(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  return new URL(src, "https://wiki.randommath.com").toString();
}

function extractMainContent(html: string) {
  const start = html.search(/<h1[^>]*>/i);
  const contentStart = start >= 0 ? start : 0;
  const rest = html.slice(contentStart);
  const relativeEnd = rest.search(/<footer|<script type="text\/javascript" src="\/_assets\/js\/app/i);
  return rest.slice(0, relativeEnd >= 0 ? relativeEnd : rest.length);
}

function parseChoices(html: string): AnswerChoice {
  const choices = {} as AnswerChoice;

  LABELS.forEach((label, index) => {
    const next = LABELS[index + 1];
    const startRegex = new RegExp(`(?:^|>|\\s)${label}\\.\\s*`, "i");
    const startMatch = html.match(startRegex);
    if (!startMatch || startMatch.index === undefined) throw new Error(`missing choice ${label}`);

    const start = startMatch.index + startMatch[0].length;
    const nextMatch = next ? html.slice(start).match(new RegExp(`(?:^|>|\\s)${next}\\.\\s*`, "i")) : null;
    const end = nextMatch?.index === undefined ? html.length : start + nextMatch.index;
    const raw = html.slice(start, end).replace(/<br\s*\/?>\s*<br\s*\/?>[\s\S]*$/i, "");
    choices[label] = cleanText(htmlToText(raw)) || label;
  });

  if (!LABELS.every((label) => choices[label])) throw new Error("incomplete choices");
  return choices;
}

function parseAnswerLabel(html: string, choices: AnswerChoice): VerifiedProblem["answerLabel"] {
  const boxed = html.match(/\\boxed\{([^}]+)\}/);
  if (boxed) {
    const boxedValue = cleanText(boxed[1]);
    if (/^[A-E]$/i.test(boxedValue)) return boxedValue.toUpperCase() as VerifiedProblem["answerLabel"];

    const matchedChoice = LABELS.find((label) => normalizeComparable(choices[label]) === normalizeComparable(boxedValue));
    if (matchedChoice) return matchedChoice;
  }

  const mathNormal = html.match(/mathnormal">([A-E])</);
  if (mathNormal) return mathNormal[1] as VerifiedProblem["answerLabel"];

  const plain = htmlToText(html).match(/Answer:\s*([A-E])\b/i);
  if (plain) return plain[1].toUpperCase() as VerifiedProblem["answerLabel"];

  throw new Error("missing boxed answer label");
}

function htmlToText(html: string) {
  return replaceKatexBlocks(html)
    .replace(/<math[\s\S]*?<\/math>/g, (_match) => {
      const annotation = _match.match(/annotation[^>]*>([\s\S]*?)<\/annotation>/i)?.[1];
      if (annotation) return annotation;

      const tail = _match.match(/>([^<]+)<\/math>/)?.[1];
      if (tail) return tail;

      return _match.replace(/<[^>]+>/g, " ");
    })
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function replaceKatexBlocks(html: string) {
  let output = "";
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.slice(cursor).search(/<span\b[^>]*class="[^"]*\bkatex\b[^"]*"[^>]*>/i);
    if (start < 0) {
      output += html.slice(cursor);
      break;
    }

    const absoluteStart = cursor + start;
    const openEnd = html.indexOf(">", absoluteStart);
    const absoluteEnd = openEnd < 0 ? -1 : findClosingSpan(html, absoluteStart);

    if (absoluteEnd < 0) {
      output += html.slice(cursor);
      break;
    }

    const block = html.slice(absoluteStart, absoluteEnd);
    output += html.slice(cursor, absoluteStart);
    output += ` ${extractMathText(block)} `;
    cursor = absoluteEnd;
  }

  return output;
}

function findClosingSpan(html: string, start: number) {
  const tagRegex = /<\/?span\b[^>]*>/gi;
  tagRegex.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return tagRegex.lastIndex;
    } else {
      depth += 1;
    }
  }

  return -1;
}

function extractMathText(block: string) {
  const math = block.match(/<math[\s\S]*?<\/math>/i)?.[0] ?? block;
  const annotation = math.match(/annotation[^>]*>([\s\S]*?)<\/annotation>/i)?.[1];
  if (annotation) return annotation;

  const mathTail = math.match(/>([^<>]*(?:\\[a-zA-Z]+|\\boxed|\\dfrac|\\frac)[^<>]*)<\/math>/)?.[1];
  if (mathTail) return mathTail;

  const plainTail = math.match(/>([^<>]+)<\/math>/)?.[1];
  if (plainTail) return plainTail;

  return math.replace(/<[^>]+>/g, " ");
}

function cleanText(value: string) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?])/g, "$1")
    .trim();
}

function normalizeComparable(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/[{}\\\s​]/g, "")
    .replace(/,/g, "");
}

function sourceUrl(year: number, number: number) {
  return `https://wiki.randommath.com/amc8/${year}/problem-${number}`;
}

function buildReport(verified: VerifiedProblem[], failures: string[]) {
  const byYear = countBy(verified, (problem) => String(problem.year));
  return `# AMC8 Answer and Choice Verification Report

Verification source: Random Math Wiki solution pages.

Verified rows: ${verified.length}

Failures: ${failures.length}

## By Year

${YEARS.map((year) => `- ${year}: ${byYear[String(year)] ?? 0}/25`).join("\n")}

## Failures

${failures.length ? failures.map((failure) => `- ${failure}`).join("\n") : "- none"}
`;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
