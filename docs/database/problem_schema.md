# Problem Database Schema

# Adaptive Math Learning

Version: MVP v1  
Status: In Development

---

# 1. Overview

The Problem Database is the core structured content system powering the adaptive learning platform.

The system is designed to support:

- Adaptive recommendations
- Concept-level diagnosis
- Mastery tracking
- Prerequisite analysis
- Cognitive modeling
- Misconception detection
- Future AI-assisted tutoring

The database architecture is intentionally designed to support:

- Multi-concept problems
- AMC-style reasoning
- Fine-grained tagging
- Long-term scalability

---

# 2. Design Principles

## 2.1 Multi-Dimensional Tagging

A mathematics problem is not treated as belonging to a single topic.

Each problem may contain:

- Multiple concepts
- Multiple skills
- Multiple reasoning patterns
- Multiple misconceptions

---

## 2.2 Structured Cognitive Modeling

Competition mathematics requires modeling:

- Reasoning strategies
- Pattern recognition
- Transfer ability
- Flexible thinking

not merely procedural correctness.

---

## 2.3 Adaptive Learning Compatibility

The schema is optimized for:

- Dynamic recommendation systems
- Mastery estimation
- Knowledge graph traversal
- Remediation sequencing

---

## 2.4 Extensibility

The architecture is designed to support future expansion into:

- AMC10/12
- AP Mathematics
- AI-generated problems
- Conversational tutoring
- Semantic embeddings

---

# 3. Core Database Tables

The MVP database consists of several core entities.

---

# Core Tables

| Table | Purpose |
|---|---|
| problems | Problem content |
| concepts | Mathematical concepts |
| skills | Mathematical skills |
| cognitive_patterns | Mathematical thinking patterns |
| misconceptions | Common reasoning errors |
| problem_tags | Multi-dimensional tagging |
| concept_prerequisites | Knowledge graph edges |
| problem_attempts | Student attempt history |
| student_mastery | Concept mastery tracking |
| recommendation_log | Recommendation analytics |
| problem_curriculum | Course, theme, and chapter placement |

---

# 4. Problems Table

# Table: problems

Stores all mathematical problems.

---

## Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Unique problem ID |
| slug | TEXT | Human-readable identifier |
| title | TEXT | Problem title |
| source | TEXT | Source origin |
| source_year | INT | Source year |
| source_number | INT | Question number |
| difficulty_rating | INT | Continuous difficulty score |
| difficulty_confidence | FLOAT | Confidence of difficulty estimate |
| estimated_time_sec | INT | Expected solve time |
| statement | TEXT | Problem statement |
| final_answer | TEXT | Correct answer |
| answer_type | TEXT | MCQ, integer, expression |
| explanation | TEXT | Full solution explanation |
| hint_1 | TEXT | Basic hint |
| hint_2 | TEXT | Intermediate hint |
| hint_3 | TEXT | Strong hint |
| solution_video_url | TEXT | Optional solution video |
| requires_diagram | BOOLEAN | Whether diagram is needed |
| diagram_url | TEXT | Diagram location |
| is_multiple_choice | BOOLEAN | Multiple choice flag |
| choice_a-e | TEXT | Answer choices |
| quality_score | FLOAT | Content quality estimate |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

---

# 4.1 Curriculum Mapping

# Table: problem_curriculum

Maps each problem into a selectable course structure. This keeps the raw problem
content reusable while allowing the product to expose course tracks such as
Pre-Algebra and AMC8.

## Fields

| Field | Type | Description |
|---|---|---|
| problem_id | TEXT | Problem ID from `problems.csv` |
| course | TEXT | Course track, e.g. Pre-Algebra or AMC8 |
| theme | TEXT | Broad topic grouping |
| chapter | TEXT | Stable chapter slug |
| chapter_title | TEXT | Human-readable chapter title |
| sequence | INT | Ordering inside the course/theme |
| source_collection | TEXT | Import/source collection label |

Current MVP source files:

- `datasets/problems/problems.csv`
- `datasets/problems/problem_curriculum.csv`
- `datasets/concepts/concepts.csv`

Local source expansion can use materials under:

- `/Users/fenmdc/Documents/IMO-中小学奥数`

The recommended ingestion flow is:

1. Extract candidate problems from a local document into a staging CSV.
2. Normalize statement, answer, solution, concept tags, and answer type.
3. Add rows to `problems.csv`.
4. Add course/theme/chapter rows to `problem_curriculum.csv`.
5. Run `npm run simulate` to regenerate frontend JSON.

---

# 5. Difficulty System

The platform uses a continuous difficulty scale rather than discrete labels.

---

## Example Scale

| Difficulty | Approximate Level |
|---|---|
| 800-1000 | Basic arithmetic |
| 1000-1300 | Standard middle school |
| 1300-1600 | Strong AMC8 |
| 1600-1900 | Advanced AMC8 |
| 1900+ | Early AMC10 |

---

# 6. Concepts Table

# Table: concepts

Stores mathematical concepts.

---

## Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Concept ID |
| slug | TEXT | Unique concept key |
| name | TEXT | Concept name |
| domain | TEXT | Algebra, Geometry, etc |
| strand | TEXT | Subcategory |
| description | TEXT | Concept explanation |
| grade_min | INT | Earliest expected grade |
| grade_max | INT | Latest expected grade |
| difficulty_level | INT | Relative concept complexity |
| importance_weight | FLOAT | Importance in curriculum |
| created_at | TIMESTAMP | Timestamp |

---

# Example Concepts

| Name | Domain |
|---|---|
| Fractions | Arithmetic |
| Linear Equations | Algebra |
| Similar Triangles | Geometry |
| Probability | Statistics |

---

# 7. Skills Table

# Table: skills

Represents executable mathematical abilities.

Concepts and skills are intentionally separated.

---

## Example

### Concept

Quadratic Equations

### Skill

Factor Quadratic Expressions

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| slug | TEXT |
| name | TEXT |
| description | TEXT |

---

# 8. Cognitive Patterns Table

# Table: cognitive_patterns

Models mathematical reasoning strategies.

This is especially important for AMC-style mathematics.

---

## Example Patterns

| Pattern | Description |
|---|---|
| case_analysis | Structured case splitting |
| invariant | Invariant reasoning |
| reverse_reasoning | Working backward |
| constructive | Constructive thinking |
| symmetry | Symmetry exploitation |

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| slug | TEXT |
| name | TEXT |
| description | TEXT |

---

# 9. Misconceptions Table

# Table: misconceptions

Represents common mathematical errors and reasoning failures.

This is critical for adaptive remediation.

---

## Example Misconceptions

| Misconception | Meaning |
|---|---|
| sign_error | Sign manipulation mistakes |
| incomplete_casework | Missing logical cases |
| brute_force_dependence | Over-reliance on brute force |
| diagram_assumption | Invalid visual assumptions |

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| slug | TEXT |
| name | TEXT |
| description | TEXT |

---

# 10. Problem Tags Table

# Table: problem_tags

Core multi-dimensional tagging system.

This table connects problems to:

- Concepts
- Skills
- Cognitive patterns
- Misconceptions

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| problem_id | UUID |
| tag_type | TEXT |
| tag_id | UUID |
| weight | FLOAT |
| is_primary | BOOLEAN |

---

# Example

| Problem | Tag Type | Tag |
|---|---|---|
| AMC8_2023_Q12 | concept | quadratics |
| AMC8_2023_Q12 | pattern | reverse_reasoning |
| AMC8_2023_Q12 | misconception | sign_error |

---

# 11. Tag Weighting

Each tag has a relative importance weight.

---

## Example

| Tag | Weight |
|---|---|
| quadratics | 0.9 |
| inequalities | 0.3 |

This enables more accurate mastery updates and recommendations.

---

# 12. Concept Prerequisite Graph

# Table: concept_prerequisites

Stores directed prerequisite relationships between concepts.

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| concept_id | UUID |
| prerequisite_id | UUID |
| strength | FLOAT |

---

## Example

Fractions → Rational Expressions

---

# 13. Problem Attempts Table

# Table: problem_attempts

Stores student interaction data.

This is one of the most important long-term data assets.

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| student_id | UUID |
| problem_id | UUID |
| started_at | TIMESTAMP |
| submitted_at | TIMESTAMP |
| is_correct | BOOLEAN |
| selected_answer | TEXT |
| time_spent_sec | INT |
| hints_used | INT |
| confidence_level | INT |
| mastery_before | FLOAT |
| mastery_after | FLOAT |

---

# 14. Why Confidence Matters

Correctness alone is insufficient.

The system distinguishes:

| Scenario | Interpretation |
|---|---|
| Fast correct | Strong mastery |
| Slow correct | Partial fluency |
| Guessed correct | Weak mastery |
| Fast incorrect | Overconfidence |
| Hint-assisted correct | Incomplete understanding |

---

# 15. Student Mastery Table

# Table: student_mastery

Stores estimated mastery for each student-concept pair.

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| student_id | UUID |
| concept_id | UUID |
| mastery_score | FLOAT |
| confidence_score | FLOAT |
| retention_score | FLOAT |
| attempt_count | INT |
| last_practiced_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

# Example Mastery Scale

| Score | Interpretation |
|---|---|
| 0.0-0.3 | Weak understanding |
| 0.3-0.6 | Partial understanding |
| 0.6-0.8 | Functional mastery |
| 0.8-0.95 | Strong mastery |
| 0.95+ | Transferable mastery |

---

# 16. Recommendation Log Table

# Table: recommendation_log

Tracks recommendation behavior and outcomes.

Important for future recommendation optimization.

---

## Fields

| Field | Type |
|---|---|
| id | UUID |
| student_id | UUID |
| recommended_problem_id | UUID |
| recommendation_reason | TEXT |
| accepted | BOOLEAN |
| outcome_correct | BOOLEAN |
| created_at | TIMESTAMP |

---

# 17. Example Problem Object

```json
{
  "problem_id": "amc8_2023_q12",

  "difficulty_rating": 1410,

  "estimated_time_sec": 95,

  "concepts": [
    {
      "slug": "quadratics",
      "weight": 0.9
    },
    {
      "slug": "inequalities",
      "weight": 0.3
    }
  ],

  "skills": [
    "symbolic_manipulation",
    "equation_solving"
  ],

  "patterns": [
    "reverse_reasoning"
  ],

  "misconceptions": [
    "sign_error",
    "premature_assumption"
  ]
}
