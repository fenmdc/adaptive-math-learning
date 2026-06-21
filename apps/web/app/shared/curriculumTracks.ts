export type ContentLanguage = "en" | "zh";

export type ContentProfile = {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  curriculumSystem: string;
  language: ContentLanguage;
  displayTrack: string;
  defaultCourse?: string;
};

export type LanguageProfile = {
  id: ContentLanguage;
  title: string;
  navLabel: string;
  eyebrow: string;
  description: string;
};

export const LANGUAGE_PROFILES: LanguageProfile[] = [
  {
    id: "en",
    title: "English Learning",
    navLabel: "English",
    eyebrow: "English Curriculum",
    description: "Pre-Algebra, Algebra readiness, AMC8, and future US-facing math tracks."
  },
  {
    id: "zh",
    title: "中文学习",
    navLabel: "中文",
    eyebrow: "中文课程体系",
    description: "中文校内数学与中文奥数 Lite 独立呈现，后续可继续扩展到小学、初中、高中体系。"
  }
];

export const CONTENT_PROFILES: ContentProfile[] = [
  {
    id: "english-core",
    title: "English Core",
    shortTitle: "Core",
    subtitle: "Pre-Algebra, Algebra, Geometry-ready content",
    description: "Use this track for the main adaptive graph: Pre-Algebra, Algebra 1 readiness, functions, polynomials, and bridge skills.",
    curriculumSystem: "US",
    language: "en",
    displayTrack: "US Core",
    defaultCourse: "Pre-Algebra"
  },
  {
    id: "amc",
    title: "AMC Competition",
    shortTitle: "AMC",
    subtitle: "AMC8 now, AMC10-12 later",
    description: "Competition-style transfer practice with multiple choice support, distractors, and AMC8 chapter positioning.",
    curriculumSystem: "AMC",
    language: "en",
    displayTrack: "AMC Competition",
    defaultCourse: "AMC8"
  },
  {
    id: "cn-school",
    title: "中文校内",
    shortTitle: "校内",
    subtitle: "小学、初中、高中数学",
    description: "中文校内课程入口，先覆盖小学、初中、高中小批量测试题，后续可按年级与章节扩展。",
    curriculumSystem: "CN",
    language: "zh",
    displayTrack: "中文校内",
    defaultCourse: "CN Junior High Math"
  },
  {
    id: "cn-olympiad",
    title: "中文奥数 Lite",
    shortTitle: "奥数 Lite",
    subtitle: "数论、计数、几何思维",
    description: "中文奥数轻量入口，服务后续小学奥数、初中竞赛和 AMC 思维迁移的独立内容层。",
    curriculumSystem: "Olympiad",
    language: "zh",
    displayTrack: "中文奥数 Lite",
    defaultCourse: "CN Olympiad Lite"
  }
];

export function getLanguageProfile(language: string | null | undefined) {
  return LANGUAGE_PROFILES.find((profile) => profile.id === language) ?? LANGUAGE_PROFILES[0];
}

export function getProfilesByLanguage(language: string | null | undefined) {
  return CONTENT_PROFILES.filter((profile) => profile.language === getLanguageProfile(language).id);
}

export function getProfileById(profileId: string | null | undefined) {
  return CONTENT_PROFILES.find((profile) => profile.id === profileId) ?? CONTENT_PROFILES[0];
}

export function buildPracticeHref(profile: ContentProfile, options: { includeDefaultCourse?: boolean } = {}) {
  const params = new URLSearchParams({
    curriculumSystem: profile.curriculumSystem,
    language: profile.language,
    track: profile.displayTrack,
    autoGradableOnly: "true"
  });

  if (options.includeDefaultCourse && profile.defaultCourse) {
    params.set("course", profile.defaultCourse);
  }

  return `/practice?${params.toString()}`;
}
