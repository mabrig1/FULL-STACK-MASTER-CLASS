"use client";

import { useEffect, useState } from "react";

type Learner = {
  userId: string;
  name: string;
  email: string;
  plan: string;
  riskScore: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  intervention: string;
  signals: {
    inactiveDays: number;
    failedAssessments14d: number;
    averageAssessment: number | null;
    averagePractice: number | null;
    completedModules: number;
    weakConcepts: number;
    fallbackRate: number;
  };
  lastActivity: string;
};

export default function AdminInterventionRadar() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch("/api/admin/interventions");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Intervention radar unavailable.");
    setLearners(data.learners || []);
    setSummary(data.summary || summary);
  }

  useEffect(() => { load(); }, []);

  async function nudge(learner: Learner) {
    setBusy(learner.userId);
    setMessage("");
    const response = await fetch("/api/admin/interventions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: learner.userId,
        title: "Your next learning recovery step",
        message: learner.intervention,
        href: "/adaptive",
      }),
    });
    const data = await response.json();
    setBusy("");
    setMessage(response.ok ? "Intervention sent to " + learner.name + "." : data.error || "Unable to send intervention.");
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">INSTRUCTOR INTERVENTION RADAR</span>
        <h1>Find struggling learners before disengagement becomes dropout.</h1>
        <p>
          Risk is derived from visible learning evidence: inactivity, failed assessments,
          weak adaptive practice, unresolved concepts and AI fallback dependence.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      <section className="qualityMetricGrid">
        <article><strong>{summary.total}</strong><span>learners monitored</span></article>
        <article><strong>{summary.high}</strong><span>high attention</span></article>
        <article><strong>{summary.medium}</strong><span>medium attention</span></article>
        <article><strong>{summary.low}</strong><span>normal progression</span></article>
      </section>

      <section className="commercialSection">
        <div className="riskList">
          {learners.map((learner) => (
            <article className={"riskCard " + learner.level} key={learner.userId}>
              <div className="riskIdentity">
                <div>
                  <span className={"riskBadge " + learner.level}>{learner.level}</span>
                  <h3>{learner.name}</h3>
                  <small>{learner.email} · {learner.plan}</small>
                </div>
                <strong>{learner.riskScore}</strong>
              </div>

              <div className="riskSignals">
                <span>Inactive <strong>{learner.signals.inactiveDays}d</strong></span>
                <span>Failed 14d <strong>{learner.signals.failedAssessments14d}</strong></span>
                <span>Assessment <strong>{learner.signals.averageAssessment ?? "—"}{learner.signals.averageAssessment !== null ? "%" : ""}</strong></span>
                <span>Practice <strong>{learner.signals.averagePractice ?? "—"}{learner.signals.averagePractice !== null ? "%" : ""}</strong></span>
                <span>Weak concepts <strong>{learner.signals.weakConcepts}</strong></span>
                <span>AI fallback <strong>{learner.signals.fallbackRate}%</strong></span>
              </div>

              <div className="riskReasons">
                {learner.reasons.length
                  ? learner.reasons.map((reason) => <p key={reason}>{reason}</p>)
                  : <p>No material risk signal detected.</p>}
              </div>

              <div className="riskAction">
                <p>{learner.intervention}</p>
                {learner.level !== "low" && (
                  <button
                    className="secondaryButton"
                    disabled={busy === learner.userId}
                    onClick={() => nudge(learner)}
                  >
                    {busy === learner.userId ? "Sending…" : "Send targeted nudge"}
                  </button>
                )}
              </div>
            </article>
          ))}
          {!learners.length && !message && <p className="muted">No learner records available yet.</p>}
        </div>
      </section>
    </main>
  );
}
