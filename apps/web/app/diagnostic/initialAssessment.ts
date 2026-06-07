export type AssessmentSlot = {
  id: string;
  domain: string;
  strand: string;
  goal: string;
  reason: string;
  problemId: string;
};

export const initialAssessmentBlueprint: AssessmentSlot[] = [
  {
    id: "number-sense",
    domain: "Arithmetic",
    strand: "Integer fluency",
    goal: "Check basic signed-number operations.",
    reason: "Integer fluency is a prerequisite for algebraic manipulation and number theory.",
    problemId: "amc8_p028"
  },
  {
    id: "ratio-percent",
    domain: "Arithmetic",
    strand: "Ratio and percent",
    goal: "Check proportional reasoning in a short computation.",
    reason: "Ratios and percentages appear throughout AMC8 word problems.",
    problemId: "amc8_p002"
  },
  {
    id: "symbolic-expression",
    domain: "Pre-Algebra",
    strand: "Symbolic manipulation",
    goal: "Check distributive reasoning and expression simplification.",
    reason: "Expression fluency is the bridge into linear equations.",
    problemId: "amc8_p007"
  },
  {
    id: "linear-equation",
    domain: "Algebra",
    strand: "Equation solving",
    goal: "Check two-step linear equation solving.",
    reason: "Linear equations reveal inverse-operation fluency and common step errors.",
    problemId: "amc8_p014"
  },
  {
    id: "geometry-measurement",
    domain: "Geometry",
    strand: "Area",
    goal: "Check formula selection and geometric measurement.",
    reason: "Area problems expose confusion between formulas and shape properties.",
    problemId: "amc8_p023"
  },
  {
    id: "geometry-deduction",
    domain: "Geometry",
    strand: "Angle relationships",
    goal: "Check geometric deduction from known angle sums.",
    reason: "Angle reasoning is a compact test of geometry facts and deduction.",
    problemId: "amc8_p004"
  },
  {
    id: "number-theory",
    domain: "Number Theory",
    strand: "Prime factorization",
    goal: "Check structural understanding of factors.",
    reason: "Factorization supports GCD, LCM, divisibility, and many AMC8 shortcuts.",
    problemId: "amc8_p024"
  },
  {
    id: "probability-basic",
    domain: "Counting & Probability",
    strand: "Probability model",
    goal: "Check sample-space reasoning with fractions.",
    reason: "Probability answers reveal whether the learner models favorable and total outcomes.",
    problemId: "amc8_p026"
  },
  {
    id: "statistics",
    domain: "Statistics",
    strand: "Median",
    goal: "Check ordering and central-value reasoning.",
    reason: "Median tasks distinguish procedural average habits from data-position reasoning.",
    problemId: "amc8_p038"
  },
  {
    id: "challenge-transfer",
    domain: "Counting & Probability",
    strand: "Independent events",
    goal: "Check transfer to a slightly harder multi-step probability problem.",
    reason: "A challenge item helps separate fragile recall from transferable reasoning.",
    problemId: "amc8_p048"
  }
];
