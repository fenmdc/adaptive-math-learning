# college algebra stitz zeager

This dataset stores project-native, original-equivalent bridge problems generated from local textbook coverage signals.

Local source PDF: `/Users/fenmdc/Documents/IMO-中小学奥数/初中数学/College Algebra -- Carl Stitz, Jeff Zeager.pdf`
Generated problems: 80
Chapters: 4

Mapped scope:
- Functions and Function Notation
- Linear Functions
- Quadratic Functions
- Polynomial Structure

Refresh flow:

```bash
npm run generate:higher-algebra-bridge
npm run validate:staging
npm run promote:staging
npm run sync:explanations
```
