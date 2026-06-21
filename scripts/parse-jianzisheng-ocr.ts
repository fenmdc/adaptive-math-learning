import fs from "fs";
import path from "path";

type ColumnType = "topic_overview" | "worked_example" | "thinking_training" | "competition_boost" | "unknown";

type ParsedBlock = {
  id: string;
  grade: string;
  sourceFile: string;
  pageStart: number;
  pageEnd: number;
  lessonNo: number | null;
  lessonTitle: string;
  column: ColumnType;
  rawHeading: string;
  text: string;
  questionCandidates: QuestionCandidate[];
};

type QuestionCandidate = {
  localNo: string;
  prompt: string;
  hasAnalysis: boolean;
  hasSolution: boolean;
};

type PageText = {
  page: number;
  text: string;
};

const DATASET_DIR = path.join(process.cwd(), "datasets/textbooks/jianzisheng-bank-1-12");
const DEFAULT_SOURCE_FILE = "尖子生高分题库1年级.pdf";

function main() {
  const grade = readArg("--grade") ?? "grade1";
  const input = readArg("--input") ?? path.join(DATASET_DIR, "ocr", grade, "pages-007-040.txt");
  const sourceFile = readArg("--source-file") ?? DEFAULT_SOURCE_FILE;
  const pageStart = Number(readArg("--page-start") ?? "7");
  const contentStartPage = Number(readArg("--content-start-page") ?? String(pageStart));
  const outputDir = readArg("--output") ?? path.join(DATASET_DIR, "parsed", grade);

  if (!fs.existsSync(input)) {
    throw new Error(`OCR sidecar not found: ${input}`);
  }

  const pages = readSidecarPages(input, pageStart).filter((page) => page.page >= contentStartPage);
  const blocks = parsePages({ grade, pages, sourceFile });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "column_blocks.json"), `${JSON.stringify(blocks, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "column_blocks.md"), renderMarkdown(blocks));
  fs.writeFileSync(path.join(outputDir, "parse-summary.json"), `${JSON.stringify(summarize(blocks, pages), null, 2)}\n`);

  const summary = summarize(blocks, pages);
  console.log("Jian Zi Sheng OCR parse");
  console.log(`- Grade: ${grade}`);
  console.log(`- Input pages: ${pages[0]?.page ?? pageStart}-${pages[pages.length - 1]?.page ?? pageStart}`);
  console.log(`- Blocks: ${blocks.length}`);
  console.log(`- Questions: ${summary.questionCandidates}`);
  console.log(`- Output: ${path.relative(process.cwd(), outputDir)}`);
  Object.entries(summary.columns).forEach(([column, count]) => {
    console.log(`  - ${column}: ${count}`);
  });
}

function readSidecarPages(filePath: string, pageStart: number): PageText[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const segments = raw.split("\f");
  let page = pageStart - 1;

  return segments.flatMap((segment) => {
    page += 1;
    const text = cleanPageText(segment);
    if (!text || /^\[OCR skipped/i.test(text)) return [];
    return [{ page, text }];
  });
}

function parsePages({
  grade,
  pages,
  sourceFile
}: {
  grade: string;
  pages: PageText[];
  sourceFile: string;
}): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let activeLessonNo: number | null = null;
  let activeLessonTitle = "";
  let activeBlock: Omit<ParsedBlock, "id" | "pageEnd" | "questionCandidates"> | null = null;

  function flush(pageEnd: number) {
    if (!activeBlock) return;
    const text = activeBlock.text.trim();
    if (text.length < 12) {
      activeBlock = null;
      return;
    }

    blocks.push({
      ...activeBlock,
      id: `${grade}_b${String(blocks.length + 1).padStart(4, "0")}`,
      pageEnd,
      text,
      questionCandidates: extractQuestionCandidates(text)
    });
    activeBlock = null;
  }

  pages.forEach((page) => {
    const lines = page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    lines.forEach((line) => {
      const lesson = parseLessonHeading(line);
      if (lesson) {
        flush(page.page);
        activeLessonNo = lesson.no;
        activeLessonTitle = lesson.title;
        activeBlock = {
          grade,
          sourceFile,
          pageStart: page.page,
          lessonNo: activeLessonNo,
          lessonTitle: activeLessonTitle,
          column: "unknown",
          rawHeading: line,
          text: line
        };
        return;
      }

      const column = detectColumn(line);
      if (column !== "unknown") {
        flush(page.page);
        activeBlock = {
          grade,
          sourceFile,
          pageStart: page.page,
          lessonNo: activeLessonNo,
          lessonTitle: activeLessonTitle,
          column,
          rawHeading: line,
          text: line
        };
        return;
      }

      if (!activeBlock) {
        activeBlock = {
          grade,
          sourceFile,
          pageStart: page.page,
          lessonNo: activeLessonNo,
          lessonTitle: activeLessonTitle,
          column: "unknown",
          rawHeading: "unlabeled",
          text: ""
        };
      }

      activeBlock.text = `${activeBlock.text}\n${line}`.trim();
    });
  });

  flush(pages[pages.length - 1]?.page ?? 0);
  return mergeContinuationBlocks(blocks);
}

function parseLessonHeading(line: string) {
  const normalized = normalizeForMatch(line);
  const match =
    normalized.match(/第\s*(\d{1,2}|[一二三四五六七八九十]{1,4})\s*讲\s*(.*)$/) ??
    normalized.match(/^第(\d{1,2}|[一二三四五六七八九十]{1,4})讲(.*)$/);
  if (!match) return null;

  return {
    no: parseLessonNo(match[1]),
    title: cleanupTitle(match[2] || line)
  };
}

function detectColumn(line: string): ColumnType {
  const normalized = normalizeForMatch(line);

  if (/专题概述|专题槪述|知识梳理|知识整理|专题/.test(normalized)) return "topic_overview";
  if (/典型例题|例题/.test(normalized)) return "worked_example";
  if (/思维训练|思惟训练|双基训练|基础训练|训练/.test(normalized)) return "thinking_training";
  if (/竞赛强化|拓展资源|能力提升|压轴|竞赛|强化/.test(normalized)) return "competition_boost";
  return "unknown";
}

function parseLessonNo(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return chineseNumber(value);
}

function chineseNumber(value: string) {
  const digits: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
  };

  if (value === "十") return 10;
  const tenIndex = value.indexOf("十");
  if (tenIndex >= 0) {
    const left = value.slice(0, tenIndex);
    const right = value.slice(tenIndex + 1);
    return (left ? digits[left] ?? 0 : 1) * 10 + (right ? digits[right] ?? 0 : 0);
  }

  return digits[value] ?? 0;
}

function mergeContinuationBlocks(blocks: ParsedBlock[]) {
  const merged: ParsedBlock[] = [];

  blocks.forEach((block) => {
    const previous = merged[merged.length - 1];
    const shouldMerge =
      previous &&
      block.column === "unknown" &&
      previous.lessonNo === block.lessonNo &&
      block.text.length < 900;

    if (shouldMerge) {
      previous.pageEnd = Math.max(previous.pageEnd, block.pageEnd);
      previous.text = `${previous.text}\n${block.text}`;
      previous.questionCandidates = extractQuestionCandidates(previous.text);
      return;
    }

    merged.push({ ...block, id: `${block.grade}_b${String(merged.length + 1).padStart(4, "0")}` });
  });

  return merged;
}

function extractQuestionCandidates(text: string): QuestionCandidate[] {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const questions: QuestionCandidate[] = [];
  let current: { localNo: string; lines: string[] } | null = null;

  function flush() {
    if (!current) return;
    const prompt = current.lines.join(" ").replace(/\s+/g, " ").trim();
    if (prompt.length >= 8) {
      questions.push({
        localNo: current.localNo,
        prompt: prompt.slice(0, 800),
        hasAnalysis: /分析/.test(prompt),
        hasSolution: /(^|\s)解\s|答案/.test(prompt)
      });
    }
    current = null;
  }

  lines.forEach((line) => {
    const match = line.match(/^(?:题)?\s*(\d{1,2}|[一二三四五六七八九十]+)[\.,，、．]\s*(.+)$/);
    if (match) {
      flush();
      current = { localNo: match[1], lines: [match[2]] };
      return;
    }

    if (/^(分析|解|答案|提示)/.test(line) && current) {
      current.lines.push(line);
      return;
    }

    if (current && !detectColumn(line).includes("training") && !parseLessonHeading(line)) {
      current.lines.push(line);
    }
  });

  flush();
  return questions;
}

function summarize(blocks: ParsedBlock[], pages: PageText[]) {
  return {
    pages: pages.length,
    blocks: blocks.length,
    questionCandidates: blocks.reduce((sum, block) => sum + block.questionCandidates.length, 0),
    columns: countBy(blocks, (block) => block.column),
    lessons: [...new Set(blocks.map((block) => block.lessonNo).filter((item) => item !== null))],
    pageRange: {
      start: pages[0]?.page ?? null,
      end: pages[pages.length - 1]?.page ?? null
    }
  };
}

function renderMarkdown(blocks: ParsedBlock[]) {
  return [
    "# Jian Zi Sheng OCR Column Blocks",
    "",
    ...blocks.flatMap((block) => [
      `## ${block.id} · ${formatColumn(block.column)} · pages ${block.pageStart}-${block.pageEnd}`,
      "",
      `- Lesson: ${block.lessonNo ?? "unknown"} ${block.lessonTitle}`,
      `- Raw heading: ${block.rawHeading}`,
      `- Question candidates: ${block.questionCandidates.length}`,
      "",
      "```text",
      block.text.slice(0, 1800),
      "```",
      "",
      ...block.questionCandidates.slice(0, 5).flatMap((question) => [
        `- Q${question.localNo}: ${question.prompt.slice(0, 260)}`,
        ""
      ])
    ])
  ].join("\n");
}

function cleanPageText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForMatch(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[|〔〕【】\[\]()（）<>《》]/g, "")
    .replace(/[—_]+/g, "");
}

function cleanupTitle(value: string) {
  return value
    .replace(/[a-zA-Z|"'`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatColumn(column: ColumnType) {
  const labels: Record<ColumnType, string> = {
    competition_boost: "竞赛强化",
    thinking_training: "思维训练",
    topic_overview: "专题概述",
    unknown: "未标注",
    worked_example: "典型例题"
  };

  return labels[column];
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

main();
