# CN Junior High Parse Readiness v0

Generated at: 2026-06-16T05:44:00Z

## Scope

This is the first junior-high parsing checkpoint after the elementary pilot bank reached a stable coverage point.

Local source set:

- Grade 7: `/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12/尖子生高分题库7年级.pdf`
- Grade 8: `/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12/尖子生高分题库8年级.pdf`
- Grade 9: `/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12/尖子生高分题库9年级.pdf`

Known page counts:

- Grade 7: 322 pages
- Grade 8: 294 pages
- Grade 9: 272 pages

## Completed Checkpoint

Grade 7 sample OCR was run on pages 1-40 with content starting at page 7.

Artifacts:

- OCR sidecar: `datasets/textbooks/jianzisheng-bank-1-12/ocr/grade7/pages-1-40.txt`
- Parsed blocks: `datasets/textbooks/jianzisheng-bank-1-12/parsed/grade7/column_blocks.json`
- Parse report: `datasets/textbooks/jianzisheng-bank-1-12/review/grade7-ocr-parse-report.md`
- Cleaned review: `datasets/textbooks/jianzisheng-bank-1-12/review/cleaned/grade7-cleaning-report.md`

## Parser Changes

The OCR parser was upgraded for junior-high books:

- Chinese lesson headings such as `第一讲`, `第二讲`, `第十一讲` are now recognized.
- `知识梳理` is mapped to `topic_overview`.
- `双基训练` and `基础训练` are mapped to `thinking_training`.
- `能力提升`, `拓展资源`, and `压轴` are mapped to `competition_boost`.
- The review cleaner can now run on an explicit grade list, so junior parsing can be cleaned separately from the elementary pipeline.

## Grade 7 Sample Result

After parser upgrade:

- Pages parsed: 34
- Parsed blocks: 11
- Question candidates: 119
- Column distribution:
  - `unknown`: 3
  - `topic_overview`: 1
  - `thinking_training`: 3
  - `competition_boost`: 4
- Lesson ids recognized: 2 and 4

The parser is now usable for junior-high review artifacts, but not yet ready for direct promotion. The current weak spot is lesson-boundary reliability around the first chapter and noisy page headers.

## Quality Notes

- OCR quality is mixed. Tesseract reports several pages with possible poor OCR, and the parsed text includes English noise fragments such as `Riise`, `MBER`, and `TALS`.
- Question candidate extraction is strong enough for review: 119 candidates from a 34-page sample.
- Lesson detection improved substantially after Chinese numeral support, but the first lesson is still partially `unknown` due to page/header noise.
- The cleaned review layer correctly marks noisy blocks as high-priority review instead of treating them as promotion-ready content.

## Recommendation

Proceed in two careful steps:

1. Run the same 40-page OCR/parse sample for Grade 8 and Grade 9.
2. Compare Grade 7/8/9 parse quality before running full OCR.

Only after the three-grade sample is stable should we run full OCR for Grade 7-9 and generate a small junior-high pilot. The first junior pilot should focus on project-native original-equivalent problems, not direct OCR problem text, with source blocks retained only for QA traceability.

## Proposed Junior Pilot Topics

Grade 7:

- rational numbers and number line
- opposites and absolute value
- integer/rational operations
- simple linear equations
- algebraic expressions

Grade 8:

- triangles and congruence
- square roots and Pythagorean theorem
- linear functions
- inequalities

Grade 9:

- quadratic functions
- similar triangles
- circles
- probability/statistics review

