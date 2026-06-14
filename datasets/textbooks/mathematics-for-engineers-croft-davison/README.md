# mathematics for engineers croft davison

This dataset stores project-native, original-equivalent bridge problems generated from local textbook coverage signals.

Local source PDF: `/Users/fenmdc/Documents/数学/Mathematics for Engineers_Anthony Croft, Robert Davison.pdf`
Generated problems: 240
Chapters: 10

Mapped scope:
- Formulae and Transposition
- Engineering Units and Measurement
- Standard Form and Engineering Notation
- Formula Substitution in Engineering Contexts
- Proportionality and Engineering Models
- Rate Models and Engineering Quantities
- Linear Engineering Models
- Systems and Break-Even Engineering Models
- Solving Linear Equations
- Solving Quadratic Equations

Refresh flow:

```bash
npm run generate:higher-algebra-bridge
npm run validate:staging
npm run promote:staging
npm run sync:explanations
```
