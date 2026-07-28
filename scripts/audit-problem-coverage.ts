import { buildLearningCatalog, getCanonicalTheme } from "../packages/learning-catalog";
import { loadProblemBankProblems } from "../packages/problem-bank/legacy";

const problems = loadProblemBankProblems();
const reviewedIds = new Set(
  problems.filter((problem) => problem.reviewStatus === "reviewed").map((problem) => problem.id),
);

for (const track of buildLearningCatalog()) {
  for (const course of track.courses) {
    const courseProblems = problems.filter((problem) => problem.curriculum?.course === course.course);
    const reviewed = courseProblems.filter((problem) => reviewedIds.has(problem.id)).length;
    const themeNames = [...new Set(courseProblems.map(getCanonicalTheme).filter(Boolean))];
    const themeCoverage = themeNames.map((theme) => {
      const themeProblems = courseProblems.filter((problem) => getCanonicalTheme(problem) === theme);
      return themeProblems.filter((problem) => problem.isAutoGradable).length;
    });
    const zeroAuto = themeCoverage.filter((count) => count === 0).length;
    const lowAuto = themeCoverage.filter((count) => count > 0 && count < 10).length;

    console.log(JSON.stringify({
      track: track.id,
      course: course.course,
      total: course.total,
      autoGradable: course.autoGradable,
      manualReview: course.manualReview,
      reviewed,
      canonicalThemes: themeNames.length,
      zeroAutoThemes: zeroAuto,
      lowAutoThemes: lowAuto,
    }));
  }
}
