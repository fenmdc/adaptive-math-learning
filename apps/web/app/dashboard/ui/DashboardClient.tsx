"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import problemsData from "../../../data/problems.json";
import type { Problem } from "../../../../../packages/adaptive-engine";
import { buildLearningPlan, LearningPlan } from "../../shared/learningPlan";
import type { StudentModel } from "../../shared/studentModel";
import { readDiagnosticLogs, readLearningPlan, readPracticeLogs, readStudentModel, writeLearningPlan } from "../../shared/storage";
import { summarizeDomainProfile, summarizeSession } from "../summary";
import type { SimulationLog } from "../types";
import ConceptHeatmap from "./ConceptHeatmap";
import DomainProfilePanel from "./DomainProfilePanel";
import MasteryChart from "./MasteryChart";
import SessionSummaryPanel from "./SessionSummaryPanel";
import StudentModelPanel from "./StudentModelPanel";
import TrajectoryView from "./TrajectoryView";

export default function DashboardClient({ fallbackLogs }: { fallbackLogs: SimulationLog[] }) {
  const [practiceLogs, setPracticeLogs] = useState<SimulationLog[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<SimulationLog[]>([]);
  const [storedLearningPlan, setStoredLearningPlan] = useState<LearningPlan | null>(null);
  const [studentModel, setStudentModel] = useState<StudentModel | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPracticeLogs(readPracticeLogs());
    setDiagnosticLogs(readDiagnosticLogs());
    setStoredLearningPlan(readLearningPlan());
    setStudentModel(readStudentModel());
    setHydrated(true);
  }, []);

  const userLogs = [...diagnosticLogs, ...practiceLogs];
  const logs = userLogs.length > 0 ? userLogs : fallbackLogs;
  const summary = summarizeSession(logs);
  const hasUserLogs = diagnosticLogs.length > 0 || practiceLogs.length > 0;
  const generatedLearningPlan = hasUserLogs && logs.length > 0 ? buildLearningPlan(logs, problemsData as Problem[], studentModel) : null;
  const learningPlan = generatedLearningPlan ?? storedLearningPlan;
  const domainProfiles = summarizeDomainProfile(logs);
  const source =
    diagnosticLogs.length > 0 && practiceLogs.length > 0
      ? "Diagnostic + practice sessions"
      : diagnosticLogs.length > 0
        ? "Diagnostic session"
        : practiceLogs.length > 0
          ? "Practice session"
          : "Simulation fallback";
  const accuracy =
    logs.length === 0
      ? 0
      : Math.round((logs.filter((l) => l.correct).length / logs.length) * 100);

  useEffect(() => {
    if (generatedLearningPlan) {
      writeLearningPlan(generatedLearningPlan);
    }
  }, [generatedLearningPlan]);

  return (
    <main className="app-shell">
      <div className="app-container">
      <header className="masthead">
        <div>
          <p className="eyebrow">Adaptive Math Learning</p>
          <h1 className="page-title">Learning Dashboard</h1>
          <p className="page-subtitle">
            Review mastery, remediation, and the student trajectory from the current session.
          </p>
          <div className="muted">
            Source: {hydrated ? source : "Loading session data"}
          </div>
        </div>
        <div className="nav-actions">
          <Link className="button-secondary" href="/diagnostic">Diagnostic</Link>
          <Link className="button-secondary" href="/practice">Practice</Link>
        </div>
      </header>

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Attempts</div>
          <div className="metric-value">{logs.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Accuracy</div>
          <div className="metric-value">{accuracy}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Remediation Steps</div>
          <div className="metric-value">
            {logs.filter((l) => l.remediation).length}
          </div>
        </div>
      </div>

      <SessionSummaryPanel learningPlan={learningPlan ?? undefined} summary={summary} />

      <StudentModelPanel model={studentModel} />

      <DomainProfilePanel profiles={domainProfiles} />

      <MasteryChart logs={logs} />

      <section className="content-grid">
        <TrajectoryView logs={logs} />
        <ConceptHeatmap logs={logs} />
      </section>
      </div>
    </main>
  );
}
