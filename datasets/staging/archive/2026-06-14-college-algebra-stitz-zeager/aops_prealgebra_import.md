# AoPS Prealgebra Import Plan

Source files:

- `/Users/fenmdc/Documents/IMO-中小学奥数/AoPS/01-Prealgebra.pdf`
- `/Users/fenmdc/Documents/IMO-中小学奥数/AoPS/01-Prealgebra 答案.pdf`

Initial inspection showed that these PDFs are scanned/image-based: direct text
extraction with `pypdf` returns empty page text. Use page-image extraction first,
then transcribe selected problems into staging.

## Extract Page Images

Book pages:

```bash
npm run extract:aops-prealgebra -- --kind book --from 1 --to 3
```

Answer pages:

```bash
npm run extract:aops-prealgebra -- --kind answers --from 1 --to 3
```

Images are written to:

`datasets/staging/raw_extracts/aops_prealgebra/`

## Recommended Import Order

Start with a small curated batch, not the whole book.

1. Extract pages around the first exercise set.
2. Select 5-10 problems that are:
   - auto-gradable
   - short enough to transcribe reliably
   - aligned to existing concepts
   - useful for Pre-Algebra Foundation or Bridge
3. Add rows to `problem_staging.csv`.
4. Add choices/distractors only if the problem is naturally multiple-choice or
   if we deliberately convert it into an AMC-style item.
5. Add explanation rows to `example_explanations.csv`.
6. Run:

```bash
npm run validate:staging
```

## Suggested IDs

Use stable source-aware IDs:

- `aops_prealg_001`
- `aops_prealg_002`
- `aops_prealg_003`

Keep the original source page in `source_file` or `notes`, for example:

`01-Prealgebra.pdf p.23`

## Concept Mapping Targets

Likely early Prealgebra concepts:

- `arith_integers`
- `arith_fractions`
- `arith_decimals`
- `arith_ratios`
- `arith_percentages`
- `prealg_expressions`
- `prealg_simplification`
- `prealg_substitution`
- `alg_linear_equations`

If a needed concept is missing, add it to `datasets/concepts/concepts.csv`
before staging the problem.
