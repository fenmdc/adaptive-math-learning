import Link from "next/link";
import problemsData from "../../../data/problems.json";
import type { Problem } from "../../../../../packages/adaptive-engine";
import { buildReviewQueue } from "../../shared/reviewQueue";
import type { StudentModel } from "../../shared/studentModel";
import { summarizeStudentModel } from "../../shared/studentModel";

const problems = problemsData as Problem[];

export default function StudentModelPanel({ model }: { model: StudentModel | null }) {
  const summary = summarizeStudentModel(model);
  const reviewQueue = buildReviewQueue(model, problems);

  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Student Model</p>
          <h2 className="panel-title">Current learner state</h2>
        </div>
        <div className="summary-score">
          {model ? Math.round(model.difficultyComfort * 10) / 10 : "-"}
        </div>
      </div>

      <p className="summary-recommendation">
        {model
          ? `Difficulty comfort is around level ${model.difficultyComfort.toFixed(1)} with ${Math.round(
              model.overallAccuracy * 100
            )}% overall accuracy, ${formatSeconds(model.averageResponseTimeSeconds)} average response time, and ${formatConfidence(
              model.averageConfidence
            )} average confidence.`
          : "Complete a diagnostic or practice session to initialize the student model."}
      </p>

      <div className="learning-plan-card learning-plan-inline">
        <div>
          <div className="tag-row">
            <span className="tag tag-teal">{reviewQueue.problemCount} review problems</span>
            {reviewQueue.dueConcepts.slice(0, 3).map((concept) => (
              <span className="tag" key={concept}>{concept}</span>
            ))}
          </div>
          <h3>Review Queue</h3>
          <p>{reviewQueue.reason}</p>
        </div>
        <Link className={reviewQueue.problemCount > 0 ? "button" : "button-secondary"} href={reviewQueue.href}>
          {reviewQueue.problemCount > 0 ? "Start review" : "Continue practice"}
        </Link>
      </div>

      <div className="student-model-grid">
        <ModelList
          emptyText="No focus concepts yet."
          items={summary.focusConcepts.map((state) => ({
            label: state.concept,
            detail: `${Math.round(state.mastery * 100)}% mastery · ${Math.round(state.stability * 100)}% stability`
          }))}
          title="Focus"
        />
        <ModelList
          emptyText="Secure concepts will appear with stable correct practice."
          items={summary.secureConcepts.map((state) => ({
            label: state.concept,
            detail: `${Math.round(state.mastery * 100)}% mastery · ${state.attempts} attempt(s)`
          }))}
          title="Secure"
        />
        <ModelList
          emptyText="No review due yet."
          items={summary.reviewDueConcepts.map((state) => ({
            label: state.concept,
            detail: `Review due ${new Date(state.reviewDueAt).toLocaleDateString()}`
          }))}
          title="Review Due"
        />
        <ModelList
          emptyText="No low-confidence signals yet."
          items={summary.lowConfidenceConcepts.map((state) => ({
            label: state.concept,
            detail: `${formatConfidence(state.averageConfidence)} confidence · ${formatSeconds(
              state.averageResponseTimeSeconds
            )} avg response`
          }))}
          title="Low Confidence"
        />
        <ModelList
          emptyText="No recurring misconception signals yet."
          items={summary.topMisconceptions.map((item) => ({
            label: item.misconception,
            detail: `${item.count} signal(s)`
          }))}
          title="Misconceptions"
        />
      </div>
    </section>
  );
}

function formatSeconds(value: number | undefined) {
  if (!value) return "-";
  return `${Math.round(value)}s`;
}

function formatConfidence(value: number | undefined) {
  if (!value) return "-";
  return `${Math.round(value * 10) / 10}/5`;
}

function ModelList({
  emptyText,
  items,
  title
}: {
  emptyText: string;
  items: Array<{ label: string; detail: string }>;
  title: string;
}) {
  return (
    <div>
      <h3 className="summary-list-title">{title}</h3>
      <div className="summary-list">
        {items.length === 0 && <p className="muted">{emptyText}</p>}
        {items.map((item) => (
          <div className="summary-item" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <div className="muted">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
