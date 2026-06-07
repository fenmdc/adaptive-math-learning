import Link from "next/link";
import type { LearningPlan } from "../../shared/learningPlan";
import type { SessionSummary } from "../summary";

export default function SessionSummaryPanel({
  learningPlan,
  summary
}: {
  learningPlan?: LearningPlan;
  summary: SessionSummary;
}) {
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

      {learningPlan && (
        <div className="learning-plan-card learning-plan-inline">
          <div>
            <div className="tag-row">
              {learningPlan.course && <span className="tag">{learningPlan.course}</span>}
              {learningPlan.chapterTitle && <span className="tag tag-teal">{learningPlan.chapterTitle}</span>}
              {learningPlan.targetMastery !== undefined && (
                <span className="tag tag-gold">{Math.round(learningPlan.targetMastery * 100)}% mastery</span>
              )}
            </div>
            <h3>{learningPlan.title}</h3>
            <p>{learningPlan.reason}</p>
          </div>
          <Link className="button" href={learningPlan.href}>
            Start recommended practice
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
