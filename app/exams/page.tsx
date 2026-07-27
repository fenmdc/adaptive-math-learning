import Link from "next/link";

import { MOCK_EXAMS, createMockExamPaper } from "@/packages/mock-exam";
import AppShell from "../ui/AppShell";

export default function ExamsPage() {
  const exams = MOCK_EXAMS.map((config) => ({ config, available: createMockExamPaper(config).problems.length }));

  return (
    <AppShell activeRoute="/exams">
      <div className="exams-page">
        <header className="page-header exams-header">
          <div><p className="page-context">Timed mock exams</p><h1>Practise the format, pace, and full test.</h1><p className="page-intro">Mock exams use independent timers and answer sheets. They do not change your adaptive practice session until you submit.</p></div>
        </header>
        <section className="exam-card-grid" aria-label="Available mock exams">
          {exams.map(({ config, available }) => (
            <article className="exam-card" key={config.id}>
              <div><span>{config.shortTitle}</span><h2>{config.title}</h2><p>{config.format}</p></div>
              <dl><div><dt>Questions</dt><dd>{config.questionCount}</dd></div><div><dt>Time</dt><dd>{config.timeMinutes} min</dd></div><div><dt>Available</dt><dd>{available}/{config.questionCount}</dd></div></dl>
              <div className="exam-modules">{config.modules.map((module) => <span key={module.title}>{module.title} · {module.questionCount} questions · {module.timeMinutes} min</span>)}</div>
              <Link className="primary-button" href={`/exams/${config.id}`}>{available === config.questionCount ? "Start mock exam" : "Preview pilot"}</Link>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
