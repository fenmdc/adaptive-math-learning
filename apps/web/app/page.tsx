import Link from "next/link";
import problemsData from "../data/problems.json";
import { Problem } from "../../../packages/adaptive-engine";
import HomeLearningPlan from "./HomeLearningPlan";

const problems = problemsData as Problem[];

type CourseSummary = {
  course: string;
  total: number;
  autoGradable: number;
  themes: string[];
  chapters: Array<{
    chapter: string;
    chapterTitle: string;
    theme: string;
    count: number;
    autoGradable: number;
    sequence: number;
    difficulty: string;
  }>;
};

export default function HomePage() {
  const courses = buildCourseSummaries(problems);
  const totalAutoGradable = problems.filter((problem) => problem.isAutoGradable).length;
  const totalConcepts = new Set(problems.flatMap((problem) => problem.concepts)).size;

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="masthead product-masthead">
          <div>
            <p className="eyebrow">Adaptive Math Learning</p>
            <h1 className="page-title">Student Home</h1>
            <p className="page-subtitle">
              Continue the next useful math task, review recent progress, and open a focused practice session from one place.
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/login">
              Login
            </Link>
            <Link className="button" href="/diagnostic">
              Diagnostic
            </Link>
            <Link className="button-secondary" href="/practice">
              Practice
            </Link>
            <Link className="button-secondary" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Problems" value={String(problems.length)} />
          <Metric label="Auto-Gradable" value={String(totalAutoGradable)} />
          <Metric label="Concepts" value={String(totalConcepts)} />
        </section>

        <HomeLearningPlan />

        <section className="product-action-grid">
          <ProductAction
            action="Begin"
            description="Run a short placement check when the system needs a fresh baseline."
            href="/diagnostic"
            title="Diagnostic Check"
          />
          <ProductAction
            action="Continue"
            description="Open the adaptive practice surface with filters, answer checks, and explanations."
            href="/practice"
            title="Adaptive Practice"
          />
          <ProductAction
            action="Review"
            description="Inspect mastery, readiness, review queue, and explanation quality."
            href="/dashboard"
            title="Learning Report"
          />
        </section>

        <section className="course-list">
          {courses.map((course) => (
            <article className="panel course-section" key={course.course}>
              <div className="course-head">
                <div>
                  <p className="eyebrow">Course Track</p>
                  <h2 className="panel-title">{course.course}</h2>
                  <p className="muted">
                    {course.total} problems · {course.autoGradable} auto-gradable · {course.themes.length} themes
                  </p>
                </div>
                <Link
                  className="button-secondary"
                  href={`/practice?course=${encodeURIComponent(course.course)}`}
                >
                  Practice Course
                </Link>
              </div>

              <div className="chapter-grid">
                {course.chapters.map((chapter) => (
                  <Link
                    className="chapter-card"
                    href={`/practice?course=${encodeURIComponent(course.course)}&theme=${encodeURIComponent(chapter.theme)}&chapter=${encodeURIComponent(chapter.chapter)}`}
                    key={chapter.chapter}
                  >
                    <div className="tag-row">
                      <span className="tag tag-teal">{chapter.theme}</span>
                      <span className="tag tag-gold">{chapter.difficulty}</span>
                    </div>
                    <h3>{chapter.chapterTitle}</h3>
                    <div className="chapter-card-meta">
                      <span>{chapter.count} problems</span>
                      <span>{chapter.autoGradable} auto-check</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function buildCourseSummaries(items: Problem[]): CourseSummary[] {
  const grouped = new Map<string, Problem[]>();

  items.forEach((problem) => {
    const course = problem.curriculum.course;
    grouped.set(course, [...(grouped.get(course) ?? []), problem]);
  });

  return [...grouped.entries()]
    .map(([course, courseProblems]) => {
      const chapters = new Map<string, Problem[]>();

      courseProblems.forEach((problem) => {
        chapters.set(problem.curriculum.chapter, [
          ...(chapters.get(problem.curriculum.chapter) ?? []),
          problem
        ]);
      });

      return {
        course,
        total: courseProblems.length,
        autoGradable: courseProblems.filter((problem) => problem.isAutoGradable).length,
        themes: unique(courseProblems.map((problem) => problem.curriculum.theme)),
        chapters: [...chapters.entries()]
          .map(([, chapterProblems]) => {
            const first = chapterProblems[0];
            const difficulties = chapterProblems.map((problem) => problem.difficulty);
            const min = Math.min(...difficulties);
            const max = Math.max(...difficulties);

            return {
              chapter: first.curriculum.chapter,
              chapterTitle: first.curriculum.chapterTitle,
              theme: first.curriculum.theme,
              count: chapterProblems.length,
              autoGradable: chapterProblems.filter((problem) => problem.isAutoGradable).length,
              sequence: first.curriculum.sequence,
              difficulty: min === max ? `Level ${min}` : `Levels ${min}-${max}`
            };
          })
          .sort((a, b) => a.sequence - b.sequence || a.chapterTitle.localeCompare(b.chapterTitle))
      };
    })
    .sort((a, b) => courseOrder(a.course) - courseOrder(b.course));
}

function courseOrder(course: string) {
  if (course === "Pre-Algebra") return 1;
  if (course === "AMC8") return 2;
  if (course === "Algebra 1") return 3;
  return 99;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function ProductAction({
  action,
  description,
  href,
  title
}: {
  action: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <Link className="product-action" href={href}>
      <span>{action}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
