# College Algebra Parsed Textbook

This dataset was extracted from:

```text
/Users/fenmdc/Documents/IMO-中小学奥数/初中数学/College Algebra -- Carl Stitz, Jeff Zeager.pdf
```

The source PDF has an embedded text layer, so OCR was not required.

## Files

- `chunks.json`: 716 page-level chunks.
- `knowledge.json`: lightweight knowledge index aligned to `chunks.json` by `chunkId`.
- `manifest.json`: source metadata, extraction route, counts, concept counts, and chapter counts.
- `text.txt`: full extracted text grouped by page.
- `summary.json`: compact parser summary.

## Project Access

Server-side TypeScript can load the dataset through:

```ts
import {
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";
```

The app route `/api/textbooks/college-algebra-stitz-zeager` returns the manifest by default.
Use `?include=chunks`, `?include=knowledge`, or `?include=all` to include larger payloads.

## Quality Notes

Chunks are page-level to preserve formula, figure, example, and exercise context.
Knowledge extraction is regex/lightweight and should be treated as a searchable index, not a fully curated ontology.
