# Content Expansion Roadmap

Status: Active
Baseline: 2026-07-31

## Verified baseline

- Integrated problem bank: 8,473 problems.
- Immutable legacy snapshot: 8,013 problems.
- Reviewed supplement layer: 460 problems across 20 versioned batches.
- Project-callable textbook datasets: 5, each exposed through its own `/api/textbooks/<id>` route.
- Textbook data is currently a lightweight retrieval index. It is not a curated concept ontology and does not by itself complete the remediation loop.

Run `npm run audit:coverage` for current course-level coverage and `npm run check:textbooks` for textbook integrity, extraction density, and remediation-link validation.

## P0: close current practice and remediation gaps

The first implementation step is `datasets/textbooks/remediation-map-v1.json`. It links current low-auto or zero-auto themes to stable textbook chunks and records the next reviewed content action.

1. Pre-Algebra: expressions, simplification, linear equations, ratio/percent/proportion, and geometry.
2. AMC8: statistics.
3. CN Junior: intersecting/parallel lines and geometry proof.
4. CN Senior: quadratic functions, trigonometry, analytic geometry, and derivative monotonicity.

Do not ingest another general-purpose textbook for P0. Use the existing sources, add reviewed objective practice in isolated supplement batches, and preserve the 8,013-item legacy snapshot.

## P1: add sources where current textbooks are insufficient

1. Euclidean geometry proof progression for AoPS Geometry and Chinese junior geometry proof.
2. AMC10/12 strategy and number theory for the first reviewed AMC10/12 anchors.
3. Complex numbers and polar form for the reviewed-zero Precalculus concepts.

Each new source must use `datasets/textbooks/<id>`, include provenance and licensing notes, and be exposed through the existing loader/API pattern.

## P2: deepen quality after P0 and P1

1. Build concept-level textbook retrieval into the learner remediation response.
2. Add reviewed anchors to courses that still have large imported banks but zero reviewed coverage.
3. Re-audit distractors, explanations, difficulty balance, and desktop/mobile practice flow after every versioned content batch.

## Next batch selection

Completed on 2026-07-31:

1. `prealgebra-foundation-gaps-v1` now contains 34 reviewed problems; Geometry increased from six to ten, so all five P0 themes have at least ten auto-gradable items across the integrated bank.
2. `amc8-statistics-v1` adds six reviewed problems covering mean, median, mode, range, missing values, and combined data reasoning.
3. `cn-junior-geometry-gaps-v1` adds four reviewed problems to each of 七年级相交线与角、八年级几何证明、八年级平行线, eliminating the three zero-auto themes without removing their manual proof tasks.

Next: use attempt evidence to deepen low-auto CN Junior themes and add the P1 geometry-proof source before expanding proof-step difficulty.
