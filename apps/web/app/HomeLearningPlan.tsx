"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import problemsData from "../data/problems.json";
import type { Problem } from "../../../packages/adaptive-engine";
import type { LearningPlan } from "./shared/learningPlan";
import { buildReviewQueue, ReviewQueue } from "./shared/reviewQueue";
import { readLearningPlan, readStudentModel } from "./shared/storage";

const problems = problemsData as Problem[];

export default function HomeLearningPlan() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueue | null>(null);

  useEffect(() => {
    setPlan(readLearningPlan());
    setReviewQueue(buildReviewQueue(readStudentModel(), problems));
  }, []);

  if (!plan) {
    return (
      <section className="panel full-panel learning-plan-card">
        <div>
          <p className="eyebrow">Recommended Next Step</p>
          <h2 className="panel-title">Run the diagnostic first</h2>
          <p className="muted">
            The system will turn your diagnostic result into a focused practice range.
          </p>
        </div>
        <Link className="button" href="/diagnostic">
          Start Diagnostic
        </Link>
      </section>
    );
  }

  return (
    <section className="panel full-panel learning-plan-card">
      <div>
        <p className="eyebrow">Recommended Next Step</p>
        <div className="tag-row">
          {plan.course && <span className="tag">{plan.course}</span>}
          {plan.chapterTitle && <span className="tag tag-teal">{plan.chapterTitle}</span>}
          {plan.targetMastery !== undefined && (
            <span className="tag tag-gold">{Math.round(plan.targetMastery * 100)}% mastery</span>
          )}
        </div>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="muted">{plan.reason}</p>
        {plan.supportingConcepts.length > 0 && (
          <p className="muted">Also watch: {plan.supportingConcepts.join(", ")}</p>
        )}
      </div>
      <Link className="button" href={plan.href}>
        Start Recommended Practice
      </Link>
      {reviewQueue && reviewQueue.problemCount > 0 && (
        <Link className="button-secondary" href={reviewQueue.href}>
          Review Due ({reviewQueue.problemCount})
        </Link>
      )}
    </section>
  );
}
