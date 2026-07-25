# Adaptive Math Learning Product Boundary

Status: Active  
Owner: Adaptive Math Learning project  
Applies to: This repository and every artifact produced from it

## 1. Product Identity

Adaptive Math Learning is an independent mathematics learning product. It diagnoses concept-level understanding, recommends suitable mathematics problems, updates mastery after each attempt, and provides targeted remediation.

This repository is not a general education monorepo and is not a shared host for unrelated applications.

## 2. MVP Boundary

### Target users

- Students building Pre-Algebra and Algebra 1 foundations
- Students preparing for AMC8-level mathematical problem solving

### Included capabilities

- Mathematics diagnostic assessment
- Structured mathematics problem bank and concept ontology
- Adaptive problem recommendation
- Concept mastery and prerequisite-gap tracking
- Mathematics knowledge map and remediation paths
- Student learning history and progress views
- Mathematics textbook datasets used as learning or remediation sources

### Not part of this product

- Bible study or scripture-note workflows
- Personal book cataloging, reading-state management, or macOS catalog utilities
- ABRSM music-theory instruction, practice, assessment, or content
- Scientific-paper ingestion, citation graphs, research radar, or paper knowledge bases
- Generic knowledge-management features without a direct mathematics-learning use case
- Shared databases, runtime state, credentials, deployments, or application entrypoints belonging to another product

## 3. Repository Isolation Rules

1. This repository has its own source code, dependencies, configuration, data, tests, environment variables, database schema, deployment, and release history.
2. Do not copy another project's application into this repository for demonstration or temporary reuse.
3. Cross-project code reuse requires an intentionally versioned external package or service contract. Do not use relative imports, symlinks, shared writable folders, or direct access to another project's database.
4. Store only mathematics-learning data under `datasets/`. Source provenance and licensing notes must travel with imported datasets.
5. Environment-variable names and secrets must be project-specific. Never reuse another project's `.env` file.
6. Product routes, metadata, navigation, and UI copy must identify Adaptive Math Learning only.
7. A feature belongs here only when it directly advances the mathematics learning flow defined below.

## 4. Core Product Flow

```text
Student account
  -> diagnostic assessment
  -> initial concept mastery profile
  -> adaptive mathematics practice
  -> attempt evaluation
  -> mastery update
  -> next-problem or remediation recommendation
  -> progress and knowledge-map review
```

A proposed feature outside this flow needs an explicit boundary decision before implementation.

## 5. Ownership Test

Before adding a file, dependency, route, dataset, or service, answer all four questions:

1. Does it serve the target mathematics learner?
2. Does it support diagnosis, practice, mastery, recommendation, remediation, or mathematics content?
3. Can it be developed, tested, deployed, and removed without changing another project?
4. Does all persisted data belong exclusively to Adaptive Math Learning?

If any answer is no, do not add it to this repository until the product boundary is explicitly revised.

## 6. Boundary Cleanup Record

The following files were identified as belonging to a separate product and removed from the runtime on 2026-07-25:

- `app/ABRSMTheoryApp.tsx`
- The ABRSM root rendering in `app/page.tsx`
- The ABRSM site metadata in `app/layout.tsx`
- ABRSM-specific presentation rules in `app/globals.css`

The replacement established:

- An Adaptive Math Learning workspace at `/`
- A reachable learning progress view at `/dashboard`
- A runtime boundary check through `npm run check:boundary`

The independent ABRSM project remains the owner of ABRSM product development. No ABRSM source was moved into another location by this cleanup.

## 7. Boundary Definition Of Done

The repository is back inside its product boundary when:

- `/` identifies and renders Adaptive Math Learning.
- All reachable product routes support the mathematics-learning use case.
- ABRSM-specific source and styling no longer ship in this application.
- The repository has no runtime imports, writable storage, credentials, or database dependencies from another project.
- README, PRD, metadata, tests, and deployment configuration describe the same product.
