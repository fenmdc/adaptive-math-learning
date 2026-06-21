# CN Junior High Sample Parse Comparison v0

Generated at: 2026-06-16T05:55:00Z

## Scope

This report compares 40-page OCR/parse samples for the Jian Zi Sheng junior-high set.

Sample settings:

- Grade 7: pages 1-40, content start page 7
- Grade 8: pages 1-40, content start page 7
- Grade 9: pages 1-40, content start page 7
- OCR language: `chi_sim+eng`
- OCR jobs: 2

## Sample Artifacts

| Grade | OCR sidecar | Parsed blocks | Parse report | Cleaning report |
| --- | --- | --- | --- | --- |
| Grade 7 | `datasets/textbooks/jianzisheng-bank-1-12/ocr/grade7/pages-1-40.txt` | `datasets/textbooks/jianzisheng-bank-1-12/parsed/grade7/column_blocks.json` | `datasets/textbooks/jianzisheng-bank-1-12/review/grade7-ocr-parse-report.md` | `datasets/textbooks/jianzisheng-bank-1-12/review/cleaned/grade7-cleaning-report.md` |
| Grade 8 | `datasets/textbooks/jianzisheng-bank-1-12/ocr/grade8/pages-1-40.txt` | `datasets/textbooks/jianzisheng-bank-1-12/parsed/grade8/column_blocks.json` | `datasets/textbooks/jianzisheng-bank-1-12/review/grade8-ocr-parse-report.md` | `datasets/textbooks/jianzisheng-bank-1-12/review/cleaned/grade8-cleaning-report.md` |
| Grade 9 | `datasets/textbooks/jianzisheng-bank-1-12/ocr/grade9/pages-1-40.txt` | `datasets/textbooks/jianzisheng-bank-1-12/parsed/grade9/column_blocks.json` | `datasets/textbooks/jianzisheng-bank-1-12/review/grade9-ocr-parse-report.md` | `datasets/textbooks/jianzisheng-bank-1-12/review/cleaned/grade9-cleaning-report.md` |

## Quantitative Comparison

| Grade | Pages parsed | Blocks | Question candidates | Unknown blocks | Worked examples | High-priority review | Lesson ids recognized |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Grade 7 | 34 | 11 | 119 | 3 original / 1 cleaned | 0 | 7 | 2, 4 |
| Grade 8 | 34 | 18 | 153 | 1 original / 0 cleaned | 3 | 1 | none |
| Grade 9 | 34 | 14 | 139 | 3 original / 1 cleaned | 1 | 3 | 2, 4 |

## Qualitative Notes

Grade 7:

- Candidate extraction is usable, but OCR noise is the highest of the three samples.
- Several first-lesson blocks remain `unknown`, and high-priority review is high.
- Suitable for full OCR only if we treat the output as review material, not promotion-ready content.

Grade 8:

- Best sample quality overall.
- Strong column detection: topic overview, worked examples, training, and competition/resource blocks were all detected.
- Lesson ids were not recognized in the sample, but the block segmentation is clean enough for review and pilot generation from original-equivalent templates.

Grade 9:

- Good balance between candidate extraction and lesson detection.
- Some unknown blocks remain, but the parser captured quadratic-function and probability content well.
- Suitable for full OCR after Grade 8.

## Full OCR Recommendation

Recommended order:

1. Run full OCR for Grade 8 first.
2. Run full OCR for Grade 9 second.
3. Run full OCR for Grade 7 third, but expect more review cleanup before using its source blocks.

Do not promote any junior-high problems directly from OCR text. The first junior-high pilot should use the parsed/cleaned blocks only as coverage signals and generate project-native, original-equivalent, auto-gradable problems.

## Next Pipeline Step

Run full OCR for Grade 8:

```bash
npm run ocr:jianzisheng-grade -- --grade grade8 --pages 1-end --content-start-page 7 --jobs 2
npm run report:jianzisheng-parse -- --grade grade8
npm run clean:jianzisheng-elementary -- --grades grade8 --summary junior-grade8-full-cleaning-summary.md
```

Then inspect:

- block count
- question candidate count
- high-priority review count
- worked-example count
- source block availability for a small Grade 8 pilot

