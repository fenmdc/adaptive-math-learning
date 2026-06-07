# Initial Assessment Blueprint

Status: MVP v0.1

The initial assessment is designed as a short, structured diagnostic before adaptive practice.

## Goals

- Cover the major AMC8 starter domains.
- Detect broad prerequisite gaps quickly.
- Produce a useful dashboard summary after one sitting.
- Keep every item auto-gradable in the MVP.

## Current Structure

| Slot | Domain | Strand | Problem |
| --- | --- | --- | --- |
| 1 | Arithmetic | Integer fluency | amc8_p028 |
| 2 | Arithmetic | Ratio and percent | amc8_p002 |
| 3 | Pre-Algebra | Symbolic manipulation | amc8_p007 |
| 4 | Algebra | Equation solving | amc8_p014 |
| 5 | Geometry | Area | amc8_p023 |
| 6 | Geometry | Angle relationships | amc8_p004 |
| 7 | Number Theory | Prime factorization | amc8_p024 |
| 8 | Counting & Probability | Probability model | amc8_p026 |
| 9 | Statistics | Median | amc8_p038 |
| 10 | Counting & Probability | Independent events | amc8_p048 |

## Design Notes

- The sequence starts with low-friction arithmetic and moves toward transfer items.
- Pre-algebra appears before linear equations because symbolic fluency is a prerequisite.
- Geometry includes both measurement and deduction.
- The final probability item acts as a challenge/transfer signal.
- Future versions should replace fixed problem ids with slot-level selectors.
