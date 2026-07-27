import Link from "next/link";

import { buildLearningCatalog, type ContentLanguage, type LearningMode } from "@/packages/learning-catalog";
import AppShell from "../ui/AppShell";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string; mode?: string }>;
}) {
  const query = await searchParams;
  const language: ContentLanguage = query.language === "zh" ? "zh" : "en";
  const mode: LearningMode = query.mode === "practice" ? "practice" : "learn";
  const tracks = buildLearningCatalog().filter((track) => track.language === language);

  return (
    <AppShell activeRoute="/library">
      <div className="catalog-page">
        <header className="page-header catalog-header">
          <div>
            <p className="page-context">Learning directory</p>
            <h1>{language === "zh" ? "选择中文学习版块" : "Choose an English learning section"}</h1>
            <p className="page-intro">
              {language === "zh"
                ? "中文题目与英文题目独立呈现，再按课程与主题进入引导学习或专项练习。"
                : "English and Chinese problem banks stay separate. Choose a course and topic before starting."}
            </p>
          </div>
        </header>

        <nav className="catalog-switcher" aria-label="Language and learning mode">
          <div>
            <span>Language / 语言</span>
            <Link className={language === "en" ? "is-active" : ""} href={`/library?language=en&mode=${mode}`}>English</Link>
            <Link className={language === "zh" ? "is-active" : ""} href={`/library?language=zh&mode=${mode}`}>中文</Link>
          </div>
          <div>
            <span>Mode / 模式</span>
            <Link className={mode === "learn" ? "is-active" : ""} href={`/library?language=${language}&mode=learn`}>{language === "zh" ? "引导学习" : "Guided learning"}</Link>
            <Link className={mode === "practice" ? "is-active" : ""} href={`/library?language=${language}&mode=practice`}>{language === "zh" ? "专项练习" : "Focused practice"}</Link>
          </div>
        </nav>

        <div className="catalog-tracks">
          {tracks.map((track) => (
            <section className="catalog-track" key={track.id}>
              <header>
                <div><span>{language === "zh" ? "中文题库" : "English bank"}</span><h2>{track.title}</h2><p>{track.description}</p></div>
                <dl><div><dt>Problems</dt><dd>{track.total.toLocaleString()}</dd></div><div><dt>Auto-check</dt><dd>{track.autoGradable.toLocaleString()}</dd></div></dl>
              </header>
              <div className="catalog-courses">
                {track.courses.map((course) => (
                  <article key={course.course}>
                    <div className="catalog-course-heading">
                      <div><h3>{course.course}</h3><p>{course.autoGradable.toLocaleString()} auto-check · {course.manualReview} manual review</p></div>
                      <Link href={practiceHref({ language, mode, track: track.id, course: course.course })}>{language === "zh" ? "全部开始" : "Start all"}</Link>
                    </div>
                    <div className="theme-links">
                      {course.themes.map((theme) => (
                        <Link href={practiceHref({ language, mode, track: track.id, course: course.course, theme: theme.name })} key={theme.name}>
                          <span>{theme.name}</span><strong>{theme.autoGradable}</strong>
                        </Link>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function practiceHref({
  language,
  mode,
  track,
  course,
  theme,
}: {
  language: ContentLanguage;
  mode: LearningMode;
  track: string;
  course: string;
  theme?: string;
}) {
  const params = new URLSearchParams({ language, mode, track, course });
  if (theme) params.set("theme", theme);
  return `/practice?${params.toString()}`;
}
