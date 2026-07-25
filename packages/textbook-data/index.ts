import fs from "fs";
import path from "path";

export const AOPS_PREALGEBRA_ID = "aops-prealgebra";
export const ISE_DEVELOPMENTAL_MATHEMATICS_2E_ID = "ise-developmental-mathematics-2e";
export const AMC8_PAST_PAPERS_ID = "amc8-past-papers";
export const COLLEGE_ALGEBRA_STITZ_ZEAGER_ID = "college-algebra-stitz-zeager";
export const MATHEMATICS_FOR_ENGINEERS_CROFT_DAVISON_ID = "mathematics-for-engineers-croft-davison";

export type TextbookChunk = {
  id: string;
  index: number;
  page?: number;
  year?: number;
  exam?: string;
  variant?: string;
  kind?: string;
  problemNumber?: number | null;
  missingProblemNumbers?: number[];
  charCount: number;
  title?: string;
  sourcePdf?: string;
  content: string;
};

export type TextbookLocation = {
  number: number | string;
  title: string;
};

export type TextbookKnowledgeItem = {
  chunkId: string;
  index: number;
  page?: number;
  year?: number;
  exam?: string;
  variant?: string;
  kind?: string;
  problemNumber?: number | null;
  missingProblemNumbers?: number[];
  title: string;
  chapter?: TextbookLocation | null;
  section?: TextbookLocation | null;
  unitTypes: string[];
  concepts: string[];
  problemIds: string[];
  problemCount: number;
  examples?: string[];
  choices?: Array<{
    label: string;
    text: string;
  }>;
  equations: string[];
  vocabulary: string[];
  charCount: number;
  source: {
    textbook: string;
    extractionRoute: string;
    sourcePdf?: string;
  };
};

export type TextbookManifest = {
  id: string;
  title: string;
  authors?: string[];
  sourcePdf?: string;
  sourceDir?: string;
  sourcePdfs?: string[];
  searchablePdf?: string;
  extractionDate: string;
  route: string;
  pageCount: number;
  fileCount?: number;
  chunkCount: number;
  knowledgeItemCount: number;
  chunking?: string;
  conceptCounts: Record<string, number>;
  chapterCounts?: Record<string, number>;
  yearCounts?: Record<string, number>;
  fileStats?: Array<Record<string, unknown>>;
  notes: string[];
};

export type TextbookDataset = {
  manifest: TextbookManifest;
  chunks: TextbookChunk[];
  knowledge: TextbookKnowledgeItem[];
};

const textbookDataRoot = path.join(process.cwd(), "datasets", "textbooks");

export function getTextbookDataDir(textbookId = AOPS_PREALGEBRA_ID) {
  return path.join(textbookDataRoot, textbookId);
}

export function loadTextbookManifest(textbookId = AOPS_PREALGEBRA_ID) {
  return readJson<TextbookManifest>(textbookId, "manifest.json");
}

export function loadTextbookChunks(textbookId = AOPS_PREALGEBRA_ID) {
  return readJson<TextbookChunk[]>(textbookId, "chunks.json");
}

export function loadTextbookKnowledge(textbookId = AOPS_PREALGEBRA_ID) {
  return readJson<TextbookKnowledgeItem[]>(textbookId, "knowledge.json");
}

export function loadTextbookDataset(textbookId = AOPS_PREALGEBRA_ID): TextbookDataset {
  return {
    manifest: loadTextbookManifest(textbookId),
    chunks: loadTextbookChunks(textbookId),
    knowledge: loadTextbookKnowledge(textbookId)
  };
}

function readJson<T>(textbookId: string, filename: string): T {
  const filePath = path.join(getTextbookDataDir(textbookId), filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}
