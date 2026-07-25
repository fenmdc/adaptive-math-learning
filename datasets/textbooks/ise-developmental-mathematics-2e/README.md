# ISE Developmental Mathematics Parsed Textbook

This dataset was extracted from:

```text
/Users/fenmdc/Documents/IMO-中小学奥数/初中数学/ISE DEVELOPMENTAL MATHEMATICS _ second edition.pdf
```

The source PDF has an embedded text layer, so OCR was not required.

## Files

- `chunks.json`: 1939 page-level chunks with stable page numbers.
- `knowledge.json`: lightweight knowledge index aligned to `chunks.json` by `chunkId`.
- `manifest.json`: source metadata, extraction route, page/chunk counts, concept counts, and chapter counts.
- `text.txt`: full extracted text used to produce the chunks.
- `summary.json`: parser route summary for this extraction.

## Project Access

Server-side TypeScript can load the dataset through:

```ts
import {
  ISE_DEVELOPMENTAL_MATHEMATICS_2E_ID,
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";

const manifest = loadTextbookManifest(ISE_DEVELOPMENTAL_MATHEMATICS_2E_ID);
const chunks = loadTextbookChunks(ISE_DEVELOPMENTAL_MATHEMATICS_2E_ID);
const knowledge = loadTextbookKnowledge(ISE_DEVELOPMENTAL_MATHEMATICS_2E_ID);
```

The app route `/api/textbooks/ise-developmental-mathematics-2e` returns the manifest by default.
Use `?include=chunks`, `?include=knowledge`, or `?include=all` to include larger payloads.

## Quality Notes

Chunks are page-level for predictable lookup across a 1939-page textbook.
Knowledge extraction is regex/lightweight and should be treated as a searchable index, not a fully curated ontology.
