# mathematics for engineers croft davison

This dataset stores project-native, original-equivalent bridge problems generated from local textbook coverage signals.

Local source PDF: `/Users/fenmdc/Documents/数学/Mathematics for Engineers_Anthony Croft, Robert Davison.pdf`
Generated problems: 80
Chapters: 4

Mapped scope:
- Formulae and Transposition
- Solving Linear Equations
- Solving Quadratic Equations
- Proportionality and Engineering Models

Refresh flow:

```bash
npm run generate:higher-algebra-bridge
npm run validate:staging
npm run promote:staging
npm run sync:explanations
```
