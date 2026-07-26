export type LearningSupport = {
  choices: string[];
  hint: string;
  explanation: string;
  misconceptionFeedback: string;
};

export const reviewedLearningSupport: Record<string, LearningSupport> = {
  amc8_p001: {
    choices: ["6", "8", "9", "12"],
    hint: "Find the cost of one apple first, then scale that unit rate to 12 apples.",
    explanation: "Three apples cost $2, so one apple costs $2/3. Multiplying by 12 gives 12 × $2/3 = $8.",
    misconceptionFeedback: "Dividing 12 by 3 counts groups of apples; you must still multiply the four groups by $2.",
  },
  amc8_p002: {
    choices: ["5", "20", "25", "32"],
    hint: "Rewrite 25% as one quarter before multiplying.",
    explanation: "Since 25% = 1/4, take one quarter of 80: 80 ÷ 4 = 20.",
    misconceptionFeedback: "Do not treat 25% as 25; convert the percent to 0.25 or 1/4 first.",
  },
  amc8_p003: {
    choices: ["7", "8", "15", "22"],
    hint: "Undo the addition of 7 with the same operation on both sides.",
    explanation: "Subtract 7 from both sides of x + 7 = 15. This leaves x = 15 - 7 = 8.",
    misconceptionFeedback: "Changing sides is shorthand, not a sign trick; subtract 7 from both sides to preserve equality.",
  },
  amc8_p004: {
    choices: ["60", "70", "110", "130"],
    hint: "The three interior angles of every triangle total 180°.",
    explanation: "The known angles total 50° + 60° = 110°. The third angle is 180° - 110° = 70°.",
    misconceptionFeedback: "Adding only the two known angles gives 110°, but the question asks for the remaining angle.",
  },
  amc8_p005: {
    choices: ["2", "3", "6", "36"],
    hint: "List the factors shared by both 12 and 18, then choose the greatest one.",
    explanation: "The common factors of 12 and 18 are 1, 2, 3, and 6. The greatest of these is 6.",
    misconceptionFeedback: "The greatest common divisor must divide both numbers; multiplying them does not find a common factor.",
  },
  amc8_p006: {
    choices: ["2/5", "3/5", "3/2", "3"],
    hint: "Probability is favorable outcomes divided by all equally likely outcomes.",
    explanation: "There are 3 favorable red objects among 3 + 2 = 5 objects, so the probability is 3/5.",
    misconceptionFeedback: "The denominator is the total number of possible objects, not just the two color categories.",
  },
  amc8_p007: {
    choices: ["2x+3", "2x+5", "2x+6", "5x"],
    hint: "Multiply 2 by every term inside the parentheses.",
    explanation: "Distribute 2 across x + 3: 2 × x + 2 × 3 = 2x + 6.",
    misconceptionFeedback: "Multiplying only x misses the second term; the outside factor applies to both terms.",
  },
  amc8_p008: {
    choices: ["8", "15", "16", "30"],
    hint: "Perimeter adds all four side lengths; a rectangle has two sides of each length.",
    explanation: "A 5 by 3 rectangle has perimeter 2(5 + 3) = 2 × 8 = 16.",
    misconceptionFeedback: "Multiplying 5 × 3 finds area, not the distance around the rectangle.",
  },
  amc8_p009: {
    choices: ["6", "8", "9", "16"],
    hint: "An exponent of 3 means multiply three copies of the base.",
    explanation: "The expression 2³ means 2 × 2 × 2, which equals 8.",
    misconceptionFeedback: "Do not multiply the base by the exponent; 2 × 3 is not the meaning of 2³.",
  },
  amc8_p010: {
    choices: ["3", "4", "9", "36"],
    hint: "Undo multiplication by 3 using division on both sides.",
    explanation: "Divide both sides of 3x = 12 by 3. This gives x = 12 ÷ 3 = 4.",
    misconceptionFeedback: "Multiplying 12 by 3 moves away from isolating x; use the inverse operation, division.",
  },
  amc8_p011: {
    choices: ["0.5", "0.6", "They are equal", "Cannot tell"],
    hint: "Convert one half to a decimal so both values use the same representation.",
    explanation: "One half equals 0.5. Comparing 0.6 and 0.5 shows that 0.6 is larger.",
    misconceptionFeedback: "A larger denominator does not make 1/2 larger than 0.6; compare equivalent representations.",
  },
  amc8_p012: {
    choices: [
      "Its last digit is divisible by 3",
      "Its digit sum is divisible by 3",
      "It is an even number",
      "Its final two digits are divisible by 3",
    ],
    hint: "Add the digits of the number and test that smaller sum.",
    explanation: "A whole number is divisible by 3 exactly when the sum of its digits is divisible by 3.",
    misconceptionFeedback: "The last digit test works for 2 or 5, not for 3; divisibility by 3 uses the digit sum.",
  },
  amc8_p013: {
    choices: ["8", "12", "16", "20"],
    hint: "The area of a square is side length multiplied by the same side length.",
    explanation: "A square with side length 4 has area 4 × 4 = 16 square units.",
    misconceptionFeedback: "Adding four side lengths finds the perimeter; area measures the surface inside the square.",
  },
  amc8_p014: {
    choices: ["3", "4", "7", "8"],
    hint: "Undo the addition first, then undo the multiplication by 2.",
    explanation: "Subtract 3 from both sides to get 2x = 8. Dividing both sides by 2 gives x = 4.",
    misconceptionFeedback: "Use inverse operations in reverse order; dividing by 2 before removing 3 changes every term.",
  },
  amc8_p015: {
    choices: ["5", "6", "7", "8"],
    hint: "The prefix hexa- represents a count used in words such as hexagon.",
    explanation: "A hexagon is defined as a polygon with six sides, so the answer is 6.",
    misconceptionFeedback: "Do not count a drawing's visible corners casually; every polygon has the same number of sides and vertices.",
  },
  amc8_p016: {
    choices: ["2", "10", "12", "24"],
    hint: "List multiples of 4 and 6 until the first shared value appears.",
    explanation: "Multiples of 4 begin 4, 8, 12, while multiples of 6 begin 6, 12. Their least common multiple is 12.",
    misconceptionFeedback: "The greatest common divisor of 4 and 6 is 2; LCM asks for a shared multiple, not a shared factor.",
  },
  amc8_p017: {
    choices: ["0", "1/4", "1/2", "1"],
    hint: "A fair coin has two equally likely outcomes and one of them is heads.",
    explanation: "There is one favorable outcome, heads, among two equally likely outcomes, heads and tails. The probability is 1/2.",
    misconceptionFeedback: "Probability compares favorable outcomes with all outcomes; it is not 1 merely because heads is possible.",
  },
  amc8_p018: {
    choices: ["2", "8", "15", "18"],
    hint: "Undo division by 3 using multiplication on both sides.",
    explanation: "Multiplying both sides of x/3 = 5 by 3 gives x = 5 × 3 = 15.",
    misconceptionFeedback: "Dividing 5 by 3 repeats the original operation; use multiplication to isolate x.",
  },
  amc8_p019: {
    choices: ["1", "3", "4", "9"],
    hint: "The values are already ordered, so locate the number in the middle position.",
    explanation: "In the ordered list 1, 3, 5, the middle of the three values is 3. Therefore the median is 3.",
    misconceptionFeedback: "Median is a position after ordering; adding all values without dividing calculates neither median nor mean.",
  },
  amc8_p020: {
    choices: ["3", "6", "9", "18"],
    hint: "The diameter crosses the whole circle and is made of two radii.",
    explanation: "Diameter equals twice the radius. With radius 3, the diameter is 2 × 3 = 6.",
    misconceptionFeedback: "The radius reaches only from the center to the circle; the diameter spans two radius lengths.",
  },
  amc8_p021: {
    choices: ["0.25", "0.5", "2", "12.5"],
    hint: "Divide the total cost by the number of pencils to find the cost per pencil.",
    explanation: "Five pencils cost $2.50, so one pencil costs $2.50 ÷ 5 = $0.50.",
    misconceptionFeedback: "Dividing 5 by 2.50 reverses the units; use total dollars divided by the number of pencils.",
  },
  amc8_p022: {
    choices: ["4", "5", "16", "80"],
    hint: "Use division by 4 to undo the multiplication attached to x.",
    explanation: "Divide both sides of 4x = 20 by 4. This isolates x and gives x = 20 ÷ 4 = 5.",
    misconceptionFeedback: "Subtracting 4 does not undo multiplication by 4; choose the matching inverse operation.",
  },
  amc8_p023: {
    choices: ["10", "12", "20", "24"],
    hint: "A triangle uses half the area of a rectangle with the same base and height.",
    explanation: "Use A = 1/2 × base × height. Substituting 6 and 4 gives A = 1/2 × 6 × 4 = 12 square units.",
    misconceptionFeedback: "Multiplying base by height gives the surrounding rectangle's area; a triangle requires the factor 1/2.",
  },
  amc8_p024: {
    choices: ["2×6", "2^2*3", "3×4", "2^3*3"],
    hint: "Keep dividing 12 by prime numbers until every remaining factor is prime.",
    explanation: "Since 12 = 2 × 6 = 2 × 2 × 3, its prime factorization is 2² × 3, written here as 2^2*3.",
    misconceptionFeedback: "A factorization is not prime if it still contains composite factors such as 4 or 6.",
  },
  amc8_p025: {
    choices: ["3x", "5x", "6x", "6"],
    hint: "Multiply the numerical factors 3 and 2, then keep the variable x.",
    explanation: "The expression 3(2x) means 3 × 2 × x. Multiplying the coefficients gives 6, so the simplified expression is 6x.",
    misconceptionFeedback: "Adding 3 and 2 gives 5x, but adjacent factors are multiplied, not added.",
  },
  amc8_p026: {
    choices: ["1/6", "1/3", "1/2", "2/3"],
    hint: "List the six equally likely die results and count how many are even.",
    explanation: "The even outcomes on a standard six-sided die are 2, 4, and 6. That is 3 favorable outcomes out of 6, so 3/6 = 1/2.",
    misconceptionFeedback: "There are three even outcomes, but probability is favorable outcomes divided by all six possible outcomes.",
  },
  amc8_p027: {
    choices: ["90", "180", "270", "360"],
    hint: "Recall the fixed interior-angle sum shared by every triangle.",
    explanation: "The three interior angles of every triangle add to 180 degrees, regardless of the triangle's shape or side lengths.",
    misconceptionFeedback: "A full turn is 360 degrees; a triangle's interior angles make half of that amount, or 180 degrees.",
  },
  amc8_p028: {
    choices: ["-10", "-4", "4", "10"],
    hint: "Subtracting a negative number has the same effect as adding its positive counterpart.",
    explanation: "Replace subtraction of -3 with addition of 3: 7 - (-3) = 7 + 3 = 10.",
    misconceptionFeedback: "Do not combine the two minus signs into a negative result; subtracting a negative changes to addition.",
  },
  amc8_p029: {
    choices: ["0.5", "5", "10", "45"],
    hint: "Ten percent is one tenth, so divide 50 by 10.",
    explanation: "Convert 10% to 0.10 or 1/10. Then 0.10 × 50 = 5, so 10% of 50 is 5.",
    misconceptionFeedback: "Subtracting 10% from 50 gives 45, but the question asks for the percentage amount itself.",
  },
  amc8_p030: {
    choices: ["-13", "-5", "5", "13"],
    hint: "Undo subtraction of 4 by adding 4 to both sides of the equation.",
    explanation: "Add 4 to both sides of x - 4 = 9. This gives x = 9 + 4 = 13.",
    misconceptionFeedback: "Subtracting another 4 gives 5 and does not isolate x; use the inverse operation, addition.",
  },
  amc8_p031: {
    choices: ["3", "5", "8", "15"],
    hint: "Because 3 and 5 share no factor greater than 1, their first common multiple is their product.",
    explanation: "The multiples of 3 are 3, 6, 9, 12, 15, and the multiples of 5 are 5, 10, 15. The least shared value is 15.",
    misconceptionFeedback: "Adding the numbers gives 8, but the LCM must be a multiple of both 3 and 5.",
  },
  amc8_p032: {
    choices: ["2π", "4π", "8π", "16π"],
    hint: "Use the circle area formula A = πr² and substitute the radius 2.",
    explanation: "With r = 2, the area is A = π(2)² = π × 4 = 4π square units.",
    misconceptionFeedback: "Using 2πr calculates circumference; area requires squaring the radius in πr².",
  },
  amc8_p033: {
    choices: ["20", "30", "60", "120"],
    hint: "Average speed is total distance divided by total travel time.",
    explanation: "Divide 60 kilometers by 2 hours: 60 ÷ 2 = 30. The average speed is 30 kilometers per hour.",
    misconceptionFeedback: "Multiplying distance by time gives 120, but speed uses distance divided by time.",
  },
  amc8_p034: {
    choices: ["a", "5a", "5a^2", "6a"],
    hint: "The terms are like terms, so add their numerical coefficients and keep a unchanged.",
    explanation: "Both terms contain the same variable a. Adding the coefficients gives 2a + 3a = (2 + 3)a = 5a.",
    misconceptionFeedback: "Adding like terms does not multiply their variables; a² would result from a × a, not from 2a + 3a.",
  },
  amc8_p035: {
    choices: ["1/5", "2/5", "3/5", "2/3"],
    hint: "Not red means blue, so compare the number of blue objects with the total number of objects.",
    explanation: "There are 2 blue objects among 3 + 2 = 5 objects in total. Therefore the probability of selecting an object that is not red is 2/5.",
    misconceptionFeedback: "Using 3/5 finds the probability of red; the question asks for its complement, the two blue outcomes.",
  },
  amc8_p036: {
    choices: ["3", "5", "7", "9"],
    hint: "Subtract 6 from both sides first, then divide the remaining equation by 3.",
    explanation: "From 3x + 6 = 15, subtract 6 to get 3x = 9. Dividing both sides by 3 gives x = 3.",
    misconceptionFeedback: "Stopping at 3x = 9 leaves x multiplied by 3; divide by 3 to finish isolating the variable.",
  },
  amc8_p037: {
    choices: ["14", "28", "49", "56"],
    hint: "A square has four equal sides, so add the side length four times.",
    explanation: "The perimeter of a square is four times its side length. With side length 7, the perimeter is 4 × 7 = 28 units.",
    misconceptionFeedback: "Calculating 7 × 7 gives the area, 49; perimeter measures the distance around all four sides.",
  },
  amc8_p038: {
    choices: ["4", "5", "6", "10"],
    hint: "For an even number of ordered values, average the two values in the middle.",
    explanation: "The ordered values are 2, 4, 6, and 8. The two middle values are 4 and 6, so the median is (4 + 6) ÷ 2 = 5.",
    misconceptionFeedback: "Choosing 4 or 6 uses only one middle value; an even-sized set requires averaging both middle values.",
  },
  amc8_p039: {
    choices: ["6", "8", "16", "24"],
    hint: "An exponent of 4 means multiply four copies of the base 2.",
    explanation: "The expression 2^4 means 2 × 2 × 2 × 2. Multiplying the four factors gives 16.",
    misconceptionFeedback: "Multiplying the base by the exponent gives 8, but exponentiation means repeated multiplication.",
  },
  amc8_p040: {
    choices: [
      "Its final digit is even",
      "Its digit sum is even",
      "Its final two digits are even",
      "It has an even number of digits",
    ],
    hint: "Only the ones digit determines whether a whole number is divisible by 2.",
    explanation: "A whole number is divisible by 2 exactly when its final digit is 0, 2, 4, 6, or 8; in other words, its final digit is even.",
    misconceptionFeedback: "The sum or count of the digits does not determine divisibility by 2; inspect only the final digit.",
  },
  amc8_p041: {
    choices: ["0.4", "2.5", "7", "10"],
    hint: "Undo division by 5 by multiplying both sides of the equation by 5.",
    explanation: "Multiplying both sides of x/5 = 2 by 5 gives x = 2 × 5 = 10.",
    misconceptionFeedback: "Dividing 2 by 5 repeats the operation attached to x; multiplication is the inverse needed to isolate x.",
  },
  amc8_p042: {
    choices: ["11", "22", "24", "48"],
    hint: "Rectangle area is length multiplied by width.",
    explanation: "Use A = length × width. For a rectangle measuring 8 units by 3 units, A = 8 × 3 = 24 square units.",
    misconceptionFeedback: "Adding 8 and 3, or doubling that sum, relates to perimeter; area requires multiplying the dimensions.",
  },
  amc8_p043: {
    choices: ["63", "67", "73", "137"],
    hint: "Subtract 30 first, then subtract the remaining 7.",
    explanation: "Break 37 into 30 + 7. Then 100 - 30 = 70 and 70 - 7 = 63, so the difference is 63.",
    misconceptionFeedback: "Subtracting each digit independently can produce 73; regroup or decompose 37 to preserve place value.",
  },
  amc8_p044: {
    choices: ["2", "4", "8", "24"],
    hint: "List the factors shared by 8 and 12, then select the greatest one.",
    explanation: "The factors of 8 are 1, 2, 4, 8, and the factors of 12 include 1, 2, 3, 4, 6, 12. Their greatest shared factor is 4.",
    misconceptionFeedback: "The answer must divide both numbers; 8 divides 8 but does not divide 12, while 4 divides both.",
  },
  amc8_p045: {
    choices: ["0.04", "0.25", "0.4", "4"],
    hint: "Divide the numerator 1 by the denominator 4.",
    explanation: "A fraction bar means division, so 1/4 = 1 ÷ 4 = 0.25.",
    misconceptionFeedback: "Writing 0.4 uses the denominator as tenths; one quarter is twenty-five hundredths, or 0.25.",
  },
  amc8_p046: {
    choices: ["2", "3", "4", "7"],
    hint: "Divide both sides by 2 first, then undo the subtraction inside the parentheses.",
    explanation: "Divide 2(x - 1) = 6 by 2 to get x - 1 = 3. Add 1 to both sides, giving x = 4.",
    misconceptionFeedback: "Dividing 6 by 2 gives 3, but that value equals x - 1, not x; add 1 to finish.",
  },
  amc8_p047: {
    choices: ["45", "90", "180", "270"],
    hint: "All three angles total 180 degrees, and the right angle already accounts for 90 degrees.",
    explanation: "A triangle's interior angles sum to 180 degrees. Subtracting the 90-degree right angle leaves 90 degrees for the two acute angles together.",
    misconceptionFeedback: "The full triangle totals 180 degrees; the question asks only for the two acute angles after removing the right angle.",
  },
  amc8_p048: {
    choices: ["1/4", "1/2", "3/4", "1"],
    hint: "Multiply the probability of heads on the first toss by the probability of heads on the second toss.",
    explanation: "Each fair-coin toss has probability 1/2 of heads, and the tosses are independent. Thus P(two heads) = 1/2 × 1/2 = 1/4.",
    misconceptionFeedback: "Using 1/2 counts only one toss; getting heads twice requires both independent events to occur.",
  },
  amc8_p049: {
    choices: ["2", "8", "14", "24"],
    hint: "List multiples of 6 and 8 until the first shared value appears.",
    explanation: "Multiples of 6 include 6, 12, 18, 24, while multiples of 8 include 8, 16, 24. Their least common multiple is 24.",
    misconceptionFeedback: "Adding 6 and 8 gives 14, but an LCM must be divisible by both original numbers.",
  },
  amc8_p050: {
    choices: ["3", "4", "6", "12"],
    hint: "Combine x and 2x as like terms before isolating x.",
    explanation: "Combine the like terms: x + 2x = 3x. Then 3x = 12, so dividing both sides by 3 gives x = 4.",
    misconceptionFeedback: "Adding the coefficients gives 3x, not 3; the variable remains until both sides are divided by 3.",
  },
};

const misconceptionGuidance: Record<string, string> = {
  area_confusion: "Separate distance around a shape from the space inside it before choosing a formula.",
  division_error: "Write the inverse operation explicitly and check it by substituting the result.",
  formula_error: "Name the quantity being asked for, then write the matching formula before substituting.",
  gcd_confusion: "GCD looks for shared factors; LCM looks for the first shared multiple.",
  mean_confusion: "Median uses the middle position after ordering, while mean uses division of a total.",
  sign_error: "Preserve equality by applying the same inverse operation to both sides.",
};

export function createDraftLearningSupport({
  answer,
  misconception,
  solution,
}: {
  answer: string;
  misconception?: string;
  solution: string;
}) {
  const readableSolution = solution || `the result ${answer}`;
  return {
    hint: "Identify the requested quantity, write the relevant relationship, and substitute the given values carefully.",
    explanation: `A direct solution is ${readableSolution}. Following that calculation gives the final answer ${answer}.`,
    misconceptionFeedback: misconceptionGuidance[misconception ?? ""]
      ?? "Check that each operation answers the quantity asked for, then verify the result in the original statement.",
  };
}
