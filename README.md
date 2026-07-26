# Adaptive Math Learning

AI-powered adaptive mathematics learning platform focused on AMC-style mathematical thinking, mastery tracking, and personalized remediation.

> Product boundary: this repository contains only Adaptive Math Learning. It does not host the Bible study notes, book catalog, ABRSM music-theory, or scientific-paper knowledge-base products. See [`docs/product/PRODUCT_BOUNDARY.md`](docs/product/PRODUCT_BOUNDARY.md).

---

# Vision

Traditional math learning systems are largely linear, curriculum-driven, and insufficiently personalized.

Adaptive Math Learning aims to build a cognitive learning system that:

- Diagnoses mathematical understanding at the concept level
- Identifies prerequisite gaps and misconceptions
- Dynamically adapts problem difficulty and progression
- Models mathematical thinking patterns
- Helps students develop transferable problem-solving ability

The long-term goal is to create a unified adaptive mathematics platform spanning:

- K-12 mathematics
- AMC competition mathematics
- AP mathematics
- Advanced mathematical reasoning

---

# Initial MVP Scope

The MVP focuses on:

- Pre-Algebra
- Algebra 1
- AMC8-level mathematical thinking

The first version prioritizes:

- Diagnostic assessment
- Adaptive practice
- Mastery tracking
- Knowledge graph remediation

---

# Current Development Status

The current vertical slice includes:

- A validated CSV-backed problem bank with 50 answerable records
- All 50 starter problems manually reviewed with authored choices, hints, explanations, and misconception feedback
- A concept ontology with reference validation
- Adaptive mastery updates and weakest-concept recommendations
- Remediation after repeated incorrect attempts
- A versioned browser-local learning session with safe recovery and isolated reset
- A focused practice workspace with hints, reasoning feedback, quality status, and a real-session progress dashboard
- Automated engine, problem-loader, learning-session, data, and product-boundary checks

Student accounts and database-backed multi-device mastery are the next infrastructure milestone. Browser-local sessions intentionally remain single-device and require no shared account or database state.

Run the current quality gates with:

```bash
npm test
npm run check:data
npm run check:boundary
npm run typecheck
npm run build
```

---

# Core Features

## Adaptive Assessment

Dynamic diagnostic testing system that estimates:

- Student mastery
- Knowledge gaps
- Difficulty level
- Cognitive strengths and weaknesses

---

## Knowledge Graph

Structured mathematical ontology including:

- Concepts
- Skills
- Prerequisites
- Cognitive patterns
- Misconceptions

---

## Adaptive Recommendation Engine

Real-time recommendation system that adjusts:

- Problem difficulty
- Topic sequencing
- Remediation paths
- Review timing

---

## Mastery Tracking

Continuous estimation of:

- Concept mastery
- Retention
- Confidence
- Speed and fluency

---

## AMC-Style Mathematical Thinking

Beyond curriculum coverage, the system models:

- Pattern recognition
- Case analysis
- Logical deduction
- Reverse reasoning
- Constructive problem solving

---

# Repository Structure

```text
adaptive-math-learning/

├── apps/
│   ├── web/
│   └── admin/
│
├── packages/
│   ├── adaptive-engine/
│   ├── database/
│   ├── ontology/
│   ├── shared/
│   └── ui/
│
├── datasets/
│   ├── concepts/
│   ├── problems/
│   ├── tagging/
│   └── mastery/
│
├── docs/
│   ├── product/
│   ├── ontology/
│   ├── adaptive-system/
│   ├── database/
│   └── architecture/
│
├── supabase/
│
└── scripts/
