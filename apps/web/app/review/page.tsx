"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import problemsData from "../../data/problems.json";
import type { Problem } from "../../../../packages/adaptive-engine";
import { buildLearningPlan } from "../shared/learningPlan";
import MathText from "../shared/MathText";
import {
  createPracticeLog,
  readPracticeLogs,
  readStudentModel,
  readSubjectiveReviewQueue,
  writeLearningPlan,
  writePracticeLogs,
  writeStudentModel,
  writeSubjectiveReviewQueue,
  type SubjectiveReviewItem
} from "../shared/storage";
import {
  updateStudentModelFromSubjectiveReview,
  type SubjectiveRubricSignal
} from "../shared/studentModel";

const problems = problemsData as Problem[];

export default function SubjectiveReviewPage() {
  const [items, setItems] = useState<SubjectiveReviewItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const queue = readSubjectiveReviewQueue();
    setItems(queue);
    setActiveId(queue[0]?.id ?? "");
  }, []);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0],
    [activeId, items]
  );
  const pendingCount = items.filter((item) => item.status !== "reviewed").length;

  function updateQueue(nextItems: SubjectiveReviewItem[]) {
    setItems(nextItems);
    writeSubjectiveReviewQueue(nextItems);
  }

  function markReviewed(input: { feedback: string; item: SubjectiveReviewItem; rubricScores: SubjectiveRubricSignal[] }) {
    const problem = problems.find((candidate) => candidate.id === input.item.problem);
    const reviewedAt = new Date().toISOString();
    const score = input.rubricScores.reduce((sum, row) => sum + row.score, 0);
    const maxScore = input.rubricScores.reduce((sum, row) => sum + row.maxScore, 0) || 1;
    const alreadyApplied = Boolean(input.item.review?.appliedToStudentModelAt);
    const modelImpact = problem && !alreadyApplied
      ? updateStudentModelFromSubjectiveReview(readStudentModel(), {
          feedback: input.feedback,
          problem,
          reviewedAt,
          rubricScores: input.rubricScores
        })
      : null;

    if (modelImpact && problem) {
      writeStudentModel(modelImpact.model);
      const nextLogs = [
        ...readPracticeLogs(),
        createPracticeLog({
          confidence: undefined,
          correct: modelImpact.impact.correct,
          fluencyConcepts: [],
          mastery: Object.fromEntries(
            problem.concepts.map((concept) => [concept, modelImpact.model.conceptStates[concept]?.mastery ?? 0.5])
          ),
          nextProblem: problem,
          problem,
          recommendationReason: modelImpact.impact.recommendation,
          recommendationScore: Math.round(modelImpact.impact.normalizedScore * 100),
          remediation: !modelImpact.impact.correct,
          responseTimeSeconds: undefined,
          step: readPracticeLogs().length,
          weakConcepts: problem.concepts.filter((concept) => (modelImpact.model.conceptStates[concept]?.mastery ?? 0.5) < 0.62),
          workSubmission: input.item.workSubmission
        })
      ];

      writePracticeLogs(nextLogs);
      writeLearningPlan(buildLearningPlan(nextLogs, problems, modelImpact.model));
    }

    const nextItems = items.map((item) =>
      item.id === input.item.id
        ? {
            ...item,
            review: {
              abilitySignals: modelImpact?.impact.abilitySignals ?? item.review?.abilitySignals,
              appliedToStudentModelAt: modelImpact?.impact.reviewedAt ?? item.review?.appliedToStudentModelAt,
              feedback: input.feedback,
              modelRecommendation: modelImpact?.impact.recommendation ?? item.review?.modelRecommendation,
              reviewedAt,
              rubricScores: input.rubricScores,
              score,
              scorePercent: Math.round((score / maxScore) * 100)
            },
            status: "reviewed" as const
          }
        : item
    );

    updateQueue(nextItems);
  }

  function removeItem(itemId: string) {
    const nextItems = items.filter((item) => item.id !== itemId);
    updateQueue(nextItems);
    if (activeId === itemId) setActiveId(nextItems[0]?.id ?? "");
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="masthead">
          <div>
            <p className="eyebrow">Adaptive Math Learning</p>
            <h1 className="page-title">Subjective Review Queue</h1>
            <p className="page-subtitle">
              Review handwritten, uploaded, and constructed-response work before it updates the broader learning record.
            </p>
          </div>
          <div className="nav-actions">
            <Link className="button-secondary" href="/dashboard">Dashboard</Link>
            <Link className="button-secondary" href="/practice">Practice</Link>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Submissions" value={String(items.length)} />
          <Metric label="Pending" value={String(pendingCount)} />
          <Metric label="Reviewed" value={String(items.length - pendingCount)} />
        </section>

        {items.length === 0 ? (
          <section className="panel">
            <p className="eyebrow">Queue Empty</p>
            <h2 className="panel-title">No subjective work is waiting for review.</h2>
            <p className="muted">
              Submit written work, handwriting, or an uploaded solution from Practice to create a review item.
            </p>
          </section>
        ) : (
          <section className="content-grid review-queue-layout">
            <aside className="panel review-list-panel">
              <h2 className="panel-title compact-title">Submissions</h2>
              <div className="review-list">
                {items.map((item) => (
                  <button
                    className={`review-list-item ${activeItem?.id === item.id ? "review-list-item-active" : ""}`}
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    type="button"
                  >
                    <span>{item.status}</span>
                    <strong>{item.problem}</strong>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            </aside>

            {activeItem && (
              <ReviewDetail
                item={activeItem}
                onRemove={() => removeItem(activeItem.id)}
                onReviewed={(rubricScores, feedback) => markReviewed({ feedback, item: activeItem, rubricScores })}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ReviewDetail({
  item,
  onRemove,
  onReviewed
}: {
  item: SubjectiveReviewItem;
  onRemove: () => void;
  onReviewed: (rubricScores: SubjectiveRubricSignal[], feedback: string) => void;
}) {
  const [rubricScores, setRubricScores] = useState<SubjectiveRubricSignal[]>(() => initialRubricScores(item));
  const [feedback, setFeedback] = useState(item.review?.feedback ?? "");
  const maxScore = item.responseSchema?.rubric.reduce((sum, row) => sum + row.maxScore, 0) ?? 8;
  const score = rubricScores.reduce((sum, row) => sum + row.score, 0);
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const abilityPreview = useMemo(() => buildRubricAbilityPreview(rubricScores), [rubricScores]);

  useEffect(() => {
    setRubricScores(initialRubricScores(item));
    setFeedback(item.review?.feedback ?? "");
  }, [item.id, item.review?.feedback, item.review?.rubricScores, item.review?.score]);

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReviewed(rubricScores, feedback.trim() || defaultReviewerFeedback(rubricScores));
  }

  function updateRubricScore(rowId: string, value: number) {
    setRubricScores((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              score: Math.max(0, Math.min(row.maxScore, Number.isFinite(value) ? value : 0))
            }
          : row
      )
    );
  }

  return (
    <section className="panel review-detail-panel">
      <div className="tag-row">
        <span className="tag">{item.status}</span>
        <span className="tag tag-gold">{item.responseSchema?.mode ?? "constructed_response"}</span>
        {item.taxonomy?.layer && <span className="tag">{item.taxonomy.layer}</span>}
      </div>

      <h2 className="panel-title"><MathText text={item.problemStatement} /></h2>
      <div className="schema-note">
        <strong>Submitted answer:</strong> <MathText text={item.submittedAnswer || "No final answer typed."} />
      </div>
      <div className="schema-note">
        <strong>Concepts:</strong> {item.concepts.join(", ")}
      </div>

      <div className="subjective-work-card">
        <h3>Student Work</h3>
        {item.workSubmission.writtenWork ? (
          <p><MathText text={item.workSubmission.writtenWork} /></p>
        ) : (
          <p className="muted">No typed work submitted.</p>
        )}
        {item.workSubmission.drawingDataUrl && (
          <img alt="Handwritten solution" className="subjective-work-image" src={item.workSubmission.drawingDataUrl} />
        )}
        {item.workSubmission.uploadedFileName && (
          <div className="schema-note">
            <strong>Uploaded:</strong> {item.workSubmission.uploadedFileName} · {item.workSubmission.uploadedFileType}
          </div>
        )}
      </div>

      <div className="subjective-rubric">
        <h3>Rubric</h3>
        {rubricScores.map((row) => {
          const source = item.responseSchema?.rubric.find((rubricRow) => rubricRow.id === row.id);

          return (
          <div className="subjective-rubric-row" key={row.id}>
            <strong>{row.label}</strong>
            <span>{row.score}/{row.maxScore} pt(s)</span>
            <p>{source?.description ?? "Reviewer score for this criterion."}</p>
            <input
              className="rubric-score-input"
              max={row.maxScore}
              min={0}
              onChange={(event) => updateRubricScore(row.id, Number(event.target.value))}
              step="0.5"
              type="number"
              value={row.score}
            />
          </div>
          );
        })}
      </div>

      <div className="subjective-signal-preview">
        <h3>Rubric Signals</h3>
        <div className="subjective-signal-grid">
          {abilityPreview.map((signal) => (
            <div className="subjective-signal-card" key={signal.id}>
              <span>{signal.label}</span>
              <strong>{signal.percent}%</strong>
              <small>{signal.note}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="schema-note">
        <strong>AI assist:</strong> {item.aiSuggestion?.feedback ?? "Not requested yet."}
      </div>
      {item.review?.appliedToStudentModelAt && (
        <div className="schema-note">
          <strong>Model update:</strong> Applied {new Date(item.review.appliedToStudentModelAt).toLocaleString()}
          {item.review.modelRecommendation ? ` · ${item.review.modelRecommendation}` : ""}
        </div>
      )}

      <form className="review-form" onSubmit={submitReview}>
        <div className="schema-note">
          <strong>Total score:</strong> {score}/{maxScore} · {scorePercent}%
        </div>
        <label className="field-label" htmlFor="review-feedback">
          Reviewer feedback
          <textarea
            className="work-textarea"
            id="review-feedback"
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Name the valid steps, the first gap, and the next repair move."
            value={feedback}
          />
        </label>
        <div className="learning-plan-actions">
          <button className="button" type="submit">Save review</button>
          <button className="button-secondary" onClick={onRemove} type="button">Remove item</button>
        </div>
      </form>
    </section>
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

function initialRubricScores(item: SubjectiveReviewItem): SubjectiveRubricSignal[] {
  if (item.review?.rubricScores?.length) return item.review.rubricScores;

  const rubric = item.responseSchema?.rubric ?? [
    {
      id: "overall",
      label: "Overall",
      maxScore: 8
    }
  ];

  return rubric.map((row) => ({
    id: row.id,
    label: row.label,
    maxScore: row.maxScore,
    score: 0
  }));
}

function defaultReviewerFeedback(rubricScores: SubjectiveRubricSignal[]) {
  const maxScore = rubricScores.reduce((sum, row) => sum + row.maxScore, 0) || 1;
  const score = rubricScores.reduce((sum, row) => sum + row.score, 0);
  const weakest = [...rubricScores].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)[0];

  return `Reviewed at ${Math.round((score / maxScore) * 100)}%. Next focus: ${weakest?.label ?? "the first incomplete step"}.`;
}

function buildRubricAbilityPreview(rubricScores: SubjectiveRubricSignal[]) {
  const grouped = new Map<string, number[]>();

  rubricScores.forEach((row) => {
    const key = rubricSignalKey(row);
    const ratio = row.maxScore > 0 ? row.score / row.maxScore : 0;
    grouped.set(key, [...(grouped.get(key) ?? []), Math.max(0, Math.min(1, ratio))]);
  });

  return [
    {
      id: "modeling",
      label: "Modeling / 建模",
      note: "Variables, quantities, diagrams, or equation setup"
    },
    {
      id: "reasoning",
      label: "Reasoning / 推理",
      note: "Connected mathematical steps and valid transformations"
    },
    {
      id: "communication",
      label: "Communication / 表达",
      note: "Readable explanation, units, and final answer clarity"
    },
    {
      id: "proofClosure",
      label: "Proof Closure / 证明闭合",
      note: "Proof reaches the requested claim without circular logic"
    }
  ]
    .filter((signal) => grouped.has(signal.id))
    .map((signal) => ({
      ...signal,
      percent: Math.round(average(grouped.get(signal.id) ?? [0]) * 100)
    }));
}

function rubricSignalKey(row: SubjectiveRubricSignal) {
  const text = `${row.id} ${row.label ?? ""}`.toLowerCase();

  if (/proof_closure|closure|closed|target|goal|证明闭合|闭合|目标/.test(text)) return "proofClosure";
  if (/model|setup|quantity|variable|representation|建模|模型|变量|数量关系/.test(text)) return "modeling";
  if (/communication|explain|expression|clarity|conclusion|answer|表达|说明|书写|结论|答案/.test(text)) return "communication";
  return "reasoning";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
