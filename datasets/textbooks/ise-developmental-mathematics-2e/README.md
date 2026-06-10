# ISE Developmental Mathematics 2e Data

This folder stores original-equivalent practice generated from local textbook
coverage signals in `ISE DEVELOPMENTAL MATHEMATICS, second edition`.

The generated problems do not copy textbook exercises. They use chapter and
section coverage to create project-native, auto-gradable practice aligned to
the current Pre-Algebra -> Algebra 1 -> AMC8 adaptive graph MVP.

Generated problems: 1040
Source collection: ise_developmental_math_2e

Refresh flow:

```bash
npm run generate:ise-developmental-math
npm run validate:staging
npm run promote:ise-developmental-math
npm run sync:explanations
```
