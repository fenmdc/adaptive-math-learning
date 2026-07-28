import {
  adaptLegacyProblem,
  loadProblemBankProblems,
  type LegacyProblem,
} from "../problem-bank/legacy";

export type ContentLanguage = "en" | "zh";
export type LearningMode = "learn" | "practice";

export type LearningTrack = {
  id: "english-core" | "amc" | "cn-school" | "cn-olympiad";
  language: ContentLanguage;
  title: string;
  description: string;
};

export type CatalogCourse = {
  course: string;
  total: number;
  autoGradable: number;
  manualReview: number;
  themes: Array<{ name: string; total: number; autoGradable: number }>;
};

export type CatalogTrack = LearningTrack & {
  total: number;
  autoGradable: number;
  courses: CatalogCourse[];
};

export type LearningSectionQuery = {
  language: ContentLanguage;
  track?: string;
  course?: string;
  theme?: string;
  limit?: number;
};

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: "english-core",
    language: "en",
    title: "English Core",
    description: "Pre-Algebra, Algebra 1, Geometry, Precalculus, and SAT Math foundations.",
  },
  {
    id: "amc",
    language: "en",
    title: "AMC Competition",
    description: "AMC8, AMC10, and AMC12 competition practice in English.",
  },
  {
    id: "cn-school",
    language: "zh",
    title: "中文校内",
    description: "小学、初中与高中校内数学，按课程和主题独立练习。",
  },
  {
    id: "cn-olympiad",
    language: "zh",
    title: "中文奥数 Lite",
    description: "中文数论、计数与几何思维专项入口。",
  },
];

const THEME_ALIASES: Record<string, Record<string, string>> = {
  "CN Senior High Math": {
    "函数基础": "高一函数基础",
    "函数与方程": "高一函数基础",
    "函数与图像": "高一函数基础",
    "数列与模型": "高二数列",
    "概率统计": "高三概率统计",
  },
};

export function getCanonicalTheme(problem: LegacyProblem) {
  const course = problem.curriculum?.course ?? "";
  const theme = String(problem.curriculum?.theme ?? "");
  return THEME_ALIASES[course]?.[theme] ?? theme;
}

export function getProblemLanguage(problem: LegacyProblem): ContentLanguage {
  return problem.locale && typeof problem.locale === "object"
    && "language" in problem.locale && typeof problem.locale.language === "string"
    && problem.locale.language.startsWith("zh")
    ? "zh"
    : "en";
}

export function getProblemTrack(problem: LegacyProblem) {
  const language = getProblemLanguage(problem);
  const course = problem.curriculum?.course ?? "";
  const displayTrack = problem.locale && typeof problem.locale === "object"
    && "displayTrack" in problem.locale && typeof problem.locale.displayTrack === "string"
    ? problem.locale.displayTrack
    : "";

  if (language === "zh") return displayTrack === "中文奥数 Lite" || course === "CN Olympiad Lite"
    ? "cn-olympiad"
    : "cn-school";
  return course.startsWith("AMC") || displayTrack === "AMC Competition" ? "amc" : "english-core";
}

export function buildLearningCatalog(root = process.cwd()): CatalogTrack[] {
  const problems = loadProblemBankProblems(root);

  return LEARNING_TRACKS.map((track) => {
    const trackProblems = problems.filter((problem) => getProblemTrack(problem) === track.id);
    const courseNames = [...new Set(trackProblems.map((problem) => problem.curriculum?.course).filter(Boolean) as string[])]
      .sort((left, right) => left.localeCompare(right));
    const courses = courseNames.map((course) => {
      const courseProblems = trackProblems.filter((problem) => problem.curriculum?.course === course);
      const themeNames = [...new Set(courseProblems.map(getCanonicalTheme).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right));

      return {
        course,
        total: courseProblems.length,
        autoGradable: courseProblems.filter((problem) => problem.isAutoGradable).length,
        manualReview: courseProblems.filter((problem) => !problem.isAutoGradable).length,
        themes: themeNames.map((name) => {
          const themeProblems = courseProblems.filter((problem) => getCanonicalTheme(problem) === name);
          return {
            name,
            total: themeProblems.length,
            autoGradable: themeProblems.filter((problem) => problem.isAutoGradable).length,
          };
        }).filter((theme) => theme.autoGradable > 0),
      };
    });

    return {
      ...track,
      total: trackProblems.length,
      autoGradable: trackProblems.filter((problem) => problem.isAutoGradable).length,
      courses,
    };
  });
}

export function loadLearningSection(query: LearningSectionQuery, root = process.cwd()) {
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 40)));
  const filtered = loadProblemBankProblems(root)
    .filter((problem) => getProblemLanguage(problem) === query.language)
    .filter((problem) => !query.track || getProblemTrack(problem) === query.track)
    .filter((problem) => !query.course || problem.curriculum?.course === query.course)
    .filter((problem) => !query.theme || getCanonicalTheme(problem) === query.theme)
    .filter((problem) => problem.isAutoGradable && problem.answerType !== "manual")
    .sort((left, right) => left.difficulty - right.difficulty || left.id.localeCompare(right.id));

  return {
    total: filtered.length,
    problems: filtered.slice(0, limit).map((problem) => adaptLegacyProblem(problem, root)),
  };
}
