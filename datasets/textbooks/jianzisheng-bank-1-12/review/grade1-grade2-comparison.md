# Jian Zi Sheng OCR Parse Comparison

Generated at: 2026-06-15T04:31:59.455Z

| Grade | Page range | Pages | Lessons | Blocks | Question candidates | Q/page | Unknown blocks | Unknown rate | Topic overview | Worked examples | Thinking training | Competition boost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grade1 | 7-186 | 180 | 22 | 257 | 551 | 3.1 | 30 | 12% | 3 | 10 | 181 | 33 |
| grade2 | 7-174 | 168 | 24 | 267 | 647 | 3.9 | 25 | 9% | 7 | 8 | 194 | 33 |

## Stability Notes

- Both grades parsed from scanned PDFs using the same OCR sidecar + parser pipeline.
- Both grades recovered the expected major columns: 专题概述, 典型例题, 思维训练, 竞赛强化.
- Unknown block rate stayed in a workable range: grade1 12%, grade2 9%. Most unknown blocks are lesson headings, OCR-noisy fragments, or content that needs manual review rather than parser failure.
- Question candidate density is healthy: grade1 3.1 per page, grade2 3.9 per page.

## Recommendation

The pipeline is stable enough to proceed to batch OCR for grades 1-6, while preserving per-grade review reports before any conversion into production problems.
