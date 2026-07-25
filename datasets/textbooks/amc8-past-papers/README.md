# AMC 8 Past Papers Parsed Dataset

This dataset was extracted from:

```text
/Users/fenmdc/Documents/IMO-中小学奥数/AMC/AMC8真题
```

It includes 38 PDF documents: AMC 8 papers from 1985 through 2020, a 2016 practice problem PDF, and a 2024 bilingual Chinese/English PDF with answers.

## Files

- `chunks.json`: 916 chunks, primarily one chunk per AMC 8 problem.
- `knowledge.json`: lightweight knowledge index aligned to `chunks.json` by `chunkId`.
- `manifest.json`: source metadata, extraction route, counts by year, concept counts, and per-file quality notes.
- `text.txt`: full extracted text grouped by source PDF.
- `summary.json`: compact parser summary and weak-file list.

## Project Access

Server-side TypeScript can load the dataset through:

```ts
import {
  AMC8_PAST_PAPERS_ID,
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";

const manifest = loadTextbookManifest(AMC8_PAST_PAPERS_ID);
const chunks = loadTextbookChunks(AMC8_PAST_PAPERS_ID);
const knowledge = loadTextbookKnowledge(AMC8_PAST_PAPERS_ID);
```

The app route `/api/textbooks/amc8-past-papers` returns the manifest by default.
Use `?include=chunks`, `?include=knowledge`, or `?include=all` to include larger payloads.

## Quality Notes

Most PDFs had embedded text and were extracted with `pdftext`.
`2013AMC8.pdf` and `2024 AMC8 美国数学比赛题目与答案.pdf` were OCR-processed first because their original text layers were missing or sparse.

Some older AoPS PDFs interleave diagram labels, formula fragments, and problem numbers. When a paper could not be confidently split into all 25 individual problems, the dataset includes a `kind: "exam_fallback"` full-exam chunk and records missing problem numbers in `manifest.fileStats`.
Knowledge extraction is lightweight and intended for retrieval/filtering, not a curated ontology.
