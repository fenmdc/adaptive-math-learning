# college algebra stitz zeager

This dataset stores project-native, original-equivalent bridge problems generated from local textbook coverage signals.

Local source PDF: `/Users/fenmdc/Documents/IMO-中小学奥数/初中数学/College Algebra -- Carl Stitz, Jeff Zeager.pdf`
Generated problems: 300
Chapters: 10

Mapped scope:
- Real Numbers and the Coordinate Plane
- Relations and Graphs of Equations
- Functions and Function Notation
- Transformations of Functions
- Linear Functions
- Absolute Value Functions and Equations
- Quadratic Functions
- Linear and Quadratic Inequalities
- Polynomial Structure
- Systems of Linear Equations

Refresh flow:

```bash
npm run generate:higher-algebra-bridge
npm run validate:staging
npm run promote:staging
npm run sync:explanations
```
