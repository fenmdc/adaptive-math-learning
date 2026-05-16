# MVP Product Requirements Document (PRD)

# Adaptive Math Learning

Version: MVP v1  
Status: In Development  
Primary Focus: AMC8 Adaptive Learning System

---

# 1. Product Overview

Adaptive Math Learning is a web-based adaptive mathematics learning platform designed to help students develop deep mathematical understanding and AMC-style problem-solving ability.

The platform combines:

- Adaptive assessment
- Knowledge graph remediation
- Concept mastery tracking
- Cognitive pattern modeling
- Personalized recommendation systems

Unlike traditional curriculum-linear learning systems, the platform dynamically adjusts learning progression based on each student's conceptual understanding, prerequisite gaps, and mathematical reasoning patterns.

The initial MVP focuses on:

- Pre-Algebra
- Algebra 1
- AMC8-level mathematics

---

# 2. Problem Statement

Most existing mathematics learning platforms suffer from several major limitations:

- Linear curriculum progression
- Weak prerequisite diagnosis
- Limited personalization
- Insufficient modeling of mathematical thinking
- Lack of misconception tracking
- Overemphasis on procedural repetition

Students often:

- Memorize procedures without understanding
- Develop fragmented knowledge structures
- Accumulate hidden prerequisite gaps
- Struggle with transfer and non-routine problems

AMC-style mathematics exposes these weaknesses particularly clearly because success depends on flexible reasoning rather than memorized procedures.

The goal of this project is to create an adaptive cognitive learning system that models mathematical understanding at a much deeper level.

---

# 3. MVP Goals

The MVP is designed to validate the core adaptive learning loop.

## Primary Goals

- Deliver a functional adaptive mathematics learning system
- Diagnose concept-level mathematical weaknesses
- Track mastery progression over time
- Dynamically adjust problem difficulty
- Recommend targeted remediation problems
- Build the foundation for a scalable mathematical knowledge graph

## Secondary Goals

- Validate AMC8-focused user engagement
- Establish initial problem tagging infrastructure
- Build reusable ontology architecture
- Collect early learning trajectory data

---

# 4. Target Users

## Primary Users

### AMC8 Preparation Students

- Grades 6-8
- Motivated mathematics learners
- Students preparing for competition mathematics
- Students enrolled in honors or accelerated programs

---

## Secondary Users

### Advanced Middle School Students

Students who:

- Need adaptive remediation
- Have inconsistent fundamentals
- Require individualized pacing
- Benefit from structured mastery systems

---

# 5. User Personas

## Persona A — Competitive Math Student

### Characteristics

- Preparing for AMC8
- Strong computational skills
- Weak non-routine problem solving
- Needs cognitive strategy development

### Pain Points

- Gets stuck on unfamiliar problems
- Relies on brute force
- Lacks structured problem-solving methods

---

## Persona B — Honors Math Student

### Characteristics

- Performs well in school math
- Has hidden prerequisite gaps
- Learns quickly but inconsistently

### Pain Points

- Incomplete conceptual understanding
- Difficulty transferring knowledge
- Weak long-term retention

---

# 6. Product Philosophy

The platform is built around several core principles.

---

## 6.1 Mathematics as a Cognitive System

Mathematics is treated as:

- Pattern recognition
- Structured reasoning
- Abstraction
- Transferable problem solving

not merely procedural execution.

---

## 6.2 Concept-Level Diagnosis

The system diagnoses:

- Concept understanding
- Skill fluency
- Cognitive patterns
- Misconceptions
- Prerequisite gaps

instead of simply tracking chapter completion.

---

## 6.3 Error-Driven Learning

Student errors are treated as highly valuable signals.

The system explicitly models:

- Misconceptions
- Incomplete reasoning
- Guessing behavior
- Cognitive weaknesses

---

## 6.4 Adaptive Personalization

Learning progression is dynamically personalized based on:

- Mastery
- Difficulty tolerance
- Retention
- Confidence
- Learning trajectory

---

# 7. MVP Scope

## Included in MVP

### Learning Domains

- Pre-Algebra
- Algebra 1
- Introductory Geometry
- AMC8 problem-solving patterns

---

## Core Product Features

- User authentication
- Diagnostic assessment
- Adaptive practice
- Knowledge map
- Mastery tracking
- Recommendation engine
- Problem tagging infrastructure

---

## Excluded from MVP

### Not Included Initially

- K-5 curriculum
- AP Calculus
- Conversational AI tutor
- Automatic problem generation
- Full mobile app
- Teacher dashboards
- Parent analytics
- Advanced ML models

---

# 8. Core User Flow

## Step 1 — Account Creation

User creates an account and profile.

---

## Step 2 — Diagnostic Assessment

Student completes an adaptive diagnostic assessment.

The system dynamically adjusts difficulty and estimates:

- Concept mastery
- Weakness areas
- Cognitive strengths
- Initial difficulty rating

---

## Step 3 — Knowledge Profile Generation

The platform generates:

- Mastery map
- Recommended learning path
- Priority remediation areas

---

## Step 4 — Adaptive Practice

Student enters continuous adaptive practice mode.

The system dynamically selects problems based on:

- Current mastery
- Difficulty tolerance
- Prerequisite dependencies
- Review scheduling

---

## Step 5 — Continuous Mastery Updates

After each attempt, the system updates:

- Mastery score
- Confidence score
- Retention estimate
- Recommendation priorities

---

# 9. Core Features

# 9.1 Diagnostic Assessment

## Purpose

Estimate student ability and identify prerequisite gaps.

---

## Requirements

- Adaptive difficulty progression
- 20-30 minute completion target
- Real-time scoring
- Mastery estimation
- Initial knowledge graph generation

---

## Inputs

- Accuracy
- Speed
- Confidence
- Hint usage

---

## Outputs

- Estimated mastery profile
- Weakness analysis
- Recommended starting path

---

# 9.2 Adaptive Practice

## Purpose

Provide personalized mathematics practice.

---

## Requirements

- Dynamic problem recommendation
- Difficulty adjustment
- Topic sequencing
- Remediation insertion
- Review scheduling

---

## Recommendation Factors

- Mastery score
- Recent performance
- Prerequisite status
- Retention decay
- Cognitive load

---

# 9.3 Knowledge Map

## Purpose

Visualize mathematical understanding.

---

## Requirements

- Concept progression visualization
- Locked/unlocked concepts
- Mastery indicators
- Weakness highlighting

---

# 9.4 Mastery Tracking

## Purpose

Estimate student understanding over time.

---

## Tracked Variables

- Mastery
- Confidence
- Retention
- Speed
- Accuracy

---

# 9.5 Problem System

## Purpose

Support structured adaptive learning.

---

## Problem Metadata

Each problem includes:

- Difficulty rating
- Concepts
- Skills
- Cognitive patterns
- Misconceptions
- Estimated solve time
- Solution explanations

---

# 10. Adaptive Learning Engine

# MVP Recommendation Logic

The initial adaptive engine will be rule-based.

---

## Inputs

- Problem correctness
- Solve speed
- Hint usage
- Historical mastery
- Concept dependencies

---

## Outputs

- Next problem selection
- Difficulty adjustment
- Remediation recommendation
- Review scheduling

---

## Example Rules

### Difficulty Increase

If:

- Recent accuracy > 80%
- Average solve time acceptable

Then:

- Increase difficulty slightly

---

### Remediation Trigger

If:

- Mastery < 0.6
- Prerequisite missing

Then:

- Insert remediation sequence

---

### Retention Review

If:

- Long inactivity
- Falling retention estimate

Then:

- Schedule review problems

---

# 11. Knowledge System Architecture

The platform uses a structured mathematical ontology.

---

# Ontology Layers

## Domain

Examples:

- Algebra
- Geometry
- Probability

---

## Concept

Examples:

- Linear Equations
- Similar Triangles
- Ratios

---

## Skill

Examples:

- Solve Systems
- Factor Expressions

---

## Cognitive Patterns

Examples:

- Case Analysis
- Reverse Reasoning
- Symmetry

---

## Misconceptions

Examples:

- Sign Errors
- Incomplete Casework
- Diagram Assumption Bias

---

# 12. Problem Database Requirements

## Problem Structure

Each problem must support:

- Multi-concept tagging
- Difficulty scoring
- Pattern tagging
- Misconception tagging
- Explanation support

---

## Initial Dataset Goals

### MVP Dataset

- 300-500 tagged problems
- 100 core concepts
- 30-50 cognitive patterns

---

# 13. Technical Architecture

# Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

---

# Backend

- Supabase
- PostgreSQL

---

# Hosting

- Vercel

---

# AI Infrastructure

- OpenAI API
- AI-assisted coding workflow
- Future tutoring support

---

# 14. UX Requirements

## Student Experience

- Minimal distraction
- Fast response times
- Clean problem-solving interface
- Mobile-friendly responsive design

---

## Problem Solving Experience

- Timer support
- Clear answer submission
- Smooth transitions
- Low cognitive friction

---

## Knowledge Visualization

- Intuitive mastery map
- Clear progress indicators
- Visible remediation paths

---

# 15. Success Metrics

# MVP Success Criteria

## Product Metrics

- Users complete diagnostic assessment
- Adaptive loop functions correctly
- Mastery updates remain stable
- Recommendation engine behaves coherently

---

## Learning Metrics

- Improved mastery over time
- Reduced prerequisite gaps
- Increased student engagement
- Higher retention consistency

---

## Technical Metrics

- Stable database architecture
- Reliable adaptive recommendations
- Scalable tagging infrastructure

---

# 16. Development Phases

# Phase 1 — Core Infrastructure

- Repository setup
- Database schema
- Ontology design
- Problem schema
- Authentication system

---

# Phase 2 — Adaptive MVP

- Diagnostic assessment
- Adaptive recommendation engine
- Mastery tracking
- Practice interface

---

# Phase 3 — Enhanced Learning System

- Remediation engine
- Retention scheduling
- AI-generated hints
- Misconception analytics

---

# Phase 4 — Future Expansion

- AMC10/12
- AP Mathematics
- Conversational AI tutor
- Problem generation
- Advanced ML systems

---

# 17. Long-Term Vision

The long-term vision is to create a unified adaptive mathematics learning system capable of supporting:

- K-12 mathematics
- Competition mathematics
- Advanced mathematical reasoning
- Personalized cognitive learning trajectories

The platform aims to combine:

- Learning science
- Knowledge graphs
- Cognitive modeling
- AI-assisted personalization

into a deeply individualized mathematical learning environment.

---

# 18. Current Status

Current development focus:

- Ontology architecture
- Problem database schema
- Adaptive engine design
- AMC8 problem tagging system
- MVP infrastructure planning

---

# 19. Repository References

Relevant project documentation:

- README.md
- problem_schema.md
- concepts.md
- recommendation_engine.md
- mastery_model.md
- tagging_taxonomy.md

---
