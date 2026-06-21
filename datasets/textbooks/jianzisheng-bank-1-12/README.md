# Jian Zi Sheng Chinese Math Bank 1-12

This dataset connects the local scanned `尖子生高分题库` 1-12 PDF collection to the Chinese curriculum track.

Local source directory: `/Users/fenmdc/Documents/IMO-中小学奥数/尖子生题库1~12`
Source collection: `jianzisheng_cn_math_bank_1_12`
Generated problems: 240

Import policy:

- The PDFs are scanned and do not contain an extractable text layer.
- OCR samples are stored in `ocr-samples/` for pipeline validation.
- The promoted problems are original-equivalent items generated from grade/topic coverage signals; full textbook exercise text is not reproduced.
- Every promoted item is auto-gradable multiple choice with distractor rows and an explanation template.

Chapter coverage:
- 一年级：数的认识与找规律: 20 problems
- 二年级：加减乘除应用题: 20 problems
- 三年级：除法、余数与周期: 20 problems
- 四年级：图形周长与面积: 20 problems
- 五年级：分数计算与分数应用: 20 problems
- 六年级：比、比例与百分数: 20 problems
- 七年级：有理数、整式与一元一次方程: 20 problems
- 八年级：三角形、相似与勾股定理: 20 problems
- 九年级：二次函数与综合应用: 20 problems
- 高一：集合、函数与基本初等函数: 20 problems
- 高二：数列、不等式与解析几何: 20 problems
- 高三：概率统计与综合复习: 20 problems

Refresh flow:

```bash
npm run generate:jianzisheng-cn-bank
npm run validate:staging
npm run promote:jianzisheng-cn-bank
npm run sync:explanations
```

## OCR column parsing

The source PDFs are scanned, so real extraction uses OCR sidecar text first and
then a column parser.

Current v1 OCR parse status:

- `grade1` full OCR completed from `尖子生高分题库1年级.pdf`.
- Parsed body page range: 7-186.
- Parsed blocks: 257.
- Question candidates: 551.
- Column blocks:
  - 专题概述: 3
  - 典型例题: 10
  - 思维训练: 181
  - 竞赛强化: 33
  - 未标注 / needs review: 30

Run a full grade OCR and parse:

```bash
npm run ocr:jianzisheng-grade -- --grade grade1 --pages 1-end --content-start-page 7 --jobs 2
npm run report:jianzisheng-parse -- --grade grade1
```

Run parser only from an existing sidecar:

```bash
npm run parse:jianzisheng-ocr -- --grade grade1 --input datasets/textbooks/jianzisheng-bank-1-12/ocr/grade1/full.txt --page-start 1 --content-start-page 7 --source-file 尖子生高分题库1年级.pdf --output datasets/textbooks/jianzisheng-bank-1-12/parsed/grade1
```

Review outputs:

- `ocr/<grade>/full.txt`: OCR sidecar text.
- `parsed/<grade>/column_blocks.json`: machine-readable lesson/column blocks.
- `parsed/<grade>/column_blocks.md`: human-readable sample review.
- `parsed/<grade>/parse-summary.json`: parser summary.
- `review/<grade>-ocr-parse-report.md`: risk-ranked review report.
