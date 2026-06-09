# AoPS Prealgebra Textbook Data

Place structured AoPS Prealgebra extraction data here.

Supported import files:

- `problems.json`
- `problems.csv`

Run:

```bash
npm run import:aops-prealgebra-textbook
npm run validate:staging
npm run promote:staging
```

The importer writes to:

- `datasets/staging/problem_staging.csv`
- `datasets/staging/distractors.csv`
- `datasets/staging/example_explanations.csv`

## JSON Shape

```json
[
  {
    "id": "aops_prealg_0001",
    "statement": "Solve x + 7 = 15.",
    "answer": "8",
    "choices": ["A:7", "B:8", "C:9", "D:22"],
    "difficulty": 2,
    "concepts": ["alg_linear_equations"],
    "solution": "Subtract 7 from both sides: x=8.",
    "source_file": "01-Prealgebra.pdf p.10",
    "distractors": [
      {
        "label": "A",
        "misconception": "inverse_operation_error",
        "cognitiveTag": "inverse_operations",
        "explanation": "Subtracts incorrectly."
      }
    ],
    "hint_1": "Undo +7.",
    "step_by_step": "x+7=15, so x=15-7=8."
  }
]
```

The importer can infer many fields, but stronger data gives better results:

- concepts
- difficulty
- theme / chapter / chapter_title
- taxonomy_layer / taxonomy_stage / problem_type / cognitive_tags
- choices and distractors
- source_file
- solution / step_by_step

## Current v2 Batch

`problems.json` currently contains an original 1120-problem AoPS
Prealgebra-style v2 batch, with 40 problems in each of 28 chapters. It is
organized around the MVP plan:

- Number Systems and Operations
- Fractions, Decimals, Ratios, and Percents
- Expressions and Equations
- Number Theory Foundations
- Geometry and Measurement
- Data, Counting, and Probability

Each item is multiple choice and includes distractor metadata for later
cognitive pattern analysis.

To regenerate the batch from the current chapter templates:

```bash
npm run generate:aops-prealgebra-v1
```

Then run the normal import flow:

```bash
npm run import:aops-prealgebra-textbook
npm run validate:staging
npm run promote:aops-prealgebra
npm run sync:explanations
```

`promote:aops-prealgebra` replaces the previous AoPS Prealgebra app-data
collection instead of appending duplicate old chapter slugs.

## Explanation Template Fields

Every v1 item includes:

- `hint_1`: first nudge without giving away the answer
- `hint_2`: more direct procedural hint
- `step_by_step`: worked solution
- `common_mistake`: likely incorrect reasoning
- `why_correct`: answer verification
- `variant_idea`: nearby generated practice variant
