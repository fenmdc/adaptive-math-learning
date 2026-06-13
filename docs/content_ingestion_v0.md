# Content Pipeline

Status: Content Pipeline v1

This workflow prepares local math material for the adaptive graph learning
system through a reviewable staging step before app data is updated.

## Pipeline Quality Gate

Run the full content pipeline gate before committing a new content batch:

```bash
npm run quality:pipeline
```

The v1 gate summarizes:

- production problem quality
- explanation completeness
- multiple-choice distractor readiness
- remote asset dependency
- thin chapter and concept coverage
- diagnostic calibration slot coverage
- current staging row counts
- source collection coverage

It writes:

`datasets/reports/content-pipeline-v1.md`

Recommended verification stack:

```bash
npm run validate:staging
npm run quality:pipeline
npm run quality:problems
npm run quality:diagnostic
npm run build
```

`validate:staging` is allowed to produce warnings during drafting. Promotion
should wait until errors are zero and the target batch has been reviewed.

## Source Material

Recommended local source root:

`/Users/fenmdc/Documents/IMO-中小学奥数`

Preferred extraction formats:

1. Markdown or text
2. DOCX
3. text-based PDF
4. scanned PDF or image only after OCR

Keep source notes such as book name, chapter, page, and file path in the
`source_file` and `notes` fields.

## Staging Files

All draft imports start under:

`datasets/staging/`

Files:

- `problem_staging.csv`: core problem content and taxonomy
- `distractors.csv`: multiple-choice distractor metadata
- `example_explanations.csv`: hints, step-by-step explanations, common mistakes
- `import_notes.md`: running notes for local extraction

## Required Problem Fields

For promotion, each row should include:

- `id`
- `statement`
- `answer`
- `answer_type`
- `difficulty`
- `concepts`
- `solution`
- `course`
- `theme`
- `chapter`
- `chapter_title`
- `source_collection`
- `taxonomy_layer`
- `taxonomy_stage`
- `problem_type`
- `cognitive_tags`
- `estimated_time_seconds`

## Multiple Choice Format

Use pipe-separated choices:

```csv
"A:7|B:8|C:9|D:15|E:22"
```

The correct answer must match one choice value after normalization.

Distractors go into `distractors.csv`:

```csv
problem_id,choice_label,value,misconception,cognitive_tag,explanation
staging_sample_001,A,7,inverse_operation_error,inverse_operations,"Subtracts too much."
```

Every wrong choice should eventually have a distractor row.

## Staging Validation

Run:

```bash
npm run validate:staging
```

The validator checks:

- duplicate staging ids
- conflicts with existing production problem ids
- required fields
- answer type
- difficulty range
- concept ids against `datasets/concepts/concepts.csv`
- taxonomy layer and stage
- multiple-choice answer coverage
- distractor choice linkage
- explanation linkage

Warnings are allowed during drafting. Errors block promotion.

## Promotion Path

Current v0 supports direct promotion from staging into the app problem bank:

```bash
npm run promote:staging
```

The promotion script appends validated staging rows to:

- `apps/web/data/problems.json`

It preserves existing app problem order, skips ids already present in the app
problem bank, binds multiple-choice choices to distractor ids, and derives
prerequisite concepts from `apps/web/data/concepts.json`.

Recommended flow:

1. Add structured source data under `datasets/textbooks/<collection>/`.
2. Import into staging.
3. Run `npm run validate:staging`.
4. Review problem statements, answers, concepts, taxonomy, and distractors.
5. Run `npm run promote:staging`.
6. Run `npm exec next build apps/web`.

Longer term, promotion should also update canonical CSV/source datasets. For
now, avoid running `npm run simulate` as the final promotion path unless the
simulation runner has been upgraded to preserve taxonomy, structured choices,
and distractor metadata.

## AoPS Prealgebra Import

Current source directory:

`datasets/textbooks/aops-prealgebra/`

Supported source files:

- `problems.json`
- `problems.csv`

Run:

```bash
npm run import:aops-prealgebra-textbook
npm run validate:staging
npm run promote:aops-prealgebra
npm run sync:explanations
```

The current v2 batch adds 1120 original AoPS Prealgebra-style multiple-choice
problems, with 40 problems in each of 28 chapters across Pre-Algebra number
systems, fractions/decimals/ratios/percents, expressions/equations, functions,
number theory, geometry, statistics, counting, and probability.

To regenerate the source batch:

```bash
npm run generate:aops-prealgebra-v1
```

AoPS Prealgebra promotion should use `promote:aops-prealgebra` rather than the
generic append-only `promote:staging` command. This replaces the previous app
data rows for `aops_prealgebra_textbook`, preventing old chapter slugs from
remaining alongside the regenerated collection.

Each generated problem includes a reusable explanation template:

- `hint_1`
- `hint_2`
- `step_by_step`
- `common_mistake`
- `why_correct`
- `variant_idea`
