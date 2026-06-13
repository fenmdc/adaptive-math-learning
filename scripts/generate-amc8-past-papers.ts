import fs from "fs";
import path from "path";

type Layer = "Foundation" | "Standard" | "Honors" | "AMC8" | "AMC8 Stretch";
type Stage = "Foundation" | "Bridge" | "Algebra Readiness" | "AMC8 Transfer";

type PastPaperProblem = {
  id: string;
  year: number;
  number: number;
  statement: string;
  answer: string;
  choices: Record<"A" | "B" | "C" | "D" | "E", string>;
  concepts: string[];
  theme: string;
  chapter: string;
  chapterTitle: string;
  difficulty: number;
  layer: Layer;
  problemType: string;
  cognitiveTags: string[];
  skills: string[];
  patterns: string[];
  misconceptions: string[];
  solution: string;
  sourceFile: string;
  notes?: string;
};

type StagingProblem = {
  id: string;
  statement: string;
  answer: string;
  answer_type: "multiple_choice";
  choices: string;
  difficulty: string;
  concepts: string;
  skills: string;
  patterns: string;
  misconceptions: string;
  solution: string;
  course: "AMC8";
  theme: string;
  chapter: string;
  chapter_title: string;
  sequence: string;
  source_collection: string;
  source_file: string;
  taxonomy_layer: Layer;
  taxonomy_stage: Stage;
  problem_type: string;
  cognitive_tags: string;
  estimated_time_seconds: string;
  notes: string;
};

type DistractorRow = {
  problem_id: string;
  choice_label: string;
  value: string;
  misconception: string;
  cognitive_tag: string;
  explanation: string;
};

type ExplanationRow = {
  problem_id: string;
  hint_1: string;
  hint_2: string;
  step_by_step: string;
  common_mistake: string;
  why_correct: string;
  variant_idea: string;
};

const SOURCE_COLLECTION = "amc8_past_papers";
const SOURCE_DIR = path.join(process.cwd(), "datasets/textbooks/amc8-past-papers");
const STAGING_DIR = path.join(process.cwd(), "datasets/staging");
const TOPIC_CHAPTERS: Record<string, { chapter: string; chapterTitle: string; sequenceBase: number }> = {
  "Number Systems and Operations": {
    chapter: "amc8-topic-number-systems",
    chapterTitle: "AMC8 Topic: Number Systems and Operations",
    sequenceBase: 9100
  },
  "Number Theory and Integer Structure": {
    chapter: "amc8-topic-number-theory",
    chapterTitle: "AMC8 Topic: Number Theory and Integer Structure",
    sequenceBase: 9200
  },
  "Arithmetic and Proportional Reasoning": {
    chapter: "amc8-topic-arithmetic-proportional",
    chapterTitle: "AMC8 Topic: Arithmetic and Proportional Reasoning",
    sequenceBase: 9300
  },
  "Expressions and Equations": {
    chapter: "amc8-topic-expressions-equations",
    chapterTitle: "AMC8 Topic: Expressions and Equations",
    sequenceBase: 9400
  },
  "Data, Counting, and Probability": {
    chapter: "amc8-topic-counting-probability",
    chapterTitle: "AMC8 Topic: Data, Counting, and Probability",
    sequenceBase: 9500
  },
  "Geometry and Measurement": {
    chapter: "amc8-topic-geometry-measurement",
    chapterTitle: "AMC8 Topic: Geometry and Measurement",
    sequenceBase: 9600
  }
};

const problems: PastPaperProblem[] = [
  p(2013, 1, "Danica wants to arrange her model cars in rows with exactly 6 cars in each row. She now has 23 model cars. What is the smallest number of additional cars she must buy in order to be able to arrange all her cars this way?", "1", ["1", "2", "3", "4", "5"], ["arith_natural_numbers", "nt_divisibility"], "Number Theory and Integer Structure", "number_structure", ["divisibility", "least_multiple"], "The next multiple of 6 after 23 is 24, so she needs 1 more car."),
  p(2013, 2, "A sign at the fish market says, \"50% off, today only: half-pound packages for just $3 per package.\" What is the regular price for a full pound of fish, in dollars?", "12", ["6", "9", "10", "12", "15"], ["arith_percentages", "arith_ratios"], "Arithmetic and Proportional Reasoning", "proportional_reasoning", ["percent_discount", "unit_rate_modeling"], "If $3 is half price for a half pound, the regular half-pound price is $6. A full pound is $12."),
  p(2013, 3, "What is the value of 4(-1 + 2 - 3 + 4 - 5 + 6 - 7 + ... + 1000)?", "2000", ["-10", "0", "1", "500", "2000"], ["arith_integers", "arith_natural_numbers"], "Number Systems and Operations", "computation", ["pattern_recognition", "sign_error_risk"], "Pair the terms as (-1 + 2), (-3 + 4), ..., (-999 + 1000). There are 500 pairs, each equal to 1, so the expression is 4 x 500 = 2000."),
  p(2013, 4, "Eight friends ate at a restaurant and agreed to share the bill equally. Because Judi forgot her money, each of her seven friends paid an extra $2.50 to cover her portion of the total bill. What was the total bill?", "140", ["120", "128", "140", "144", "160"], ["arith_ratios", "prealg_word_to_equation"], "Arithmetic and Proportional Reasoning", "word_problem_modeling", ["unit_rate_modeling", "equation_from_context"], "Judi's share was covered by 7 friends paying $2.50 extra each: 7 x 2.50 = 17.50. The total bill was 8 x 17.50 = 140."),
  p(2013, 5, "Hammie is in the 6th grade and weighs 106 pounds. His quadruplet sisters weigh 5, 5, 6, and 8 pounds. Which is greater, the average weight of these five children or the median weight, and by how many pounds?", "average, by 20", ["median, by 60", "median, by 20", "average, by 5", "average, by 15", "average, by 20"], ["stats_mean", "stats_median"], "Data, Counting, and Probability", "data_reasoning", ["mean_vs_median", "outlier_effect"], "The mean is (106 + 5 + 5 + 6 + 8)/5 = 26. The median of 5, 5, 6, 8, 106 is 6. The average is greater by 20."),
  p(2013, 6, "In a product pyramid, each box is the product of the two boxes touching it in the row above. The displayed pyramid has lower entries consistent with 600 at the bottom. What is the missing number in the top row?", "4", ["2", "3", "4", "5", "6"], ["prealg_expressions", "nt_factorization"], "Expressions and Equations", "structure_reasoning", ["multiplicative_structure", "factor_structure"], "Work upward and downward through the product relationships. The only top-row value consistent with the displayed products is 4.", "This item depends on the original diagram; retained because the answer choices and product rule are recoverable from the extracted paper."),
  p(2013, 7, "Trey counted 6 train cars in the first 10 seconds. It took the train 2 minutes and 45 seconds to clear the crossing at a constant speed. Which was the most likely number of cars in the train?", "100", ["60", "80", "100", "120", "140"], ["arith_ratios", "arith_proportions"], "Arithmetic and Proportional Reasoning", "rate_reasoning", ["unit_rate_modeling", "proportional_reasoning"], "Two minutes 45 seconds is 165 seconds. At 6 cars per 10 seconds, the estimate is 6 x 16.5 = 99, closest to 100."),
  p(2013, 8, "A fair coin is tossed 3 times. What is the probability of at least two consecutive heads?", "3/8", ["1/8", "1/4", "3/8", "1/2", "3/4"], ["counting_probability"], "Data, Counting, and Probability", "probability_modeling", ["case_enumeration", "sample_space_modeling"], "The 8 equally likely outcomes are HHH, HHT, HTH, HTT, THH, THT, TTH, TTT. Three have consecutive heads: HHH, HHT, THH."),
  p(2013, 9, "The Incredible Hulk doubles the distance he jumps with each succeeding jump. If his first jump is 1 meter, then on which jump will he first be able to jump more than 1 kilometer?", "11th", ["9th", "10th", "11th", "12th", "13th"], ["arith_exponents"], "Number Systems and Operations", "exponential_growth", ["exponent_meaning", "threshold_reasoning"], "The nth jump is 2^(n-1) meters. Since 2^9 = 512 and 2^10 = 1024, the first jump over 1000 meters is the 11th."),
  p(2013, 10, "What is the ratio of the least common multiple of 180 and 594 to the greatest common factor of 180 and 594?", "330", ["110", "165", "330", "625", "660"], ["nt_gcd", "nt_lcm", "nt_factorization"], "Number Theory and Integer Structure", "number_structure", ["factor_structure", "gcd_lcm_relation"], "Use lcm(a,b) x gcd(a,b) = ab. Here gcd(180,594)=18, so lcm/gcd = (180 x 594)/(18 x 18) = 330."),
  p(2013, 11, "Ted's grandfather used his treadmill on 3 days this week. He went 2 miles each day at speeds 5, 3, and 4 miles per hour. If he had always walked at 4 miles per hour, how many minutes less would he have spent?", "4", ["1", "2", "3", "4", "5"], ["arith_ratios"], "Arithmetic and Proportional Reasoning", "rate_reasoning", ["unit_rate_modeling", "time_rate_distance"], "Actual time is 2/5 + 2/3 + 2/4 hours. At 4 mph for all 6 miles, time is 6/4 hours. The difference is 1/15 hour, or 4 minutes."),
  p(2013, 12, "A fair special sells one pair of sandals at $50, a second pair at a 40% discount, and a third pair at half price. What percentage of the $150 regular price is saved?", "30", ["25", "30", "33", "40", "45"], ["arith_percentages"], "Arithmetic and Proportional Reasoning", "percent_modeling", ["percent_discount", "part_whole_reasoning"], "The costs are 50, 30, and 25, for a total of 105. The savings are 45 out of 150, which is 30%."),
  p(2013, 13, "When Clara totaled her scores, she reversed the units digit and tens digit of one score. By which amount might her incorrect sum have differed from the correct one?", "45", ["45", "46", "47", "48", "49"], ["nt_divisibility", "prealg_expressions"], "Number Theory and Integer Structure", "number_structure", ["place_value", "divisibility"], "If the number is 10a + b and the reversed number is 10b + a, the difference is 9(a-b). It must be a multiple of 9; only 45 works."),
  p(2013, 14, "Abe holds 1 green and 1 red jelly bean. Bea holds 1 green, 1 yellow, and 2 red jelly beans. Each randomly picks a jelly bean to show the other. What is the probability that the colors match?", "3/8", ["1/4", "1/3", "3/8", "1/2", "2/3"], ["counting_probability"], "Data, Counting, and Probability", "probability_modeling", ["sample_space_modeling", "case_enumeration"], "There are 2 x 4 = 8 equally likely pairs. Matching pairs are green-green and two red-red cases, so the probability is 3/8."),
  p(2013, 15, "If 3^p + 3^4 = 90, 2^r + 44 = 76, and 5^3 + 6^s = 1421, what is the product of p, r, and s?", "40", ["27", "40", "50", "70", "90"], ["arith_exponents"], "Number Systems and Operations", "exponential_equations", ["exponent_meaning", "equation_solving"], "3^p = 9 so p=2. 2^r = 32 so r=5. 6^s = 1296 so s=4. The product is 2 x 5 x 4 = 40."),
  p(2013, 16, "The ratio of 8th-graders to 6th-graders in a project is 5:3, and the ratio of 8th-graders to 7th-graders is 8:5. What is the smallest possible number of students?", "89", ["16", "40", "55", "79", "89"], ["arith_ratios", "arith_proportions", "nt_lcm"], "Arithmetic and Proportional Reasoning", "ratio_modeling", ["common_multiple", "proportional_reasoning"], "The number of 8th-graders must be a common multiple of 5 and 8. Use 40: then 6th-graders are 24 and 7th-graders are 25, total 89."),
  p(2013, 17, "The sum of six consecutive positive integers is 2013. What is the largest of these six integers?", "338", ["335", "338", "340", "345", "350"], ["prealg_word_to_equation", "arith_natural_numbers"], "Expressions and Equations", "sequence_reasoning", ["average_structure", "equation_from_context"], "The average of the six integers is 2013/6 = 335.5. The six integers are centered around 335.5, so the largest is 338."),
  p(2013, 18, "Isabella uses one-foot cubical blocks to build a rectangular fort 12 feet long, 10 feet wide, and 5 feet high. The floor and four walls are one foot thick. How many blocks does the fort contain?", "280", ["204", "280", "320", "340", "600"], ["geo_area", "prealg_expressions"], "Geometry and Measurement", "spatial_reasoning", ["volume_decomposition", "structure_recognition"], "The outer prism has volume 12 x 10 x 5 = 600. The hollow interior is 10 x 8 x 4 = 320. The blocks total 600 - 320 = 280."),
  p(2013, 19, "Hannah shows Bridget and Cassie her test, but Bridget and Cassie do not show theirs. Cassie says she did not get the lowest score, and Bridget says she did not get the highest score. What is the ranking from highest to lowest?", "Cassie, Hannah, Bridget", ["Hannah, Cassie, Bridget", "Hannah, Bridget, Cassie", "Cassie, Bridget, Hannah", "Cassie, Hannah, Bridget", "Bridget, Cassie, Hannah"], ["counting_pigeonhole"], "Data, Counting, and Probability", "logic_reasoning", ["constraint_reasoning", "case_elimination"], "Cassie can know she is not lowest only if Hannah is below her. Bridget can know she is not highest only if Hannah is above her. Thus Cassie, Hannah, Bridget."),
  p(2013, 20, "A 1 by 2 rectangle is inscribed in a semicircle with the longer side on the diameter. What is the area of the semicircle?", "pi", ["pi/2", "2pi/3", "pi", "4pi/3", "5pi/3"], ["geo_circles", "geo_pythagorean", "geo_area"], "Geometry and Measurement", "geometric_measurement", ["formula_selection", "right_triangle_modeling"], "Half the diameter is 1 and the rectangle height is 1, so the radius is sqrt(1^2+1^2)=sqrt(2). The semicircle area is (1/2)pi r^2 = pi."),
  p(2013, 21, "Samantha bikes to the southwest corner of City Park, takes one diagonal path through the park, then bikes from the northeast corner to school. Her home is 2 blocks west and 1 block south of the southwest corner, and school is 2 blocks east and 2 blocks north of the northeast corner. How many shortest routes can she take?", "18", ["3", "6", "9", "12", "18"], ["counting_combinations", "counting_principle"], "Data, Counting, and Probability", "counting_paths", ["combinatorial_counting", "case_enumeration"], "There are C(3,1)=3 shortest ways to the park and C(4,2)=6 shortest ways from the park to school. The diagonal path is fixed, so 3 x 6 = 18."),
  p(2013, 22, "Toothpicks are used to make a grid that is 60 toothpicks long and 32 toothpicks high. How many toothpicks are used altogether?", "3932", ["1920", "1952", "1980", "2013", "3932"], ["geo_perimeter", "prealg_expressions"], "Geometry and Measurement", "grid_counting", ["structure_recognition", "counting_by_rows"], "There are 61 vertical lines of length 32 and 33 horizontal lines of length 60. Total toothpicks: 61 x 32 + 33 x 60 = 3932."),
  p(2013, 23, "Angle ABC of triangle ABC is a right angle. The sides of triangle ABC are diameters of semicircles. The semicircle on AB has area 8pi, and the arc of the semicircle on AC has length 8.5pi. What is the radius of the semicircle on BC?", "7.5", ["7", "7.5", "8", "8.5", "9"], ["geo_circles", "geo_pythagorean", "geo_arc_length"], "Geometry and Measurement", "geometric_measurement", ["right_triangle_modeling", "arc_length"], "The semicircle on AB has full circle area 16pi, so AB=8. The semicircle arc on AC has length 8.5pi, so AC=17. Then BC=15 by the Pythagorean theorem, and its semicircle radius is 7.5."),
  p(2013, 24, "Squares ABCD, EFGH, and GHIJ are equal in area. Points C and D are midpoints of sides JH and HF, respectively. What is the ratio of the area of pentagon AJICB to the sum of the areas of the three squares?", "1/3", ["1/4", "7/24", "1/3", "3/8", "5/12"], ["geo_area", "geo_similarity"], "Geometry and Measurement", "area_decomposition", ["auxiliary_construction", "area_recomposition"], "Using equal side lengths and midpoint relationships, decompose the shaded pentagon into pieces equivalent to one square. The total area is three squares, so the ratio is 1/3.", "This item depends on the original diagram; retained with the named points from the extracted source."),
  p(2013, 25, "A ball with diameter 4 inches rolls along a track made from 3 semicircular arcs with radii 100, 60, and 80 inches. The ball remains in contact with the track and does not slip. What is the distance the center of the ball travels from A to B?", "238pi", ["238pi", "240pi", "260pi", "280pi", "500pi"], ["geo_circles", "geo_arc_length"], "Geometry and Measurement", "arc_length", ["path_transform", "radius_adjustment"], "The center of the ball follows arcs adjusted by the ball radius 2. Accounting for the inward and outward semicircular arcs gives a total distance of 238pi."),
  p(2024, 1, "What is the ones digit of 222,222 - 22,222 - 2,222 - 222 - 22 - 2?", "2", ["0", "2", "4", "6", "8"], ["arith_natural_numbers"], "Number Systems and Operations", "computation", ["place_value", "fluency_precision"], "Only the ones digits matter: 2 - 2 - 2 - 2 - 2 - 2 has the same ones digit as 12, so the ones digit is 2."),
  p(2024, 2, "What is the value of 44/11 + 110/44 + 44/1100 in decimal form?", "6.54", ["6.4", "6.504", "6.54", "6.9", "6.94"], ["arith_fractions", "arith_decimals"], "Number Systems and Operations", "computation", ["fraction_fluency", "decimal_place_value"], "Compute 44/11 = 4, 110/44 = 2.5, and 44/1100 = 0.04. The sum is 6.54."),
  p(2024, 3, "Four squares of side lengths 4, 7, 9, and 10 are arranged in increasing size order with left and bottom edges aligned, alternating white-gray-white-gray. What is the visible gray area?", "52", ["42", "45", "49", "50", "52"], ["geo_area"], "Geometry and Measurement", "area_decomposition", ["area_recomposition", "diagram_reasoning"], "The visible gray area is the visible part of the 7 by 7 square plus the visible border of the 10 by 10 square. That total is 52.", "Diagram-dependent item retained from the OCR/source PDF with answer key verification."),
  p(2024, 4, "When Yunji added all the integers from 1 through 9, she accidentally left out one number. Her incorrect sum was a square number. Which number did she leave out?", "9", ["5", "6", "7", "8", "9"], ["arith_natural_numbers", "arith_roots"], "Number Systems and Operations", "number_structure", ["square_number", "complement_reasoning"], "The full sum is 45. To get a square by leaving out one number, use 45 - 9 = 36."),
  p(2024, 5, "Aaliyah rolls two standard 6-sided dice. The product of the numbers rolled is a multiple of 6. Which integer cannot be the sum of the two numbers?", "6", ["5", "6", "7", "8", "9"], ["counting_probability", "nt_divisibility"], "Data, Counting, and Probability", "case_elimination", ["divisibility", "case_enumeration"], "Check pairs whose product is divisible by 6. Sums 5, 7, 8, and 9 can occur, but no such pair has sum 6."),
  p(2024, 6, "Sergei skated around an ice rink along four labeled paths P, Q, R, and S. What is the order of the four paths from shortest to longest?", "R, P, S, Q", ["P, Q, R, S", "P, R, S, Q", "Q, S, P, R", "R, P, S, Q", "R, S, P, Q"], ["geo_perimeter"], "Geometry and Measurement", "path_comparison", ["diagram_reasoning", "length_comparison"], "Compare straight and curved segments in the original diagram. The shortest-to-longest order is R, P, S, Q.", "Diagram-dependent item retained with answer key verification."),
  p(2024, 7, "A 3 by 7 rectangle is tiled without overlap using 2 by 2, 1 by 4, and 1 by 1 tiles. What is the minimum possible number of 1 by 1 tiles used?", "5", ["1", "2", "3", "4", "5"], ["geo_area", "counting_principle"], "Geometry and Measurement", "tiling_reasoning", ["area_recomposition", "parity_reasoning"], "The rectangle has area 21. The larger tiles cover areas 4 and 4, so area and placement constraints force at least 5 unit tiles; a construction reaches 5."),
  p(2024, 8, "On Monday Taye has $2. Every day, he either gains $3 or doubles the amount of money he had on the previous day. How many different dollar amounts could Taye have on Thursday, 3 days later?", "6", ["3", "4", "5", "6", "7"], ["counting_principle", "prealg_expressions"], "Data, Counting, and Probability", "case_enumeration", ["state_tracking", "case_enumeration"], "Track the possible amounts for three days. The distinct Thursday amounts are 10, 11, 13, 14, 16, and 20, so there are 6."),
  p(2024, 9, "All of the marbles in Maria's collection are red, green, or blue. Maria has half as many red marbles as green marbles and twice as many blue marbles as green marbles. Which could be the total number of marbles?", "28", ["24", "25", "26", "27", "28"], ["arith_ratios", "arith_proportions"], "Arithmetic and Proportional Reasoning", "ratio_modeling", ["proportional_reasoning", "part_whole_reasoning"], "Let green be 2k. Then red is k and blue is 4k, for a total of 7k. Among the choices, only 28 is a multiple of 7."),
  p(2024, 10, "In January 1980 the Mauna Loa Observatory recorded CO2 levels of 338 ppm. The average reading increased by about 1.515 ppm each year. What is the expected level in January 2030, rounded to the nearest integer?", "414", ["399", "414", "420", "444", "459"], ["arith_decimals", "prealg_word_to_equation"], "Arithmetic and Proportional Reasoning", "linear_modeling", ["rate_modeling", "rounding"], "From 1980 to 2030 is 50 years. Add 50 x 1.515 = 75.75 to 338 to get 413.75, which rounds to 414."),
  p(2024, 11, "Triangle ABC has A(5,7), B(11,7), and C(3,y), with y > 7. The area of triangle ABC is 12. What is y?", "11", ["8", "9", "10", "11", "12"], ["geo_coordinate_geometry", "geo_area"], "Geometry and Measurement", "coordinate_geometry", ["area_formula", "coordinate_reasoning"], "Base AB has length 6. Area is (1/2)(6)(y-7)=12, so y-7=4 and y=11."),
  p(2024, 12, "Rohan keeps 90 guppies in 4 tanks. The 2nd tank has 1 more than the 1st, the 3rd has 2 more than the 2nd, and the 4th has 3 more than the 3rd. How many guppies are in the 4th tank?", "26", ["20", "21", "23", "24", "26"], ["prealg_word_to_equation", "alg_linear_equations"], "Expressions and Equations", "equation_solving", ["equation_from_context", "inverse_operations"], "Let the first tank have x. The tanks have x, x+1, x+3, x+6, so 4x+10=90. Then x=20 and the fourth tank has 26."),
  p(2024, 13, "Buzz Bunny hops up or down one stair at a time. In how many ways can Buzz start on the ground, make 6 hops, and end back on the ground?", "5", ["4", "5", "6", "8", "12"], ["counting_combinations", "counting_principle"], "Data, Counting, and Probability", "counting_paths", ["case_enumeration", "constraint_reasoning"], "Buzz needs three up hops and three down hops without going below ground. The valid balanced paths are counted by the third Catalan number, 5."),
  p(2024, 14, "The one-way routes connecting towns A, M, C, X, Y, and Z are shown in a weighted directed graph. Traveling along these routes, what is the shortest distance from A to Z?", "28", ["28", "29", "30", "31", "32"], ["geo_coordinate_geometry", "counting_principle"], "Geometry and Measurement", "path_optimization", ["diagram_reasoning", "optimization"], "Using the route distances in the original directed graph, the shortest path from A to Z has length 28.", "Diagram-dependent item retained with answer key verification."),
  p(2024, 15, "Let F, L, Y, B, U, G be distinct digits. Suppose FLYFLY is the greatest number satisfying 8 x FLYFLY = BUGBUG. What is FLY + BUG?", "1107", ["1089", "1098", "1107", "1116", "1125"], ["nt_divisibility", "prealg_expressions"], "Number Theory and Integer Structure", "number_structure", ["place_value", "multiplicative_structure"], "Since FLYFLY = 1001 x FLY and BUGBUG = 1001 x BUG, the equation reduces to 8 x FLY = BUG. The greatest valid FLY gives FLY + BUG = 1107."),
  p(2024, 16, "Minh enters the numbers 1 through 81 into a 9 by 9 grid. She calculates the product of the numbers in each row and column. What is the least number of rows and columns that could have a product divisible by 3?", "11", ["8", "9", "10", "11", "12"], ["nt_divisibility", "counting_pigeonhole"], "Number Theory and Integer Structure", "divisibility_structure", ["pigeonhole_reasoning", "divisibility"], "There are 27 multiples of 3. Arrange them to minimize affected lines. The minimum possible total of rows and columns with a multiple of 3 is 11."),
  p(2024, 17, "A chess king attacks all squares one step away horizontally, vertically, or diagonally. A white king and black king are placed on different squares of a 3 by 3 grid so they do not attack each other. In how many ways can this be done?", "32", ["20", "24", "27", "28", "32"], ["counting_principle", "geo_coordinate_geometry"], "Data, Counting, and Probability", "case_enumeration", ["case_enumeration", "spatial_reasoning"], "Count ordered placements by location type. Corner, edge, and center placements allow different numbers of non-attacking squares; the total is 32."),
  p(2024, 18, "Three concentric circles centered at O have radii 1, 2, and 3. The annulus between radii 1 and 2 is shaded, and a sector between radii 2 and 3 with central angle BOC is shaded. If shaded and unshaded areas are equal, what is angle BOC in degrees?", "108", ["108", "120", "135", "144", "150"], ["geo_circles", "geo_area"], "Geometry and Measurement", "geometric_measurement", ["area_modeling", "sector_area"], "The small annulus has area 3pi. The larger annulus has area 5pi. Equal shaded and unshaded areas force the sector in the larger annulus to have area 3pi, so the angle is 108 degrees."),
  p(2024, 19, "Jordan has 15 pairs of sneakers. Three fifths are red, and two thirds are high-top. What is the least possible fraction of the collection that is both red and high-top?", "4/15", ["0", "1/5", "4/15", "1/3", "2/5"], ["arith_fractions", "counting_principle"], "Data, Counting, and Probability", "inclusion_exclusion", ["overlap_reasoning", "constraint_reasoning"], "There are 9 red pairs and 10 high-top pairs among 15 total. The minimum overlap is 9+10-15=4 pairs, so the fraction is 4/15."),
  p(2024, 20, "Any three vertices of a cube PQRSTUVW can form a triangle. How many equilateral triangles contain P as a vertex?", "3", ["0", "1", "2", "3", "6"], ["geo_coordinate_geometry", "geo_congruence"], "Geometry and Measurement", "spatial_reasoning", ["3d_structure", "distance_reasoning"], "From vertex P, equilateral triangles are formed by choosing pairs of vertices at equal face-diagonal distances from P and from each other. There are 3 such triangles."),
  p(2024, 21, "A group of frogs lives in a tree. Frogs in shade are green and frogs in sun are yellow. Initially green:yellow is 3:1. Then 3 green frogs move to the sunny side and 5 yellow frogs move to the shady side. Now the ratio is 4:1. What is the difference between green and yellow frogs now?", "24", ["10", "12", "16", "20", "24"], ["arith_ratios", "alg_linear_equations"], "Arithmetic and Proportional Reasoning", "ratio_modeling", ["equation_from_context", "proportional_reasoning"], "Let the initial numbers be 3x and x. After the moves, green is 3x+2 and yellow is x-2. Solve (3x+2)/(x-2)=4 to get x=10, so the final difference is 32-8=24."),
  p(2024, 22, "A roll of tape is 4 inches in diameter and is wrapped around a ring that is 2 inches in diameter. The tape is 0.015 inches thick. If the tape is completely unrolled, approximately how long is it, rounded to the nearest 100 inches?", "600", ["300", "600", "1200", "1500", "1800"], ["geo_circles", "geo_area"], "Geometry and Measurement", "geometric_measurement", ["area_modeling", "unit_reasoning"], "The tape cross-section is an annulus with area pi(2^2 - 1^2)=3pi. Length times thickness is about this area, so length is 3pi/0.015, about 628 inches, which rounds to 600."),
  p(2024, 23, "Rodrigo first draws a segment from (0,4) to (2,0), coloring the 4 grid cells whose interiors it intersects. Next he draws a segment from (2000,3000) to (5000,8000). How many cells will he color this time?", "7000", ["6000", "6500", "7000", "7500", "8000"], ["geo_coordinate_geometry", "nt_gcd"], "Geometry and Measurement", "coordinate_geometry", ["lattice_path_counting", "gcd_structure"], "For a segment with horizontal change 3000 and vertical change 5000, the number of grid cells crossed is dx + dy - gcd(dx,dy) = 3000 + 5000 - 1000 = 7000."),
  p(2024, 24, "Jean made stained glass art shaped like two mountains. One peak is 8 feet high and the other is 12 feet high. Each peak forms a 90 degree angle, and the straight sides make 45 degree angles with the ground. The artwork area is 183 square feet. The sides meet at height h. What is h?", "5", ["4", "5", "4sqrt(2)", "6", "5sqrt(2)"], ["geo_area", "geo_triangles"], "Geometry and Measurement", "area_decomposition", ["right_triangle_modeling", "area_recomposition"], "Use the 45-45-90 geometry to write the two mountain areas in terms of h. Solving the resulting area equation gives h=5.", "Diagram-dependent item retained with answer key verification."),
  p(2024, 25, "A small airplane has 4 rows of seats with 3 seats in each row. Eight passengers have boarded randomly among the seats. A married couple is next to board. What is the probability there will be 2 adjacent seats in the same row for the couple?", "20/33", ["8/15", "32/55", "20/33", "34/55", "8/11"], ["counting_combinations", "counting_probability"], "Data, Counting, and Probability", "probability_modeling", ["complement_counting", "case_enumeration"], "Choose the 4 empty seats among 12. There are C(12,4)=495 possibilities. Counting arrangements with no adjacent pair gives 195, so favorable cases are 300. The probability is 300/495 = 20/33.")
];

function main() {
  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const stagingProblems = problems.map(toStagingProblem);
  const distractors = problems.flatMap(toDistractors);
  const explanations = problems.map(toExplanation);

  writeCsv(path.join(STAGING_DIR, "problem_staging.csv"), stagingProblems);
  writeCsv(path.join(STAGING_DIR, "distractors.csv"), distractors);
  writeCsv(path.join(STAGING_DIR, "example_explanations.csv"), explanations);
  fs.writeFileSync(path.join(SOURCE_DIR, "problems.json"), `${JSON.stringify(problems, null, 2)}\n`);
  fs.writeFileSync(path.join(SOURCE_DIR, "README.md"), buildReadme());

  console.log(`Generated ${problems.length} AMC8 past-paper problem(s).`);
  console.log(`Generated ${distractors.length} distractor row(s).`);
  console.log(`Generated ${explanations.length} explanation template(s).`);
}

function p(
  year: number,
  number: number,
  statement: string,
  answer: string,
  choices: string[],
  concepts: string[],
  theme: string,
  problemType: string,
  cognitiveTags: string[],
  solution: string,
  notes = ""
): PastPaperProblem {
  const id = `amc8_${year}_p${String(number).padStart(2, "0")}`;
  const difficulty = number <= 5 ? 2 : number <= 12 ? 3 : number <= 20 ? 4 : 5;
  const topicChapter = TOPIC_CHAPTERS[theme] ?? {
    chapter: "amc8-topic-mixed",
    chapterTitle: "AMC8 Topic: Mixed Competition Reasoning",
    sequenceBase: 9900
  };

  return {
    id,
    year,
    number,
    statement,
    answer,
    choices: {
      A: choices[0],
      B: choices[1],
      C: choices[2],
      D: choices[3],
      E: choices[4]
    },
    concepts,
    theme,
    chapter: topicChapter.chapter,
    chapterTitle: topicChapter.chapterTitle,
    difficulty,
    layer: number <= 10 ? "Standard" : number <= 20 ? "Honors" : number <= 23 ? "AMC8" : "AMC8 Stretch",
    problemType,
    cognitiveTags,
    skills: inferSkills(problemType, concepts),
    patterns: cognitiveTags,
    misconceptions: inferMisconceptions(problemType),
    solution,
    sourceFile: `datasets/textbooks/amc8-past-papers/source-pdfs/${year}AMC8.searchable.pdf`,
    notes
  };
}

function toStagingProblem(problem: PastPaperProblem): StagingProblem {
  const sequenceBase = TOPIC_CHAPTERS[problem.theme]?.sequenceBase ?? 9900;

  return {
    id: problem.id,
    statement: problem.statement,
    answer: problem.answer,
    answer_type: "multiple_choice",
    choices: Object.entries(problem.choices).map(([label, value]) => `${label}:${value}`).join("|"),
    difficulty: String(problem.difficulty),
    concepts: problem.concepts.join(";"),
    skills: problem.skills.join(";"),
    patterns: problem.patterns.join(";"),
    misconceptions: problem.misconceptions.join(";"),
    solution: problem.solution,
    course: "AMC8",
    theme: problem.theme,
    chapter: problem.chapter,
    chapter_title: problem.chapterTitle,
    sequence: String(sequenceBase + (problem.year - 2000) * 100 + problem.number),
    source_collection: SOURCE_COLLECTION,
    source_file: `${problem.sourceFile}; problem ${problem.number}`,
    taxonomy_layer: problem.layer,
    taxonomy_stage: "AMC8 Transfer",
    problem_type: problem.problemType,
    cognitive_tags: problem.cognitiveTags.join(";"),
    estimated_time_seconds: String(problem.difficulty <= 3 ? 90 : problem.difficulty === 4 ? 120 : 150),
    notes: [
      "Converted from local AMC8 past-paper OCR dataset.",
      `Original paper position: ${problem.year} AMC8 Problem ${problem.number}.`,
      problem.notes
    ].filter(Boolean).join(" ")
  };
}

function toDistractors(problem: PastPaperProblem): DistractorRow[] {
  return Object.entries(problem.choices)
    .filter(([, value]) => normalize(value) !== normalize(problem.answer))
    .map(([label, value], index) => ({
      problem_id: problem.id,
      choice_label: label,
      value,
      misconception: problem.misconceptions[index % problem.misconceptions.length] ?? "near_miss",
      cognitive_tag: problem.cognitiveTags[index % problem.cognitiveTags.length] ?? "operation_selection",
      explanation: `Choice ${label} is a plausible distractor for ${problem.problemType.replace(/_/g, " ")}; compare it with the modeled solution.`
    }));
}

function toExplanation(problem: PastPaperProblem): ExplanationRow {
  const conceptText = problem.concepts.map((concept) => concept.replace(/_/g, " ")).join(", ");

  return {
    problem_id: problem.id,
    hint_1: `Identify the ${conceptText} structure before choosing a computation.`,
    hint_2: `Eliminate choices that do not fit the ${problem.problemType.replace(/_/g, " ")} model.`,
    step_by_step: problem.solution,
    common_mistake: `A common mistake is ${problem.misconceptions[0].replace(/_/g, " ")}.`,
    why_correct: `The answer ${problem.answer} matches the AMC8 past-paper solution path: ${problem.solution}`,
    variant_idea: `Change one number in the prompt and solve with the same ${problem.problemType.replace(/_/g, " ")} structure.`
  };
}

function inferSkills(problemType: string, concepts: string[]) {
  if (problemType.includes("probability")) return ["probability_modeling"];
  if (problemType.includes("counting")) return ["systematic_counting"];
  if (problemType.includes("geometry") || problemType.includes("area") || problemType.includes("arc")) return ["geometry_modeling"];
  if (problemType.includes("ratio") || concepts.includes("arith_ratios")) return ["proportional_reasoning"];
  if (problemType.includes("number")) return ["number_structure"];
  return ["competition_problem_solving"];
}

function inferMisconceptions(problemType: string) {
  if (problemType.includes("probability")) return ["sample_space_error", "complement_confusion", "ratio_not_probability", "case_omission"];
  if (problemType.includes("counting")) return ["case_omission", "overcounting", "order_confusion", "structure_misread"];
  if (problemType.includes("geometry") || problemType.includes("area") || problemType.includes("arc")) return ["formula_confusion", "diagram_misread", "unit_error", "radius_diameter_confusion"];
  if (problemType.includes("ratio")) return ["additive_ratio_error", "ratio_flip", "wrong_total", "scale_factor_error"];
  if (problemType.includes("number")) return ["factor_misread", "divisibility_error", "place_value_error", "operation_error"];
  return ["operation_error", "structure_misread", "near_miss", "fluency_slip"];
}

function writeCsv<T extends Record<string, string>>(filePath: string, rows: T[]) {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "");
    return;
  }

  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");

  fs.writeFileSync(filePath, `${content}\n`);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, "\"\"")}"`;
  return value;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/π/g, "pi").replace(/\s+/g, "").replace(/,/g, "").trim();
}

function buildReadme() {
  return `# AMC8 Past Papers

This dataset contains project-native structured rows converted from the local AMC8 past-paper OCR assets.

Current v0 batch:

- 2013 AMC8: 25 problems
- 2024 AMC8: 25 problems

Source collection: \`${SOURCE_COLLECTION}\`

The original PDFs are kept in \`source-pdfs/\`, OCR text in \`extracted-text/\`, and normalized problem rows in \`problems.json\`.

Dual positioning policy:

- Course/source position: each item keeps its AMC8 year and problem number in the id, source file, and notes.
- Learning position: each item is assigned to an AMC8 topic chapter for adaptive practice and recommendation.
`;
}

main();
