# Concept Graph v0

Status: MVP v0.1

Concept Graph v0 turns the existing concept ontology into a computable prerequisite DAG for adaptive recommendations.

## Scope

- Source data: `datasets/concepts/concepts.csv`
- Runtime data: `apps/web/data/concepts.json`
- Engine module: `packages/adaptive-engine/conceptGraph.ts`

## Node Model

Each concept node includes:

- `id`
- `name`
- `domain`
- `strand`
- `description`
- `difficultyLevel`
- `importanceWeight`
- `prerequisites`
- `amcRelevance`

## Edge Model

Edges are directed from prerequisite to dependent concept.

Example:

```text
arith_fractions -> arith_ratios -> arith_proportions
prealg_expressions -> alg_linear_equations -> alg_functions
```

## Prerequisite Gap Resolver

For a target concept, the resolver walks the prerequisite closure and checks current mastery.

A prerequisite becomes a gap when:

```text
mastery < 0.55
```

Gap priority uses:

- mastery deficit
- concept importance
- AMC relevance
- graph distance to target

The adaptive engine now prefers a gap concept when selecting the next problem.

## Current Product Behavior

When a student misses or struggles with a target concept, the system can recommend a prerequisite instead of continuing on the same topic.

Example:

```text
Prerequisite gap: strengthen arith_fractions before continuing alg_linear_equations.
```

## Next Steps

- Add edge types: required, supportive, transfer, misconception-linked.
- Add graph coverage report for problem bank gaps.
- Upgrade gap thresholds by domain and difficulty.
- Later: persist graph in PostgreSQL or Neo4j when scale requires it.
