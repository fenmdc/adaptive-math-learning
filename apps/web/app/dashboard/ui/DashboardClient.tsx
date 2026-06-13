"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import problemsData from "../../../data/problems.json";
import type { Problem } from "../../../../../packages/adaptive-engine";
import { AssessmentReport, buildAssessmentReport } from "../../shared/assessmentReport";
import { buildLearningPlan, LearningPlan } from "../../shared/learningPlan";
import type { StudentModel } from "../../shared/studentModel";
import { readAssessmentReport, readDiagnosticLogs, readLearningPlan, readPracticeLogs, readStudentModel, writeAssessmentReport, writeLearningPlan } from "../../shared/storage";
import { summarizeDomainProfile, summarizeSession } from "../summary";
import type { SimulationLog } from "../types";
import ConceptGraphPanel from "./ConceptGraphPanel";
import ConceptHeatmap from "./ConceptHeatmap";
import CognitivePatternPanel from "./CognitivePatternPanel";
import DomainProfilePanel from "./DomainProfilePanel";
import MasteryChart from "./MasteryChart";
import ProblemBankCoveragePanel from "./ProblemBankCoveragePanel";
import SessionSummaryPanel from "./SessionSummaryPanel";
import StudentModelPanel from "./StudentModelPanel";
import TrajectoryView from "./TrajectoryView";

export default function DashboardClient({ fallbackLogs }: { fallbackLogs: SimulationLog[] }) {
  const [practiceLogs, setPracticeLogs] = useState<SimulationLog[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<SimulationLog[]>([]);
  const [storedLearningPlan, setStoredLearningPlan] = useState<LearningPlan | null>(null);
  const [storedAssessmentReport, setStoredAssessmentReport] = useState<AssessmentReport | null>(null);
  const [studentModel, setStudentModel] = useState<StudentModel | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPracticeLogs(readPracticeLogs());
    setDiagnosticLogs(readDiagnosticLogs());
    setStoredLearningPlan(readLearningPlan());
    setStoredAssessmentReport(readAssessmentReport());
    setStudentModel(readStudentModel());
    setHydrated(true);
  }, []);

  const userLogs = [...diagnosticLogs, ...practiceLogs];
  const logs = userLogs.length > 0 ? userLogs : fallbackLogs;
  const summary = summarizeSession(logs);
  const hasUserLogs = diagnosticLogs.length > 0 || practiceLogs.length > 0;
  const generatedLearningPlan = hasUserLogs && logs.length > 0 ? buildLearningPlan(logs, problemsData as Problem[], studentModel) : null;
  const learningPlan = generatedLearningPlan ?? storedLearningPlan;
  const generatedAssessmentReport = diagnosticLogs.length > 0 ? buildAssessmentReport(diagnosticLogs, studentModel) : null;
  const assessmentReport = generatedAssessmentReport ?? storedAssessmentReport;
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

  useEffect(() => {
    if (generatedAssessmentReport) {
      writeAssessmentReport(generatedAssessmentReport);
    }
  }, [generatedAssessmentReport]);

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
          <Link className="button-secondary" href="/login">Login</Link>
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

      {assessmentReport && <LatestAssessmentReport report={assessmentReport} />}

      <SessionSummaryPanel assessmentReport={assessmentReport ?? undefined} learningPlan={learningPlan ?? undefined} summary={summary} />

      <StudentModelPanel model={studentModel} />

      <CognitivePatternPanel logs={logs} />

      <ProblemBankCoveragePanel />

      <ConceptGraphPanel logs={logs} model={studentModel} />

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

function LatestAssessmentReport({ report }: { report: AssessmentReport }) {
  return (
    <section className="panel full-panel">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Latest Diagnostic Report</p>
          <h2 className="panel-title">{report.recommendationTitle}</h2>
          <div className="muted">
            Placement: {report.placement.stage} · {report.placement.status}
          </div>
          <div className="muted">
            Calibration: {report.calibration.confidence} · {report.calibration.completedSlots}/{report.calibration.expectedSlots} slot(s)
          </div>
        </div>
        <div className="summary-score">{report.accuracy}%</div>
      </div>
      <p className="summary-recommendation">{report.recommendationReason}</p>
      <div className="summary-list">
        {report.summaryBullets.slice(0, 4).map((item) => (
          <div className="summary-item" key={item}>
            <div>{item}</div>
          </div>
        ))}
      </div>
      <div className="readiness-grid">
        {report.stageReadiness.map((stage) => (
          <div className="readiness-card" key={stage.stage}>
            <div className={`readiness ${readinessClass(stage.status)}`}>{stage.status}</div>
            <strong>{stage.stage}</strong>
            <span>{stage.evidence}</span>
          </div>
        ))}
      </div>
      {report.cognitivePatterns.length > 0 && (
        <div className="summary-grid">
          {report.cognitivePatterns.slice(0, 2).map((pattern) => (
            <div className="summary-item summary-item-focus" key={pattern.id}>
              <div>
                <strong>{pattern.label}</strong>
                <div className="muted">
                  {pattern.count} signal(s) · {pattern.concepts.join(", ") || "mixed concepts"}
                </div>
              </div>
              <div className="summary-percent">{pattern.confidence}</div>
            </div>
          ))}
        </div>
      )}
      <div className="summary-grid">
        {report.abilityProfile.map((ability) => (
          <div className="summary-item" key={ability.dimension}>
            <div>
              <strong>{ability.dimension}</strong>
              <div className="muted">{ability.status} · {ability.evidence}</div>
            </div>
            <div className="summary-percent">{Math.round(ability.score * 100)}%</div>
          </div>
        ))}
      </div>
      <div className="learning-plan-actions report-actions">
        <Link className="button" href={report.practiceHref}>
          Start personalized mini session
        </Link>
        <Link className="button-secondary" href="/diagnostic">
          Retake diagnostic
        </Link>
      </div>
    </section>
  );
}

function readinessClass(status: AssessmentReport["stageReadiness"][number]["status"]) {
  if (status === "Ready") return "readiness-ready";
  if (status === "Developing") return "readiness-developing";
  return "readiness-needs-review";
}
