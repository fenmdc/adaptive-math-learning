import fs from "node:fs";
import path from "node:path";

import type { PracticeProblem, ProblemBank } from "./types";

type CsvRecord = Record<string, string>;

export function parseCsv(content: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function splitTags(value: string) {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function generateChoices(answer: string, problemId: string) {
  let distractors: string[];
  const numeric = Number(answer);
  const fraction = answer.match(/^(-?\d+)\/(\d+)$/);
  const coefficient = answer.match(/^(\d+)([a-zπ])$/i);

  if (answer && Number.isFinite(numeric)) {
    const step = Math.abs(numeric) < 1 ? 0.1 : 1;
    distractors = [numeric - step, numeric + step, numeric * 2]
      .map((value) => formatNumber(value))
      .filter((value) => value !== answer);
  } else if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    distractors = [
      `${numerator + 1}/${denominator}`,
      `${numerator}/${denominator + 1}`,
      `${denominator}/${numerator}`,
    ];
  } else if (coefficient) {
    const value = Number(coefficient[1]);
    const variable = coefficient[2];
    distractors = [`${value - 1}${variable}`, `${value + 1}${variable}`, `${value * 2}${variable}`];
  } else {
    distractors = [`${answer}+1`, `2(${answer})`, `-${answer}`];
  }

  const uniqueChoices = [...new Set([answer, ...distractors])].slice(0, 4);
  for (let fallback = 1; uniqueChoices.length < 4; fallback += 1) {
    uniqueChoices.push(`Option ${fallback}`);
  }

  const offset = [...problemId].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  return uniqueChoices.map((_, index) => uniqueChoices[(index + offset) % uniqueChoices.length]);
}

export function loadProblemBank(root = process.cwd()): ProblemBank {
  const problemRecords = parseCsv(
    fs.readFileSync(path.join(root, "datasets", "problems", "problems.csv"), "utf8"),
  );
  const conceptRecords = parseCsv(
    fs.readFileSync(path.join(root, "datasets", "concepts", "concepts.csv"), "utf8"),
  );
  const conceptNames = new Map(conceptRecords.map((record) => [record.id, record.name]));

  const problems = problemRecords.flatMap<PracticeProblem>((record) => {
    const concepts = splitTags(record.concepts);
    if (!record.id || !record.statement || !record.answer || !concepts.length) return [];

    return [{
      id: record.id,
      statement: record.statement,
      answer: record.answer,
      choices: record.choices ? splitTags(record.choices) : generateChoices(record.answer, record.id),
      difficulty: Number(record.difficulty) || 1,
      concepts,
      conceptLabel: conceptNames.get(concepts[0]) ?? concepts[0],
      conceptLabels: Object.fromEntries(concepts.map((concept) => [concept, conceptNames.get(concept) ?? concept])),
      skills: splitTags(record.skills),
      patterns: splitTags(record.patterns),
      misconception: record.misconceptions || undefined,
      explanation: record.solution || `The correct answer is ${record.answer}.`,
    }];
  });

  return {
    totalRecords: problemRecords.length,
    skippedRecords: problemRecords.length - problems.length,
    problems,
  };
}
