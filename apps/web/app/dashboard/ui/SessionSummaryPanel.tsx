import Link from "next/link";
import type { AssessmentReport } from "../../shared/assessmentReport";
import type { LearningPlan } from "../../shared/learningPlan";
import type { SessionSummary } from "../summary";

export default function SessionSummaryPanel({
  assessmentReport,
  learningPlan,
  summary
}: {
  assessmentReport?: AssessmentReport;
  learningPlan?: LearningPlan;
  summary: SessionSummary;
}) {
  const planHref = assessmentReport?.practiceHref ?? learningPlan?.href;
  const planTitle = assessmentReport?.recommendationTitle ?? learningPlan?.title;
  const planReason = assessmentReport?.recommendationReason ?? learningPlan?.reason;

  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Session Summary</p>
          <h2 className="panel-title">What to do next</h2>
        </div>
        <div className="summary-score">{summary.accuracy}%</div>
      </div>

      <p className="summary-recommendation">{summary.nextRecommendation}</p>
      <div className="tag-row">
        <span className="tag">{formatSeconds(summary.averageResponseTimeSeconds)} avg response</span>
        <span className="tag tag-teal">{formatConfidence(summary.averageConfidence)} confidence</span>
      </div>

      {(learningPlan || assessmentReport) && planHref && (
        <div className="learning-plan-card learning-plan-inline">
          <div>
            <div className="tag-row">
              {learningPlan.course && <span className="tag">{learningPlan.course}</span>}
              {learningPlan.chapterTitle && <span className="tag tag-teal">{learningPlan.chapterTitle}</span>}
              {learningPlan.targetMastery !== undefined && (
                <span className="tag tag-gold">{Math.round(learningPlan.targetMastery * 100)}% mastery</span>
              )}
              {assessmentReport?.targetConcepts.slice(0, 3).map((concept) => (
                <span className="tag tag-teal" key={concept}>{concept}</span>
              ))}
            </div>
            <h3>{planTitle}</h3>
            <p>{planReason}</p>
            {learningPlan?.steps && learningPlan.steps.length > 0 && (
              <div className="plan-step-row">
                {learningPlan.steps.map((step) => (
                  <Link className="plan-step-pill" href={step.href} key={step.id}>
                    <span>{step.priority}</span>
                    <strong>{step.title}</strong>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link className="button" href={planHref}>
            Start recommended mini session
          </Link>
        </div>
      )}

      <div className="summary-grid">
        <SummaryList
          emptyText="No weak concepts detected yet."
          items={summary.weakConcepts}
          title="Focus concepts"
          tone="focus"
        />
        <SummaryList
          emptyText="Strong concepts will appear after a few correct attempts."
          items={summary.strongConcepts}
          title="Secure concepts"
          tone="secure"
        />
      </div>
    </section>
  );
}

function formatSeconds(value: number) {
  return value ? `${Math.round(value)}s` : "-";
}

function formatConfidence(value: number) {
  return value ? `${Math.round(value * 10) / 10}/5` : "-";
}

function SummaryList({
  emptyText,
  items,
  title,
  tone
}: {
  emptyText: string;
  items: SessionSummary["weakConcepts"];
  title: string;
  tone: "focus" | "secure";
}) {
  return (
    <div>
      <h3 className="summary-list-title">{title}</h3>
      <div className="summary-list">
        {items.length === 0 && <p className="muted">{emptyText}</p>}
        {items.map((item) => (
          <div className={`summary-item summary-item-${tone}`} key={item.concept}>
            <div>
              <strong>{item.concept}</strong>
              <div className="muted">
                Weak signals: {item.weakCount}
              </div>
            </div>
            <div className="summary-percent">{Math.round(item.score * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
