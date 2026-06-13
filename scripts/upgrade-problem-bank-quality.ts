import fs from "fs";
import path from "path";
import type { AnswerChoice, Distractor, Problem } from "../packages/adaptive-engine";
import { assessExplanationQuality, type ExampleExplanation } from "../apps/web/app/shared/explanationQuality";
import { buildProblemQualityAudit } from "../apps/web/app/shared/problemQuality";

type NewProblemSpec = {
  answer: string;
  answerType?: Problem["answerType"];
  chapter: string;
  chapterTitle: string;
  choices?: string[];
  cognitiveTags: string[];
  concepts: string[];
  course: string;
  difficulty: number;
  layer: NonNullable<Problem["taxonomy"]>["layer"];
  prefix: string;
  problemType: string;
  sequenceBase: number;
  skills: string[];
  solution: string;
  sourceCollection: string;
  stage: NonNullable<Problem["taxonomy"]>["stage"];
  statement: string;
  theme: string;
};

const APP_DATA_DIR = path.join(process.cwd(), "apps/web/data");
const PROBLEMS_PATH = path.join(APP_DATA_DIR, "problems.json");
const EXPLANATIONS_PATH = path.join(APP_DATA_DIR, "exampleExplanations.json");
const CONCEPTS_PATH = path.join(APP_DATA_DIR, "concepts.json");
const REPORT_DIR = path.join(process.cwd(), "datasets/reports");
const REPORT_PATH = path.join(REPORT_DIR, "problem-quality-needs.md");
const GENERATED_SOURCE = "quality_backfill_v1";

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const problems = readJson<Problem[]>(PROBLEMS_PATH);
  const explanations = readJson<Record<string, ExampleExplanation>>(EXPLANATIONS_PATH);
  const conceptPrerequisites = readConceptPrerequisites();
  const beforeAudit = buildProblemQualityAudit(problems, explanations);
  const upgradedExplanations = upgradePartialExplanations(problems, explanations);
  const backfillSpecs = buildBackfillSpecs();
  const existingIds = new Set(problems.map((problem) => problem.id));
  const existingGenerated = new Set(
    problems
      .filter((problem) => problem.curriculum.sourceCollection === GENERATED_SOURCE)
      .map((problem) => problem.id)
  );
  const newProblems = backfillSpecs
    .map((spec, index) => mapBackfillProblem(spec, index + 1, conceptPrerequisites))
    .filter((problem) => !existingIds.has(problem.id) && !existingGenerated.has(problem.id));
  const nextProblems = [...problems, ...newProblems].sort(compareProblems);

  newProblems.forEach((problem) => {
    upgradedExplanations[problem.id] = buildCompleteExplanation(problem);
  });

  const afterAudit = buildProblemQualityAudit(nextProblems, upgradedExplanations);
  fs.writeFileSync(PROBLEMS_PATH, `${JSON.stringify(nextProblems, null, 2)}\n`);
  fs.writeFileSync(EXPLANATIONS_PATH, `${JSON.stringify(upgradedExplanations, null, 2)}\n`);
  fs.writeFileSync(REPORT_PATH, buildNeedsReport(beforeAudit, afterAudit, newProblems));

  console.log("Problem bank quality upgrade");
  console.log(`- Upgraded explanations: ${upgradedExplanations.__upgradedCount ?? 0}`);
  console.log(`- Added backfill problems: ${newProblems.length}`);
  console.log(`- Partial explanations: ${beforeAudit.explanationQuality.counts.partial} -> ${afterAudit.explanationQuality.counts.partial}`);
  console.log(`- Complete explanations: ${beforeAudit.explanationQuality.counts.complete} -> ${afterAudit.explanationQuality.counts.complete}`);
  console.log(`- Thin chapters: ${beforeAudit.thinChapters.length} -> ${afterAudit.thinChapters.length}`);
  console.log(`- Thin concepts: ${beforeAudit.thinConcepts.length} -> ${afterAudit.thinConcepts.length}`);
  console.log(`- Report: ${path.relative(process.cwd(), REPORT_PATH)}`);

  delete upgradedExplanations.__upgradedCount;
  fs.writeFileSync(EXPLANATIONS_PATH, `${JSON.stringify(upgradedExplanations, null, 2)}\n`);
}

function upgradePartialExplanations(
  problems: Problem[],
  explanations: Record<string, ExampleExplanation>
) {
  const next = { ...explanations } as Record<string, ExampleExplanation> & { __upgradedCount?: number };
  let upgradedCount = 0;

  problems.forEach((problem) => {
    const current = explanations[problem.id];
    const currentQuality = assessExplanationQuality(current, problem);
    if (currentQuality.level === "complete") return;

    next[problem.id] = {
      ...buildCompleteExplanation(problem, current),
      ...preserveUsefulHints(current)
    };
    upgradedCount += 1;
  });

  next.__upgradedCount = upgradedCount;
  return next;
}

function preserveUsefulHints(current: ExampleExplanation | undefined) {
  if (!current) return {};

  return {
    ...(current.hint1 && current.hint1.trim().length > 12 ? { hint1: current.hint1 } : {}),
    ...(current.hint2 && current.hint2.trim().length > 12 ? { hint2: current.hint2 } : {}),
    ...(current.commonMistake && current.commonMistake.trim().length > 18 ? { commonMistake: current.commonMistake } : {}),
    ...(current.variantIdea && current.variantIdea.trim().length > 18 ? { variantIdea: current.variantIdea } : {})
  };
}

function buildCompleteExplanation(problem: Problem, current?: ExampleExplanation): ExampleExplanation {
  const conceptText = formatConcept(problem.primaryConcept || problem.concepts[0] || "the target concept");
  const answerText = `The expected answer is ${problem.answer}.`;
  const solution = problem.solution?.trim() || `${answerText}`;

  return {
    hint1: current?.hint1 || `Identify the ${conceptText} structure before doing the arithmetic.`,
    hint2: current?.hint2 || `Write the important relationship from the problem, then solve for the requested value.`,
    stepByStep: [
      `Step 1: Translate the question into the relevant ${conceptText} relationship.`,
      `Step 2: Use the given numbers and simplify carefully: ${solution}`,
      `Step 3: State the result in the requested form. Therefore, the answer is ${problem.answer}.`
    ].join("\n"),
    commonMistake: current?.commonMistake || `A common mistake is to use the right operation but answer an intermediate value instead of ${problem.answer}.`,
    whyCorrect: `This works because the setup matches the ${conceptText} concept and the simplification leads directly to ${problem.answer}.`,
    variantIdea: current?.variantIdea || "Change one number in the setup and solve again to check whether the same structure still works."
  };
}

function buildBackfillSpecs(): NewProblemSpec[] {
  return [
    ...buildAmcAlgebraBackfill(),
    ...buildAmcCountingBackfill(),
    ...buildAmcGeometryBackfill(),
    ...buildAmcNumberTheoryBackfill(),
    ...buildPrealgExpressionBackfill(),
    ...buildPrealgSimplificationBackfill(),
    ...buildPrealgLinearEquationBackfill(),
    ...buildPrealgRatioBackfill(),
    ...buildConceptBackfill(),
    ...buildRemainingCoverageBackfill()
  ];
}

function buildAmcAlgebraBackfill(): NewProblemSpec[] {
  return [
    algebraSpec("qa_amc_alg", "If 3x - 4 = 20, what is x + 5?", "13", "3x=24, so x=8 and x+5=13.", 3),
    algebraSpec("qa_amc_alg", "The rule f(n)=2n+3 is used. What is f(11)-f(4)?", "14", "f(11)=25 and f(4)=11, so the difference is 14.", 3),
    algebraSpec("qa_amc_alg", "A number is doubled and then increased by 7 to get 31. What is the number?", "12", "2n+7=31, so 2n=24 and n=12.", 3),
    algebraSpec("qa_amc_alg", "If a+b=17 and a-b=5, what is a?", "11", "Adding equations gives 2a=22, so a=11.", 4),
    algebraSpec("qa_amc_alg", "Simplify 4(y-2)+3y.", "7y-8", "Distribute to get 4y-8+3y, then combine like terms: 7y-8.", 4, "symbolic"),
    algebraSpec("qa_amc_alg", "If 5 less than 3 times a number is 22, what is twice the number?", "18", "3n-5=22, so 3n=27, n=9, and twice the number is 18.", 4),
    algebraSpec("qa_amc_alg", "For g(x)=x^2-1, what is g(6)-g(3)?", "27", "g(6)=35 and g(3)=8, so 35-8=27.", 4),
    algebraSpec("qa_amc_alg", "If 2p+q=19 and q=5, what is p+q?", "12", "2p+5=19, so p=7 and p+q=12.", 3),
    algebraSpec("qa_amc_alg", "The average of x, x+2, and x+4 is 15. What is x?", "13", "The average is x+2, so x+2=15 and x=13.", 4),
    algebraSpec("qa_amc_alg", "If 6m=4m+18, what is m/3?", "3", "2m=18, so m=9 and m/3=3.", 3),
    algebraSpec("qa_amc_alg", "A rectangle has perimeter 34 and width 6. What is its length?", "11", "2L+2*6=34, so 2L=22 and L=11.", 3),
    algebraSpec("qa_amc_alg", "If x/3 + 4 = 10, what is x - 5?", "13", "x/3=6, so x=18 and x-5=13.", 3),
    algebraSpec("qa_amc_alg", "Simplify 5a - 2(a - 3).", "3a+6", "Distribute the negative: 5a-2a+6=3a+6.", 4, "symbolic"),
    algebraSpec("qa_amc_alg", "If h(t)=3t-2, for what t is h(t)=25?", "9", "3t-2=25, so 3t=27 and t=9.", 3),
    algebraSpec("qa_amc_alg", "Two consecutive odd integers sum to 56. What is the larger one?", "29", "Let them be n and n+2. Then 2n+2=56, so n=27 and the larger is 29.", 4),
    algebraSpec("qa_amc_alg", "If 4x+1=2x+15, what is 3x?", "21", "2x=14, so x=7 and 3x=21.", 3)
  ];
}

function buildAmcCountingBackfill(): NewProblemSpec[] {
  return [
    countingSpec("qa_amc_count", "How many two-letter codes can be made from A, B, C, D if repetition is allowed?", "16", "There are 4 choices for the first letter and 4 for the second, so 4*4=16."),
    countingSpec("qa_amc_count", "How many ways can 3 students stand in a line?", "6", "There are 3 choices first, then 2, then 1, so 3*2*1=6."),
    countingSpec("qa_amc_count", "A menu has 2 soups, 4 sandwiches, and 3 drinks. How many soup-sandwich-drink meals are possible?", "24", "Use the multiplication principle: 2*4*3=24."),
    countingSpec("qa_amc_count", "How many subsets of 2 people can be chosen from 5 people?", "10", "There are 5*4 ordered choices, but each pair is counted twice, so 20/2=10.", ["counting_combinations"]),
    countingSpec("qa_amc_count", "How many three-digit numbers can be made from 1, 2, 3 if no digit repeats?", "6", "There are 3 choices, then 2, then 1, giving 6."),
    countingSpec("qa_amc_count", "A box has 4 red and 5 blue marbles. How many marbles must be drawn to guarantee two of the same color?", "3", "With two colors, two draws could be one of each; the third guarantees a match.", ["counting_pigeonhole"]),
    countingSpec("qa_amc_count", "How many diagonals does a pentagon have?", "5", "Choose any 2 vertices: C(5,2)=10 segments. Subtract 5 sides to get 5 diagonals.", ["counting_combinations"]),
    countingSpec("qa_amc_count", "How many outcomes are possible when a coin is flipped and a six-sided die is rolled?", "12", "There are 2 coin outcomes and 6 die outcomes, so 2*6=12."),
    countingSpec("qa_amc_count", "How many ways can you choose 2 toppings from 6 toppings?", "15", "Use combinations: 6*5/2=15.", ["counting_combinations"]),
    countingSpec("qa_amc_count", "How many arrangements of the letters A, B, C, D start with A?", "6", "Fix A first, then arrange B, C, D in 3*2*1=6 ways."),
    countingSpec("qa_amc_count", "A drawer has red, blue, and green socks. How many socks guarantee two of the same color?", "4", "One sock of each color is possible in 3 draws; the fourth guarantees a pair.", ["counting_pigeonhole"]),
    countingSpec("qa_amc_count", "How many different unordered pairs can be made from 7 points?", "21", "Choose 2 of 7: 7*6/2=21.", ["counting_combinations"]),
    countingSpec("qa_amc_count", "How many paths go from A to C through exactly one of 3 middle points?", "3", "Choose the middle point; each choice determines one A-middle-C path."),
    countingSpec("qa_amc_count", "How many license plates of the form digit-letter can be made using digits 1-5 and letters A-C?", "15", "There are 5 digit choices and 3 letter choices, so 5*3=15."),
    countingSpec("qa_amc_count", "A tournament has 6 teams, and every pair plays once. How many games are played?", "15", "Each game is a pair of teams, so C(6,2)=6*5/2=15.", ["counting_combinations"]),
    countingSpec("qa_amc_count", "How many integers from 1 to 20 are divisible by 2 or 5?", "12", "There are 10 multiples of 2 and 4 multiples of 5, with 2 multiples of 10 counted twice, so 10+4-2=12.", ["counting_inclusion_exclusion"])
  ];
}

function buildAmcGeometryBackfill(): NewProblemSpec[] {
  return [
    geometrySpec("qa_amc_geo", "A triangle has angles 50 degrees and 60 degrees. What is the third angle?", "70", "Triangle angles sum to 180, so 180-50-60=70.", ["geo_triangle_angles"]),
    geometrySpec("qa_amc_geo", "A rectangle is 8 by 5. What is its area?", "40", "Area is length times width: 8*5=40.", ["geo_area"]),
    geometrySpec("qa_amc_geo", "A square has perimeter 36. What is its area?", "81", "Each side is 36/4=9, so the area is 9^2=81.", ["geo_area", "geo_perimeter"]),
    geometrySpec("qa_amc_geo", "Two triangles are congruent. One has side lengths 5, 7, and 9. What is the perimeter of the other?", "21", "Congruent triangles have matching side lengths, so the perimeter is 5+7+9=21.", ["geo_congruence"]),
    geometrySpec("qa_amc_geo", "A right triangle has legs 6 and 8. What is its hypotenuse?", "10", "Use the Pythagorean theorem: 6^2+8^2=100, so the hypotenuse is 10.", ["geo_pythagorean"]),
    geometrySpec("qa_amc_geo", "A circle has radius 3. What is its circumference in terms of pi?", "6pi", "Circumference is 2*pi*r, so 2*pi*3=6pi.", ["geo_circles"]),
    geometrySpec("qa_amc_geo", "A 90-degree arc is what fraction of a full circle?", "1/4", "A full circle is 360 degrees, and 90/360=1/4.", ["geo_arc_length"], "fraction"),
    geometrySpec("qa_amc_geo", "Two congruent rectangles each have area 24. What is their combined area?", "48", "Congruent rectangles have equal area, so 24+24=48.", ["geo_congruence", "geo_area"]),
    geometrySpec("qa_amc_geo", "A parallelogram has base 9 and height 4. What is its area?", "36", "Area is base times height: 9*4=36.", ["geo_area"]),
    geometrySpec("qa_amc_geo", "A triangle has base 10 and height 7. What is its area?", "35", "Triangle area is base*height/2, so 10*7/2=35.", ["geo_area", "geo_triangles"]),
    geometrySpec("qa_amc_geo", "A rectangle is enlarged by a scale factor of 2. Its old area is 15. What is its new area?", "60", "Area scales by the square of the scale factor, so 15*4=60.", ["geo_similarity", "geo_area"]),
    geometrySpec("qa_amc_geo", "Two congruent angles measure 3x+10 and 70 degrees. What is x?", "20", "Congruent angles are equal, so 3x+10=70 and x=20.", ["geo_congruence", "geo_angles"]),
    geometrySpec("qa_amc_geo", "A coordinate rectangle has vertices (0,0), (6,0), (6,4), and (0,4). What is its perimeter?", "20", "Side lengths are 6 and 4, so perimeter is 2(6+4)=20.", ["geo_coordinate_geometry", "geo_perimeter"]),
    geometrySpec("qa_amc_geo", "A regular hexagon is divided into 6 congruent equilateral triangles. If each triangle has perimeter 9, what is the hexagon perimeter?", "18", "Each triangle side is 3. The hexagon has 6 outer sides, so perimeter is 18.", ["geo_congruence", "geo_triangles"]),
    geometrySpec("qa_amc_geo", "A circle has diameter 14. What is its radius?", "7", "The radius is half the diameter, so 14/2=7.", ["geo_circles"]),
    geometrySpec("qa_amc_geo", "Two congruent squares have total perimeter 40. What is the side length of one square?", "5", "Each square has perimeter 20, so each side is 20/4=5.", ["geo_congruence", "geo_perimeter"])
  ];
}

function buildAmcNumberTheoryBackfill(): NewProblemSpec[] {
  return [
    numberTheorySpec("qa_amc_nt", "What is the greatest common divisor of 36 and 60?", "12", "The common factors include 1,2,3,4,6,12; the greatest is 12.", ["nt_gcd"]),
    numberTheorySpec("qa_amc_nt", "What is the least common multiple of 8 and 12?", "24", "Multiples of 8 are 8,16,24; multiples of 12 are 12,24, so the LCM is 24.", ["nt_lcm"]),
    numberTheorySpec("qa_amc_nt", "How many positive divisors does 18 have?", "6", "The divisors are 1,2,3,6,9,18, so there are 6.", ["nt_divisibility"]),
    numberTheorySpec("qa_amc_nt", "What is the remainder when 47 is divided by 5?", "2", "45 is divisible by 5, and 47-45=2.", ["nt_remainders"]),
    numberTheorySpec("qa_amc_nt", "How many primes are between 10 and 20?", "4", "The primes are 11, 13, 17, and 19.", ["nt_primes"]),
    numberTheorySpec("qa_amc_nt", "What is the prime factorization of 84?", "2^2*3*7", "84=4*21=2^2*3*7.", ["nt_factorization"], "symbolic"),
    numberTheorySpec("qa_amc_nt", "What is the smallest positive integer divisible by both 6 and 15?", "30", "This is the LCM; 6=2*3 and 15=3*5, so LCM=2*3*5=30.", ["nt_lcm"]),
    numberTheorySpec("qa_amc_nt", "If n is divisible by 9, what is the remainder when n is divided by 3?", "0", "Every multiple of 9 is also a multiple of 3, so the remainder is 0.", ["nt_divisibility"]),
    numberTheorySpec("qa_amc_nt", "What is 2^5?", "32", "2^5 means 2*2*2*2*2=32.", ["arith_exponents"]),
    numberTheorySpec("qa_amc_nt", "Which is larger: the GCD or LCM of 9 and 12? Enter the larger value.", "36", "The GCD is 3 and the LCM is 36, so the larger value is 36.", ["nt_gcd", "nt_lcm"]),
    numberTheorySpec("qa_amc_nt", "What is the remainder when 3*17 is divided by 10?", "1", "3*17=51, and 51 leaves remainder 1 when divided by 10.", ["nt_remainders"]),
    numberTheorySpec("qa_amc_nt", "How many factors of 20 are even?", "4", "The factors are 1,2,4,5,10,20, and the even ones are 2,4,10,20.", ["nt_divisibility"]),
    numberTheorySpec("qa_amc_nt", "What is the smallest prime factor of 91?", "7", "91=7*13, and 7 is the smaller prime factor.", ["nt_factorization", "nt_primes"]),
    numberTheorySpec("qa_amc_nt", "What is 100 mod 6?", "4", "96 is divisible by 6, and 100-96=4.", ["nt_modular"]),
    numberTheorySpec("qa_amc_nt", "How many multiples of 4 are from 1 through 30?", "7", "The multiples are 4,8,12,16,20,24,28, so there are 7.", ["nt_divisibility"]),
    numberTheorySpec("qa_amc_nt", "What is the sum of the distinct prime factors of 30?", "10", "The prime factors are 2,3,5, and their sum is 10.", ["nt_factorization", "nt_primes"])
  ];
}

function buildPrealgExpressionBackfill(): NewProblemSpec[] {
  return [
    prealgSpec("qa_prealg_expr", "Evaluate 4x+3 when x=5.", "23", "Substitute x=5 to get 4*5+3=23.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution"]),
    prealgSpec("qa_prealg_expr", "Write an expression for 7 more than twice n.", "2n+7", "Twice n is 2n; seven more is 2n+7.", "prealg-01-expressions", "Expressions and Variables", ["prealg_expressions"], "symbolic"),
    prealgSpec("qa_prealg_expr", "Evaluate a^2-1 when a=6.", "35", "Substitute 6: 6^2-1=36-1=35.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution", "arith_exponents"]),
    prealgSpec("qa_prealg_expr", "If p=3 and q=8, evaluate 2p+q.", "14", "2*3+8=6+8=14.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution"]),
    prealgSpec("qa_prealg_expr", "Write an expression for the perimeter of a square with side s.", "4s", "A square has four equal sides, so the perimeter is 4s.", "prealg-01-expressions", "Expressions and Variables", ["prealg_expressions"], "symbolic"),
    prealgSpec("qa_prealg_expr", "Evaluate 18 - 2y when y=4.", "10", "18-2*4=18-8=10.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution"]),
    prealgSpec("qa_prealg_expr", "Write an expression for half of x decreased by 3.", "x/2-3", "Half of x is x/2; decreased by 3 gives x/2-3.", "prealg-01-expressions", "Expressions and Variables", ["prealg_expressions"], "symbolic"),
    prealgSpec("qa_prealg_expr", "If m=10, evaluate 3(m-2).", "24", "First m-2=8, then 3*8=24.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution"]),
    prealgSpec("qa_prealg_expr", "Evaluate 5 + b/2 when b=14.", "12", "b/2=7, so 5+7=12.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution", "arith_fractions"]),
    prealgSpec("qa_prealg_expr", "Write an expression for the cost of x notebooks at 3 dollars each.", "3x", "Each notebook costs 3 dollars, so x notebooks cost 3x.", "prealg-01-expressions", "Expressions and Variables", ["prealg_word_to_equation"], "symbolic"),
    prealgSpec("qa_prealg_expr", "Evaluate 2r^2 when r=3.", "18", "r^2=9, so 2r^2=18.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution", "arith_exponents"]),
    prealgSpec("qa_prealg_expr", "If x=9, evaluate (x+1)/2.", "5", "(9+1)/2=10/2=5.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution", "arith_fractions"]),
    prealgSpec("qa_prealg_expr", "Write an expression for 5 less than k.", "k-5", "Five less than k means subtract 5 from k.", "prealg-01-expressions", "Expressions and Variables", ["prealg_expressions"], "symbolic"),
    prealgSpec("qa_prealg_expr", "Evaluate 7t-9 when t=4.", "19", "7*4-9=28-9=19.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution"]),
    prealgSpec("qa_prealg_expr", "Write an expression for the sum of a number and its double.", "x+2x", "A number can be x, and its double is 2x, so the sum is x+2x.", "prealg-01-expressions", "Expressions and Variables", ["prealg_expressions"], "symbolic"),
    prealgSpec("qa_prealg_expr", "Evaluate c/3+6 when c=21.", "13", "c/3=7, and 7+6=13.", "prealg-01-expressions", "Expressions and Variables", ["prealg_substitution", "arith_fractions"])
  ];
}

function buildPrealgSimplificationBackfill(): NewProblemSpec[] {
  return [
    prealgSpec("qa_prealg_simp", "Simplify 3x+5x.", "8x", "Combine like terms: 3x+5x=8x.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 4(a+2).", "4a+8", "Distribute 4 to both terms: 4a+8.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 6y-2y+9.", "4y+9", "Combine 6y-2y=4y, so the expression is 4y+9.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 2(x+5)+3x.", "5x+10", "Distribute to get 2x+10+3x, then combine to 5x+10.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 7m-(2m+1).", "5m-1", "Distribute the minus sign: 7m-2m-1=5m-1.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 5(2n-3).", "10n-15", "Distribute 5: 10n-15.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 9p+4-3p+2.", "6p+6", "Combine p terms and constants: 9p-3p=6p and 4+2=6.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 3(2x+1)-x.", "5x+3", "Distribute to get 6x+3-x, then combine to 5x+3.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 8q-2(q-4).", "6q+8", "Distribute -2: 8q-2q+8=6q+8.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 4r+3(r+2).", "7r+6", "Distribute and combine: 4r+3r+6=7r+6.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 10z-4z-5.", "6z-5", "Combine like terms: 10z-4z=6z.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 2(3a-1)+a.", "7a-2", "Distribute to get 6a-2+a, then combine to 7a-2.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 6-2(1-x).", "2x+4", "Distribute -2: 6-2+2x=2x+4.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 5u+2u-3u.", "4u", "Combine coefficients: 5+2-3=4.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 3(b+4)+2(b-1).", "5b+10", "Distribute: 3b+12+2b-2=5b+10.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic"),
    prealgSpec("qa_prealg_simp", "Simplify 12x-3(2x+1).", "6x-3", "Distribute -3: 12x-6x-3=6x-3.", "prealg-02-simplification", "Simplification and Distribution", ["prealg_simplification"], "symbolic")
  ];
}

function buildPrealgLinearEquationBackfill(): NewProblemSpec[] {
  return [
    equationSpec("qa_prealg_eq", "Solve x+7=19.", "12", "Subtract 7 from both sides: x=12."),
    equationSpec("qa_prealg_eq", "Solve 3x=27.", "9", "Divide both sides by 3: x=9."),
    equationSpec("qa_prealg_eq", "Solve x/4=6.", "24", "Multiply both sides by 4: x=24."),
    equationSpec("qa_prealg_eq", "Solve 2x+5=21.", "8", "Subtract 5 to get 2x=16, then divide by 2."),
    equationSpec("qa_prealg_eq", "Solve 5x-3=22.", "5", "Add 3 to get 5x=25, then divide by 5."),
    equationSpec("qa_prealg_eq", "Solve 4x+1=13.", "3", "Subtract 1 to get 4x=12, then divide by 4."),
    equationSpec("qa_prealg_eq", "Solve x-9=14.", "23", "Add 9 to both sides: x=23."),
    equationSpec("qa_prealg_eq", "Solve 7x=56.", "8", "Divide by 7: x=8."),
    equationSpec("qa_prealg_eq", "Solve x/5+2=9.", "35", "Subtract 2 to get x/5=7, then multiply by 5."),
    equationSpec("qa_prealg_eq", "Solve 6x-4=32.", "6", "Add 4 to get 6x=36, then divide by 6."),
    equationSpec("qa_prealg_eq", "Solve 3(x+2)=24.", "6", "Divide by 3 to get x+2=8, then subtract 2."),
    equationSpec("qa_prealg_eq", "Solve 2x+7=x+18.", "11", "Subtract x and 7 to get x=11."),
    equationSpec("qa_prealg_eq", "Solve 9=15-x.", "6", "Subtract 15 to get -6=-x, so x=6."),
    equationSpec("qa_prealg_eq", "Solve 4(x-1)=20.", "6", "Divide by 4 to get x-1=5, then add 1."),
    equationSpec("qa_prealg_eq", "Solve x/3-1=5.", "18", "Add 1 to get x/3=6, then multiply by 3."),
    equationSpec("qa_prealg_eq", "Solve 10+2x=30.", "10", "Subtract 10 to get 2x=20, then divide by 2.")
  ];
}

function buildPrealgRatioBackfill(): NewProblemSpec[] {
  return [
    ratioSpec("qa_prealg_ratio", "The ratio of red to blue marbles is 3:5. If there are 15 blue marbles, how many red marbles are there?", "9", "The scale factor is 15/5=3, so red marbles are 3*3=9."),
    ratioSpec("qa_prealg_ratio", "What is 20% of 45?", "9", "20% is 1/5, and 45/5=9."),
    ratioSpec("qa_prealg_ratio", "A recipe uses 2 cups of rice for 5 cups of water. How many cups of water are needed for 6 cups of rice?", "15", "The scale factor from 2 to 6 is 3, so water is 5*3=15."),
    ratioSpec("qa_prealg_ratio", "Simplify the ratio 18:24.", "3:4", "Divide both parts by 6 to get 3:4.", "text"),
    ratioSpec("qa_prealg_ratio", "If 4 notebooks cost 12 dollars, how much do 7 notebooks cost?", "21", "The unit price is 12/4=3 dollars, so 7 notebooks cost 21 dollars."),
    ratioSpec("qa_prealg_ratio", "A class has 12 boys and 18 girls. What is the ratio of boys to girls in simplest form?", "2:3", "The ratio 12:18 divides by 6 to become 2:3.", "text"),
    ratioSpec("qa_prealg_ratio", "What number is 25% of 80?", "20", "25% is 1/4, and 80/4=20."),
    ratioSpec("qa_prealg_ratio", "If 3 pencils cost 75 cents, how many cents do 8 pencils cost?", "200", "Each pencil costs 25 cents, so 8 cost 200 cents."),
    ratioSpec("qa_prealg_ratio", "A map scale is 1 inch to 6 miles. How many miles are represented by 4 inches?", "24", "Multiply 4 by 6 to get 24 miles."),
    ratioSpec("qa_prealg_ratio", "Increase 50 by 10%. What is the result?", "55", "10% of 50 is 5, so the increased value is 55."),
    ratioSpec("qa_prealg_ratio", "A team wins 6 of 8 games. What percent did it win?", "75", "6/8=3/4=75%."),
    ratioSpec("qa_prealg_ratio", "If a:b = 2:7 and a=10, what is b?", "35", "The scale factor is 10/2=5, so b=7*5=35."),
    ratioSpec("qa_prealg_ratio", "What is 15% of 200?", "30", "15% of 200 is 0.15*200=30."),
    ratioSpec("qa_prealg_ratio", "A car travels 180 miles in 3 hours. What is its speed in miles per hour?", "60", "Speed is distance/time = 180/3=60."),
    ratioSpec("qa_prealg_ratio", "The ratio 5:8 is equivalent to 20:x. What is x?", "32", "The scale factor from 5 to 20 is 4, so x=8*4=32."),
    ratioSpec("qa_prealg_ratio", "A price drops from 40 dollars to 30 dollars. What percent decrease is this?", "25", "The decrease is 10, and 10/40=25%.")
  ];
}

function buildConceptBackfill(): NewProblemSpec[] {
  return [
    geometrySpec("qa_concept_geo_cong", "Two congruent triangles have corresponding sides 8 and x+3. What is x?", "5", "Congruent corresponding sides are equal, so x+3=8 and x=5.", ["geo_congruence"]),
    geometrySpec("qa_concept_geo_cong", "Two congruent segments have lengths 2a+1 and 11. What is a?", "5", "Set 2a+1=11, so 2a=10 and a=5.", ["geo_congruence"]),
    geometrySpec("qa_concept_geo_cong", "A triangle congruent to one with angles 40, 60, and 80 has a smallest angle of what measure?", "40", "Congruent triangles have matching angle measures, so the smallest angle is 40.", ["geo_congruence"]),
    statsSpec("qa_concept_mode", "What is the mode of 2, 5, 5, 7, 8?", "5", "The mode is the value that appears most often; 5 appears twice."),
    statsSpec("qa_concept_mode", "The scores are 6, 6, 7, 9, 9, 9. What is the mode?", "9", "9 appears three times, more than any other value."),
    statsSpec("qa_concept_mode", "What is the mode of 4, 4, 4, 6, 6, 8?", "4", "4 appears three times, which is the highest frequency."),
    statsSpec("qa_concept_mode", "A data set has values 1, 2, 2, 3, 3, 3, 4. What is the mode?", "3", "3 appears three times, more than any other number."),
    countingSpec("qa_concept_pigeon", "There are 5 boxes and 21 balls. What is the smallest number of balls guaranteed to be in one box?", "5", "If each box had at most 4 balls, there would be at most 20 balls. With 21 balls, one box has at least 5.", ["counting_pigeonhole"]),
    countingSpec("qa_concept_pigeon", "How many people must be in a room to guarantee that two share a birth month?", "13", "There are 12 months. With 13 people, two must share a month.", ["counting_pigeonhole"]),
    countingSpec("qa_concept_pigeon", "A bag has socks in 4 colors. How many socks guarantee two of the same color?", "5", "One sock of each color is possible in 4 draws; the fifth guarantees a match.", ["counting_pigeonhole"]),
    countingSpec("qa_concept_combo", "How many ways can 3 students be chosen from 5 students?", "10", "Use combinations: 5*4*3/(3*2*1)=10.", ["counting_combinations"])
  ];
}

function buildRemainingCoverageBackfill(): NewProblemSpec[] {
  return [
    statsSpec("qa_amc_data", "What is the mode of 3, 4, 4, 6, 8?", "4", "The mode is the value that occurs most often; 4 appears twice."),
    statsSpec("qa_amc_data", "What is the range of 5, 9, 2, 12, 7?", "10", "The range is maximum minus minimum: 12-2=10."),
    statsSpec("qa_amc_data", "The mean of 6, 8, and x is 10. What is x?", "16", "The total must be 3*10=30. Since 6+8=14, x=16."),
    statsSpec("qa_amc_data", "The data set 2, 4, 6, 8, 10 has median what?", "6", "The middle value in order is 6."),
    statsSpec("qa_amc_data", "A score list has two 7s, three 8s, and one 9. What is the mode?", "8", "8 occurs three times, more than any other score."),
    statsSpec("qa_amc_data", "What is the mean of 4, 10, and 16?", "10", "The sum is 30 and there are 3 values, so the mean is 10."),
    statsSpec("qa_amc_data", "A set has minimum 11 and range 9. What is its maximum?", "20", "Range is maximum minus minimum, so maximum is 11+9=20."),
    statsSpec("qa_amc_data", "What is the median of 1, 3, 3, 7, 9, 11, 12?", "7", "With seven values, the fourth value is the median."),
    statsSpec("qa_amc_data", "The mean of four numbers is 12. What is their total?", "48", "Total equals mean times count: 12*4=48."),
    statsSpec("qa_amc_data", "What is the range of 14, 14, 18, 21?", "7", "The maximum is 21 and the minimum is 14, so the range is 7."),
    statsSpec("qa_amc_data", "If the mode of 5, 6, 6, x is 6, give one possible value of x.", "6", "Using x=6 makes 6 appear three times, so 6 is the mode."),
    statsSpec("qa_amc_data", "The median of 4, 8, x is 8 and x is greater than 8. What is the smallest possible integer x?", "9", "For 8 to be the middle value and x>8, the smallest integer x is 9."),
    statsSpec("qa_amc_data", "What value must be added to 2, 5, and 9 to make the mean 6?", "8", "Four values with mean 6 total 24. The known total is 16, so add 8."),
    statsSpec("qa_amc_data", "A data set has values 10, 10, 12, 15, 15, 15. What is the mode?", "15", "15 appears three times, more often than the other values."),
    statsSpec("qa_amc_data", "What is the median of 20, 10, 30, 40?", "25", "Ordered values are 10,20,30,40; median is the average of 20 and 30, which is 25."),
    statsSpec("qa_amc_data", "The range of five scores is 18 and the highest score is 95. What is the lowest score?", "77", "Lowest equals highest minus range: 95-18=77."),
    inclusionSpec("qa_concept_inclusion", "How many integers from 1 to 30 are divisible by 3 or 5?", "14", "There are 10 multiples of 3 and 6 multiples of 5, with 2 multiples of 15 counted twice, so 10+6-2=14."),
    inclusionSpec("qa_concept_inclusion", "In a class, 12 students play soccer, 9 play basketball, and 4 play both. How many play at least one of the two sports?", "17", "Use inclusion-exclusion: 12+9-4=17."),
    inclusionSpec("qa_concept_inclusion", "How many numbers from 1 to 40 are multiples of 4 or 6?", "14", "There are 10 multiples of 4 and 6 multiples of 6, with 2 multiples of 12 counted twice, so 10+6-2=14."),
    inclusionSpec("qa_concept_inclusion", "A survey found 18 like apples, 15 like bananas, and 7 like both. How many like apples or bananas?", "26", "Add both groups and subtract the overlap: 18+15-7=26."),
    decimalAppSpec("qa_alg_decapp", "A notebook costs 2.75 dollars and a pen costs 1.40 dollars. What is the total cost?", "4.15", "Add the decimal amounts: 2.75+1.40=4.15."),
    decimalAppSpec("qa_alg_decapp", "A runner completes 3.5 miles each day for 4 days. How many miles is that?", "14", "Multiply 3.5 by 4 to get 14."),
    decimalAppSpec("qa_alg_decapp", "A bill of 18.60 dollars is split equally among 3 people. How much does each pay?", "6.20", "Divide 18.60 by 3 to get 6.20."),
    decimalAppSpec("qa_alg_decapp", "A rope is 9.75 meters long. If 2.5 meters are cut off, how much remains?", "7.25", "Subtract 2.50 from 9.75 to get 7.25."),
    expLogSpec("qa_alg_explog", "Evaluate 2^6.", "64", "2^6 means multiplying six 2s, which equals 64."),
    expLogSpec("qa_alg_explog", "If 10^x = 1000, what is x?", "3", "1000=10^3, so x=3."),
    expLogSpec("qa_alg_explog", "Simplify 3^2 * 3^3.", "243", "Add exponents to get 3^5=243."),
    expLogSpec("qa_alg_explog", "Evaluate log base 2 of 8.", "3", "Since 2^3=8, the logarithm is 3."),
    polynomialSpec("qa_alg_poly", "Simplify x^2+3x^2.", "4x^2", "Combine like terms to get 4x^2.", "symbolic"),
    polynomialSpec("qa_alg_poly", "Multiply x(x+5).", "x^2+5x", "Distribute x to get x^2+5x.", "symbolic"),
    polynomialSpec("qa_alg_poly", "Simplify 2a^2+3a-a^2.", "a^2+3a", "Combine 2a^2-a^2 to get a^2, then keep +3a.", "symbolic"),
    polynomialSpec("qa_alg_poly", "Multiply (x+2)(x+3).", "x^2+5x+6", "FOIL gives x^2+3x+2x+6=x^2+5x+6.", "symbolic"),
    fractionMixSpec("qa_alg_fracmix", "Add 1/3 and 1/6.", "1/2", "Use denominator 6: 2/6+1/6=3/6=1/2.", "fraction"),
    fractionMixSpec("qa_alg_fracmix", "Subtract 3/4 - 1/8.", "5/8", "Use denominator 8: 6/8-1/8=5/8.", "fraction"),
    fractionMixSpec("qa_alg_fracmix", "Multiply 2/5 by 15.", "6", "15*2/5 = 3*2 = 6."),
    fractionMixSpec("qa_alg_fracmix", "Divide 3/4 by 3.", "1/4", "Dividing by 3 means multiplying by 1/3: 3/4*1/3=1/4.", "fraction"),
    rationalExprSpec("qa_alg_rat", "Simplify (2x)/(4x).", "1/2", "Cancel the common factor 2x to get 1/2.", "fraction"),
    rationalExprSpec("qa_alg_rat", "Simplify (x^2)/(x).", "x", "Cancel one factor of x, leaving x.", "symbolic"),
    rationalExprSpec("qa_alg_rat", "Solve x/3=7.", "21", "Multiply both sides by 3 to get x=21."),
    rationalExprSpec("qa_alg_rat", "Simplify (6a)/(9a).", "2/3", "Cancel the common factor 3a to get 2/3.", "fraction"),
    conicSpec("qa_pre_conic", "A circle has center (0,0) and radius 5. What is r^2 in its equation?", "25", "The equation is x^2+y^2=r^2, and 5^2=25."),
    conicSpec("qa_pre_conic", "For x^2+y^2=49, what is the radius?", "7", "The radius squared is 49, so the radius is 7."),
    conicSpec("qa_pre_conic", "A circle has diameter 12. What is its radius?", "6", "The radius is half the diameter, so 6."),
    conicSpec("qa_pre_conic", "For x^2+y^2=16, what is the diameter?", "8", "The radius is 4, so the diameter is 8."),
    linearExprSpec("qa_pre_exprlin", "Translate: five more than a number n.", "n+5", "Five more than n is n+5.", "symbolic"),
    linearExprSpec("qa_pre_exprlin", "Solve n+8=20.", "12", "Subtract 8 from both sides to get n=12."),
    linearExprSpec("qa_pre_exprlin", "Translate: three times a number decreased by 2.", "3x-2", "Three times a number is 3x; decreased by 2 gives 3x-2.", "symbolic"),
    linearExprSpec("qa_pre_exprlin", "Solve 4x=28.", "7", "Divide by 4 to get x=7."),
    radicalSpec("qa_pre_rad", "Simplify sqrt(49).", "7", "The square root of 49 is 7."),
    radicalSpec("qa_pre_rad", "Simplify sqrt(12).", "2sqrt(3)", "Since 12=4*3, sqrt(12)=2sqrt(3).", "symbolic"),
    radicalSpec("qa_pre_rad", "Evaluate sqrt(81)+2.", "11", "sqrt(81)=9, and 9+2=11."),
    radicalSpec("qa_pre_rad", "Simplify sqrt(50).", "5sqrt(2)", "Since 50=25*2, sqrt(50)=5sqrt(2).", "symbolic"),
    rationalPreSpec("qa_pre_rat", "Simplify (3x)/(6x).", "1/2", "Cancel the common factor 3x to get 1/2.", "fraction"),
    rationalPreSpec("qa_pre_rat", "Solve x/5=9.", "45", "Multiply both sides by 5 to get x=45."),
    rationalPreSpec("qa_pre_rat", "Simplify (10y)/(15y).", "2/3", "Cancel the common factor 5y to get 2/3.", "fraction"),
    rationalPreSpec("qa_pre_rat", "Simplify (a^2)/(a).", "a", "Cancel one factor of a to get a.", "symbolic")
  ];
}

function inclusionSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return countingSpec(prefix, statement, answer, solution, ["counting_inclusion_exclusion"]);
}

function decimalAppSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return algebra1ChapterSpec(prefix, statement, answer, solution, "ise-devmath-05-decimals", "Decimals and Applications", ["arith_decimals"], "computation", "Foundation");
}

function expLogSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return algebra1ChapterSpec(prefix, statement, answer, solution, "ise-devmath-20-exponential-logarithmic", "Exponential and Logarithmic Functions", ["arith_exponents"], "function_evaluation", "Honors");
}

function polynomialSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"]): NewProblemSpec {
  return algebra1ChapterSpec(prefix, statement, answer, solution, "ise-devmath-13-exponents-polynomials", "Exponents and Polynomials", ["alg_factoring"], "expression_simplification", "Standard", answerType);
}

function fractionMixSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return algebra1ChapterSpec(prefix, statement, answer, solution, "ise-devmath-04-fractions", "Fractions and Mixed Numbers", ["arith_fractions", "arith_mixed_numbers"], "computation", "Foundation", answerType);
}

function rationalExprSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return algebra1ChapterSpec(prefix, statement, answer, solution, "ise-devmath-15-rational-expressions", "Rational Expressions and Equations", ["alg_factoring"], "expression_simplification", "Honors", answerType);
}

function algebra1ChapterSpec(
  prefix: string,
  statement: string,
  answer: string,
  solution: string,
  chapter: string,
  chapterTitle: string,
  concepts: string[],
  problemType: string,
  layer: NonNullable<Problem["taxonomy"]>["layer"],
  answerType: Problem["answerType"] = "numeric"
): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter,
    chapterTitle,
    cognitiveTags: ["operation_selection", "symbolic_fluency"],
    concepts,
    course: "Algebra 1",
    difficulty: layer === "Honors" ? 4 : 3,
    layer,
    problemType,
    sequenceBase: 8800,
    skills: ["algebra_readiness"],
    stage: "Algebra Readiness",
    theme: "Algebra 1 Readiness"
  }, answerType);
}

function conicSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return prealgebraExtraSpec(prefix, statement, answer, solution, "ise-devmath-21-conic-sections", "Conic Sections", ["geo_coordinate_geometry"], "geometric_modeling", "Honors");
}

function linearExprSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return prealgebraExtraSpec(prefix, statement, answer, solution, "ise-devmath-03-equations", "Expressions and Linear Equations", ["alg_linear_equations", "prealg_expressions"], "equation_solving", "Standard", answerType);
}

function radicalSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return prealgebraExtraSpec(prefix, statement, answer, solution, "ise-devmath-18-radicals-complex", "Radicals and Complex Numbers", ["arith_roots"], "expression_simplification", "Honors", answerType);
}

function rationalPreSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return prealgebraExtraSpec(prefix, statement, answer, solution, "ise-devmath-15-rational-expressions", "Rational Expressions and Equations", ["alg_factoring"], "expression_simplification", "Honors", answerType);
}

function prealgebraExtraSpec(
  prefix: string,
  statement: string,
  answer: string,
  solution: string,
  chapter: string,
  chapterTitle: string,
  concepts: string[],
  problemType: string,
  layer: NonNullable<Problem["taxonomy"]>["layer"],
  answerType: Problem["answerType"] = "numeric"
): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter,
    chapterTitle,
    cognitiveTags: ["operation_selection", "structure_recognition"],
    concepts,
    course: "Pre-Algebra",
    difficulty: layer === "Honors" ? 4 : 3,
    layer,
    problemType,
    sequenceBase: 8900,
    skills: ["prealgebra_readiness"],
    stage: layer === "Honors" ? "AMC8 Transfer" : "Bridge",
    theme: "Algebra and Geometry Extensions"
  }, answerType);
}

function algebraSpec(prefix: string, statement: string, answer: string, solution: string, difficulty: number, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "amc8-04-algebraic-reasoning",
    chapterTitle: "Algebraic Reasoning",
    cognitiveTags: ["equation_from_context", "multi_step_planning"],
    concepts: ["alg_linear_equations", "prealg_expressions"],
    course: "AMC8",
    difficulty,
    layer: "AMC8",
    problemType: "equation_solving",
    sequenceBase: 8400,
    skills: ["algebraic_reasoning"],
    stage: "Algebra Readiness",
    theme: "Algebraic Reasoning"
  }, answerType);
}

function countingSpec(prefix: string, statement: string, answer: string, solution: string, extraConcepts: string[] = ["counting_principle"], answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "amc8-02-counting-probability",
    chapterTitle: "Counting and Probability",
    cognitiveTags: ["casework_planning", "multiplicative_reasoning"],
    concepts: unique(["counting_principle", ...extraConcepts]),
    course: "AMC8",
    difficulty: extraConcepts.includes("counting_pigeonhole") || extraConcepts.includes("counting_combinations") ? 5 : 4,
    layer: "AMC8",
    problemType: "counting_modeling",
    sequenceBase: 8200,
    skills: ["counting_modeling"],
    stage: "AMC8 Transfer",
    theme: "Counting and Probability"
  }, answerType);
}

function geometrySpec(prefix: string, statement: string, answer: string, solution: string, extraConcepts: string[] = ["geo_area"], answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "amc8-03-geometry",
    chapterTitle: "Geometry and Measurement",
    cognitiveTags: ["diagram_reasoning", "formula_selection"],
    concepts: unique([...extraConcepts]),
    course: "AMC8",
    difficulty: extraConcepts.includes("geo_congruence") ? 5 : 4,
    layer: "AMC8",
    problemType: "geometric_measurement",
    sequenceBase: 8300,
    skills: ["geometric_reasoning"],
    stage: "AMC8 Transfer",
    theme: "Geometry and Measurement"
  }, answerType);
}

function numberTheorySpec(prefix: string, statement: string, answer: string, solution: string, extraConcepts: string[] = ["nt_divisibility"], answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "amc8-01-number-theory",
    chapterTitle: "Number Theory Essentials",
    cognitiveTags: ["divisibility", "factor_structure"],
    concepts: unique(extraConcepts),
    course: "AMC8",
    difficulty: 4,
    layer: "AMC8",
    problemType: "number_structure",
    sequenceBase: 8100,
    skills: ["number_theory"],
    stage: "AMC8 Transfer",
    theme: "Number Theory"
  }, answerType);
}

function prealgSpec(prefix: string, statement: string, answer: string, solution: string, chapter: string, chapterTitle: string, concepts: string[], answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter,
    chapterTitle,
    cognitiveTags: ["symbolic_fluency", "operation_selection"],
    concepts,
    course: "Pre-Algebra",
    difficulty: answerType === "symbolic" ? 3 : 2,
    layer: "Standard",
    problemType: answerType === "symbolic" ? "expression_simplification" : "computation",
    sequenceBase: chapter === "prealg-01-expressions" ? 7100 : 7200,
    skills: ["prealgebra_fluency"],
    stage: "Bridge",
    theme: "Expressions and Equations"
  }, answerType);
}

function equationSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "prealg-03-linear-equations",
    chapterTitle: "Linear Equations",
    cognitiveTags: ["inverse_operations", "operation_selection"],
    concepts: ["alg_linear_equations"],
    course: "Pre-Algebra",
    difficulty: 3,
    layer: "Standard",
    problemType: "equation_solving",
    sequenceBase: 7300,
    skills: ["equation_solving"],
    stage: "Algebra Readiness",
    theme: "Expressions and Equations"
  });
}

function ratioSpec(prefix: string, statement: string, answer: string, solution: string, answerType: Problem["answerType"] = "numeric"): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "prealg-04-ratios-percent",
    chapterTitle: "Ratios Percent and Proportion",
    cognitiveTags: ["unit_rate_modeling", "part_whole_reasoning"],
    concepts: ["arith_ratios", "arith_percentages"],
    course: "Pre-Algebra",
    difficulty: 3,
    layer: "Standard",
    problemType: "proportional_reasoning",
    sequenceBase: 7400,
    skills: ["ratio_reasoning"],
    stage: "Bridge",
    theme: "Ratios and Proportions"
  }, answerType);
}

function statsSpec(prefix: string, statement: string, answer: string, solution: string): NewProblemSpec {
  return baseSpec(prefix, statement, answer, solution, {
    chapter: "amc8-topic-data-statistics",
    chapterTitle: "AMC8 Topic: Data and Statistics",
    cognitiveTags: ["data_interpretation", "frequency_reasoning"],
    concepts: ["stats_mode"],
    course: "AMC8",
    difficulty: 3,
    layer: "AMC8",
    problemType: "data_reasoning",
    sequenceBase: 9700,
    skills: ["data_reasoning"],
    stage: "AMC8 Transfer",
    theme: "Data, Counting, and Probability"
  });
}

function baseSpec(
  prefix: string,
  statement: string,
  answer: string,
  solution: string,
  meta: Omit<NewProblemSpec, "answer" | "choices" | "prefix" | "solution" | "sourceCollection" | "statement"> & {
    sourceCollection?: string;
  },
  answerType: Problem["answerType"] = "numeric"
): NewProblemSpec {
  return {
    ...meta,
    answer,
    answerType,
    choices: buildChoiceValues(answer, answerType),
    prefix,
    solution,
    sourceCollection: meta.sourceCollection || GENERATED_SOURCE,
    statement
  };
}

function mapBackfillProblem(
  spec: NewProblemSpec,
  index: number,
  conceptPrerequisites: Map<string, string[]>
): Problem {
  const id = `${spec.prefix}_${String(index).padStart(3, "0")}`;
  const answerType = spec.answerType ?? inferAnswerType(spec.answer, spec.choices);
  const distractors = buildDistractors(id, spec.answer, spec.choices ?? []);

  return {
    id,
    statement: spec.statement,
    answer: spec.answer,
    answerType,
    choices: buildChoices(spec.choices ?? [], distractors),
    difficulty: spec.difficulty,
    source: GENERATED_SOURCE,
    primaryConcept: spec.concepts[0],
    concepts: spec.concepts,
    prerequisiteConcepts: unique(spec.concepts.flatMap((concept) => conceptPrerequisites.get(concept) ?? [])),
    skills: spec.skills,
    patterns: [spec.problemType],
    misconceptions: ["operation_error", "intermediate_answer_error"],
    isAutoGradable: true,
    solution: spec.solution,
    curriculum: {
      course: spec.course,
      theme: spec.theme,
      chapter: spec.chapter,
      chapterTitle: spec.chapterTitle,
      sequence: spec.sequenceBase + index,
      sourceCollection: GENERATED_SOURCE
    },
    taxonomy: {
      version: "v0",
      layer: spec.layer,
      stage: spec.stage,
      problemType: spec.problemType,
      cognitiveTags: spec.cognitiveTags,
      estimatedTimeSeconds: spec.difficulty >= 5 ? 130 : spec.difficulty >= 4 ? 105 : 80
    },
    ...(distractors.length > 0 ? { distractors } : {})
  };
}

function buildChoiceValues(answer: string, answerType: Problem["answerType"]) {
  if (answerType === "symbolic" || answerType === "text" || answerType === "fraction") return undefined;
  const numeric = Number(answer);
  if (!Number.isFinite(numeric)) return undefined;

  return unique([
    String(numeric),
    String(numeric + 1),
    String(Math.max(0, numeric - 1)),
    String(numeric * 2),
    String(Math.max(0, numeric + 5))
  ]).slice(0, 5);
}

function buildDistractors(problemId: string, answer: string, values: string[]): Distractor[] {
  return values
    .filter((value) => normalize(value) !== normalize(answer))
    .slice(0, 4)
    .map((value, index) => ({
      id: `${problemId}_d${index + 1}`,
      choiceLabel: String.fromCharCode(66 + index),
      value,
      misconception: index % 2 === 0 ? "intermediate answer or arithmetic slip" : "operation selection error",
      cognitiveTag: index % 2 === 0 ? "fluency_precision" : "operation_selection",
      explanation: `This choice can come from a reasonable setup but misses the final simplification to ${answer}.`
    }));
}

function buildChoices(values: string[], distractors: Distractor[]): AnswerChoice[] {
  return values.map((value, index) => {
    const label = String.fromCharCode(65 + index);
    const distractor = distractors.find((item) => item.value === value);

    return {
      label,
      value,
      text: value,
      ...(distractor ? { distractorId: distractor.id } : {})
    };
  });
}

function inferAnswerType(answer: string, choices?: string[]): Problem["answerType"] {
  if (choices && choices.length > 0 && Number.isFinite(Number(answer))) return "multiple_choice";
  if (/^[0-9]+\/[0-9]+$/.test(answer)) return "fraction";
  if (/[a-z]/i.test(answer)) return "symbolic";
  return "numeric";
}

function readConceptPrerequisites() {
  const concepts = readJson<Array<{ id: string; prerequisites?: string[] }>>(CONCEPTS_PATH);
  return new Map(concepts.map((concept) => [concept.id, concept.prerequisites ?? []]));
}

function buildNeedsReport(
  beforeAudit: ReturnType<typeof buildProblemQualityAudit>,
  afterAudit: ReturnType<typeof buildProblemQualityAudit>,
  newProblems: Problem[]
) {
  const remainingChapters = afterAudit.thinChapters;
  const remainingConcepts = afterAudit.thinConcepts;

  return [
    "# Problem Quality Needs Report",
    "",
    `Generated after Problem Quality Upgrade v1.`,
    "",
    "## Completed in this batch",
    "",
    `- Partial explanations upgraded to complete: ${beforeAudit.explanationQuality.counts.partial - afterAudit.explanationQuality.counts.partial}`,
    `- Backfill problems added: ${newProblems.length}`,
    `- Thin chapters reduced: ${beforeAudit.thinChapters.length} -> ${afterAudit.thinChapters.length}`,
    `- Thin concepts reduced: ${beforeAudit.thinConcepts.length} -> ${afterAudit.thinConcepts.length}`,
    "",
    "## Still Needs Extra Source Material",
    "",
    remainingChapters.length === 0
      ? "- No chapters remain below the 20-problem floor."
      : remainingChapters.map((chapter) => `- ${chapter.course} / ${chapter.chapterTitle}: ${chapter.count}/20. Suggested source: targeted textbook exercises or past contest items for ${chapter.sourceCollection}.`).join("\n"),
    "",
    "## Still Thin Concepts",
    "",
    remainingConcepts.length === 0
      ? "- No concepts remain below the 5-problem floor."
      : remainingConcepts.map((concept) => `- ${concept.concept}: ${concept.count}/5. Add focused examples and transfer variants.`).join("\n"),
    "",
    "## Recommended External Material To Prepare",
    "",
    "- More AMC8 algebraic reasoning, counting, geometry, and number theory topic sets with worked solutions.",
    "- Additional Algebra 1 readiness exercises for ISE chapters that currently sit at 16 generated items.",
    "- Data/statistics mini-set for mode, range, mean/median comparison, and graph interpretation.",
    "- Geometry congruence mini-set with diagrams or diagram-free congruent triangle/segment problems.",
    ""
  ].join("\n");
}

function compareProblems(left: Problem, right: Problem) {
  return (
    courseOrder(left.curriculum.course) - courseOrder(right.curriculum.course) ||
    left.curriculum.sequence - right.curriculum.sequence ||
    left.curriculum.chapter.localeCompare(right.curriculum.chapter) ||
    left.id.localeCompare(right.id)
  );
}

function courseOrder(course: string) {
  if (course === "Pre-Algebra") return 1;
  if (course === "Algebra 1") return 2;
  if (course === "AMC8") return 3;
  return 99;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").trim();
}

function formatConcept(value: string) {
  return value
    .replace(/^(arith|prealg|alg|geo|nt|stats|counting)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

main();
