import Link from "next/link";
import problemsData from "../../data/problems.json";
import { Problem } from "../../../../packages/adaptive-engine";
import {
  buildPracticeHref,
  CONTENT_PROFILES,
  getLanguageProfile,
  LANGUAGE_PROFILES,
  type ContentLanguage,
  type ContentProfile
} from "../shared/curriculumTracks";

const problems = problemsData as Problem[];

export default function CurriculumPage({
  searchParams
}: {
  searchParams?: { language?: string };
}) {
  const activeLanguage = getLanguageProfile(searchParams?.language).id;
  const activeProfiles = CONTENT_PROFILES.filter((profile) => profile.language === activeLanguage);
  const subjectiveLaunch = activeLanguage === "zh" ? buildSubjectiveLaunchModel() : null;

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="masthead product-masthead">
          <div>
            <p className="eyebrow">Adaptive Math Learning</p>
            <h1 className="page-title">Choose Learning Language</h1>
            <p className="page-subtitle">
              Start from one language system, then enter its own course tracks and chapter structure. English and Chinese content stay visually separate while sharing the same adaptive model underneath.
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/">
              Student Home
            </Link>
            <Link className="button-secondary" href="/diagnostic">
              Diagnostic
            </Link>
            <Link className="button-secondary" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </header>

        <nav className="language-entry-tabs" aria-label="Learning language">
          {LANGUAGE_PROFILES.map((language) => (
            <Link
              className={`language-entry-tab ${activeLanguage === language.id ? "language-entry-tab-active" : ""}`}
              href={`/curriculum?language=${language.id}`}
              key={language.id}
            >
              <span>{language.eyebrow}</span>
              <strong>{language.title}</strong>
              <em>{language.description}</em>
            </Link>
          ))}
        </nav>

        <section className="panel full-panel curriculum-entry-panel">
          <div className="curriculum-entry-head">
            <div>
              <p className="eyebrow">{getLanguageProfile(activeLanguage).eyebrow}</p>
              <h2 className="panel-title">
                {activeLanguage === "zh" ? "选择中文课程体系" : "Choose an English Track"}
              </h2>
              <p className="muted">
                {activeLanguage === "zh"
                  ? "中文校内与中文奥数分开进入，Practice 页面只保留当前语言下的课程、主题和章节。"
                  : "English Core and AMC Competition are shown as separate tracks before entering Practice."}
              </p>
            </div>
          </div>

          <div className="curriculum-track-grid">
            {activeProfiles.map((profile) => (
              <TrackCard key={profile.id} profile={profile} />
            ))}
          </div>
        </section>

        {subjectiveLaunch && (
          <section className="panel full-panel subjective-launch-panel">
            <div className="curriculum-entry-head">
              <div>
                <p className="eyebrow">主观题入口</p>
                <h2 className="panel-title">章节测验与证明题专项</h2>
                <p className="muted">
                  从中文初高中章节直接进入需要书写过程的练习；提交后进入 Review 队列，再反写建模、推理、表达和证明闭合信号。
                </p>
              </div>
              <Link className="button-secondary" href={subjectiveLaunch.proofHref}>
                进入证明题专项
              </Link>
            </div>

            <div className="subjective-launch-grid subjective-launch-overview">
              <Link className="subjective-launch-card subjective-launch-card-proof" href={subjectiveLaunch.proofHref}>
                <div>
                  <p className="eyebrow">Proof Track</p>
                  <h3>证明题专项</h3>
                  <p>集中训练几何证明、代数证明与证明闭合，适合人工批改与错因反馈。</p>
                </div>
                <div className="track-card-stats">
                  <TrackStat label="Proof" value={String(subjectiveLaunch.proofCount)} />
                  <TrackStat label="Chapters" value={String(subjectiveLaunch.proofChapterCount)} />
                  <TrackStat label="Mode" value="proof" />
                </div>
              </Link>
            </div>

            <div className="subjective-grade-directory">
              {subjectiveLaunch.gradeGroups.map((group) => (
                <section className="subjective-grade-group" key={group.grade}>
                  <div className="subjective-grade-head">
                    <div>
                      <p className="eyebrow">{group.grade}</p>
                      <h3>{group.title}</h3>
                      <p>{group.chapterCount} 个章节 · {group.problemCount} 道主观题 · {group.proofCount} 道证明题</p>
                    </div>
                    <Link className="button-secondary" href={group.proofHref}>
                      本年级证明题
                    </Link>
                  </div>

                  <div className="subjective-chapter-directory">
                    {group.chapters.map((chapter) => (
                      <Link className="subjective-chapter-row" href={chapter.href} key={chapter.chapter}>
                        <div>
                          <span>{chapter.theme}</span>
                          <strong>{chapter.chapterTitle}</strong>
                          <small>{chapter.modeSummary}</small>
                        </div>
                        <div className="subjective-chapter-meta">
                          <em>{chapter.count} 题</em>
                          <em>{chapter.proofCount} 证明</em>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function TrackCard({ profile }: { profile: ContentProfile }) {
  const stats = getTrackStats(profile);

  return (
    <Link className="curriculum-track-card" href={buildPracticeHref(profile)}>
      <div className="track-card-main">
        <p className="eyebrow">{profile.language === "zh" ? "中文 Track" : "English Track"}</p>
        <h3>{profile.title}</h3>
        <p>{profile.description}</p>
      </div>
      <div className="track-card-stats">
        <TrackStat label="Problems" value={String(stats.total)} />
        <TrackStat label="Auto-check" value={String(stats.autoGradable)} />
        <TrackStat label="Courses" value={String(stats.courses)} />
      </div>
      <div className="track-card-footer">
        <span>{profile.subtitle}</span>
        <strong>{profile.language === "zh" ? "进入练习" : "Enter practice"}</strong>
      </div>
    </Link>
  );
}

function TrackStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function getTrackStats(profile: ContentProfile) {
  const trackProblems = problems.filter((problem) =>
    getProblemLanguage(problem) === profile.language &&
    getProblemCurriculumSystem(problem) === profile.curriculumSystem &&
    getProblemDisplayTrack(problem) === profile.displayTrack
  );

  return {
    total: trackProblems.length,
    autoGradable: trackProblems.filter((problem) => problem.isAutoGradable).length,
    courses: new Set(trackProblems.map((problem) => problem.curriculum.course)).size
  };
}

function buildSubjectiveLaunchModel() {
  const subjectiveProblems = problems
    .filter((problem) =>
      problem.locale?.language === "zh" &&
      problem.locale?.curriculumSystem === "CN" &&
      problem.locale?.displayTrack === "中文校内" &&
      (problem.curriculum.course === "CN Junior High Math" || problem.curriculum.course === "CN Senior High Math") &&
      problem.curriculum.sourceCollection === "subjective_samples_v0" &&
      problem.responseSchema
    )
    .sort((left, right) => left.curriculum.sequence - right.curriculum.sequence || left.id.localeCompare(right.id));
  const proofProblems = subjectiveProblems.filter((problem) => problem.responseSchema?.mode === "proof");
  const chapterMap = new Map<string, Problem[]>();

  subjectiveProblems.forEach((problem) => {
    chapterMap.set(problem.curriculum.chapter, [...(chapterMap.get(problem.curriculum.chapter) ?? []), problem]);
  });

  const chapters = [...chapterMap.entries()].map(([, chapterProblems]) => {
    const first = chapterProblems[0];
    const proofCount = chapterProblems.filter((problem) => problem.responseSchema?.mode === "proof").length;
    const modes = [...new Set(chapterProblems.map((problem) => problem.responseSchema?.mode ?? "manual"))];

    return {
      chapter: first.curriculum.chapter,
      chapterTitle: first.curriculum.chapterTitle,
      count: chapterProblems.length,
      grade: inferSubjectiveGrade(first),
      href: buildSubjectivePracticeHref({
        chapter: first.curriculum.chapter,
        course: first.curriculum.course,
        sessionTitle: `${first.curriculum.chapterTitle} · 主观题测验`,
        sessionGoal: "完成一个需要写过程的章节测验，提交后进入批改队列。"
      }),
      modeSummary: modes.map(formatModeLabel).join(" / "),
      proofCount,
      sequence: first.curriculum.sequence,
      theme: first.curriculum.theme
    };
  }).sort((left, right) => left.sequence - right.sequence || left.chapterTitle.localeCompare(right.chapterTitle));

  const gradeGroups = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((grade) => {
    const gradeChapters = chapters.filter((chapter) => chapter.grade === grade);
    const gradeProblems = subjectiveProblems.filter((problem) => inferSubjectiveGrade(problem) === grade);
    const gradeProofCount = gradeProblems.filter((problem) => problem.responseSchema?.mode === "proof").length;

    return {
      chapterCount: gradeChapters.length,
      chapters: gradeChapters,
      grade,
      problemCount: gradeProblems.length,
      proofCount: gradeProofCount,
      proofHref: buildSubjectivePracticeHref({
        course: gradeProblems[0]?.curriculum.course ?? "CN Junior High Math",
        responseMode: "proof",
        sessionTitle: `${formatGradeTitle(grade)}证明题专项`,
        sessionGoal: `集中训练${formatGradeTitle(grade)}证明结构、推理链和证明闭合。`,
        minSequence: gradeChapters[0]?.sequence,
        maxSequence: gradeChapters[gradeChapters.length - 1]?.sequence
      }),
      title: formatGradeTitle(grade)
    };
  }).filter((group) => group.chapters.length > 0);

  return {
    proofCount: proofProblems.length,
    proofChapterCount: new Set(proofProblems.map((problem) => problem.curriculum.chapter)).size,
    proofHref: buildSubjectivePracticeHref({
      responseMode: "proof",
      sessionTitle: "中文证明题专项",
      sessionGoal: "集中训练证明结构、推理链和证明闭合。"
    }),
    chapters,
    gradeGroups
  };
}

function buildSubjectivePracticeHref(options: {
  chapter?: string;
  course?: string;
  maxSequence?: number;
  minSequence?: number;
  responseMode?: string;
  sessionGoal: string;
  sessionTitle: string;
}) {
  const params = new URLSearchParams({
    autoGradableOnly: "false",
    curriculumSystem: "CN",
    language: "zh",
    layerStrategy: "balanced",
    maxItems: "8",
    sessionSource: "subjective-launch",
    sessionGoal: options.sessionGoal,
    sessionTitle: options.sessionTitle,
    track: "中文校内"
  });

  if (options.course) params.set("course", options.course);
  if (options.chapter) params.set("chapter", options.chapter);
  if (options.minSequence) params.set("minSequence", String(options.minSequence));
  if (options.maxSequence) params.set("maxSequence", String(options.maxSequence));
  if (options.responseMode) params.set("responseMode", options.responseMode);

  return `/practice?${params.toString()}`;
}

function inferSubjectiveGrade(problem: Problem) {
  const text = `${problem.curriculum.chapterTitle} ${problem.curriculum.theme} ${problem.curriculum.chapter}`;

  if (/七年级|g7|grade7|junior-linear|junior-similarity/.test(text)) return "Grade 7";
  if (/八年级|g8|grade8/.test(text)) return "Grade 8";
  if (/九年级|g9|grade9/.test(text)) return "Grade 9";
  if (/高一|g10|grade10/.test(text)) return "Grade 10";
  if (/高二|g11|grade11/.test(text)) return "Grade 11";
  if (/高三|g12|grade12/.test(text)) return "Grade 12";
  return "Grade 7";
}

function formatGradeTitle(grade: string) {
  if (grade === "Grade 7") return "七年级";
  if (grade === "Grade 8") return "八年级";
  if (grade === "Grade 9") return "九年级";
  if (grade === "Grade 10") return "高一";
  if (grade === "Grade 11") return "高二";
  if (grade === "Grade 12") return "高三";
  return grade;
}

function formatModeLabel(mode: string) {
  if (mode === "proof") return "证明";
  if (mode === "application") return "应用";
  if (mode === "constructed_response") return "解答";
  return mode;
}

function getProblemCurriculumSystem(problem: Problem) {
  return problem.locale?.curriculumSystem ?? inferCurriculumSystem(problem);
}

function getProblemLanguage(problem: Problem): ContentLanguage {
  return problem.locale?.language === "zh" ? "zh" : "en";
}

function getProblemDisplayTrack(problem: Problem) {
  return problem.locale?.displayTrack ?? inferDisplayTrack(problem);
}

function inferCurriculumSystem(problem: Problem) {
  if (problem.curriculum.course.startsWith("AMC")) return "AMC";
  return "US";
}

function inferDisplayTrack(problem: Problem) {
  if (problem.curriculum.course.startsWith("AMC")) return "AMC Competition";
  return "US Core";
}
