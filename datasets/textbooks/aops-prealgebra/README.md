# AoPS Prealgebra Parsed Textbook

This dataset was extracted from:

```text
/Users/fenmdc/Documents/IMO-中小学奥数/AoPS/01-Prealgebra.pdf
```

The source PDF is image/scanned-heavy, so OCR was required before text chunking.

## Files

- `chunks.json`: 119 OCR text chunks, one per extracted page-sized unit.
- `knowledge.json`: lightweight knowledge index aligned to `chunks.json` by `chunkId`.
- `manifest.json`: source metadata, extraction route, page/chunk counts, and concept counts.
- `text.txt`: full OCR text used to produce the chunks.
- `summary.json`: parser route summary from the textbook parser pipeline.

## Project Access

Server-side TypeScript can load the dataset through:

```ts
import {
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";
```

The app route `/api/textbooks/aops-prealgebra` returns the manifest by default.
Use `?include=chunks`, `?include=knowledge`, or `?include=all` to include larger payloads.

## Quality Notes

OCR quality warnings appeared on some pages, especially around formulas and dense layouts.
Treat formulas and extracted equations as approximate until a full Marker/vision pass replaces the OCR text route.
