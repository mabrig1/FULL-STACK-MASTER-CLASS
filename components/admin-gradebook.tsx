"use client";

import { useEffect, useState } from "react";

type ModuleStats = {
  moduleId: number;
  title: string;
  attempts: number;
  uniqueLearners: number;
  passed: number;
  passRate: number;
  average: number;
};

type Recent = {
  id: string;
  learnerName: string;
  learnerEmail: string;
  moduleId: number;
  moduleTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
};

export default function AdminGradebook() {
  const [modules, setModules] = useState<ModuleStats[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [totals, setTotals] = useState({ attempts: 0, passed: 0, learners: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/gradebook")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) return setMessage(data.error || "Assessment analytics unavailable.");
        setModules(data.modules || []);
        setRecent(data.recent || []);
        setTotals(data.totals || totals);
      })
      .catch(() => setMessage("Assessment analytics service unavailable."));
  }, []);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">INSTRUCTOR GRADEBOOK ANALYTICS</span>
        <h1>See where learners are mastering—and where they are struggling.</h1>
        <p>
          Track pass rates, average scores, unique learners and recent attempts across graded modules.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      <section className="dataGrid adminMetrics">
        <article><strong>{totals.attempts}</strong><span>assessment attempts</span></article>
        <article><strong>{totals.passed}</strong><span>passes</span></article>
        <article><strong>{totals.learners}</strong><span>assessed learners</span></article>
      </section>

      <section className="commercialSection">
        <span className="eyebrow">MODULE PERFORMANCE</span>
        <div className="tableLike">
          {modules.map((row) => (
            <article className="tableRow gradeAnalyticsRow" key={row.moduleId}>
              <div><strong>Module {row.moduleId}</strong><small>{row.title}</small></div>
              <span>{row.average}% average</span>
              <span>{row.passRate}% pass rate</span>
              <span>{row.uniqueLearners} learners · {row.attempts} attempts</span>
            </article>
          ))}
          {!modules.length && !message && <p className="muted">No assessment activity yet.</p>}
        </div>
      </section>

      <section className="commercialSection">
        <span className="eyebrow">RECENT ATTEMPTS</span>
        <div className="tableLike">
          {recent.map((row) => (
            <article className="tableRow" key={row.id}>
              <div><strong>{row.learnerName}</strong><small>{row.learnerEmail}</small></div>
              <span>Module {row.moduleId}</span>
              <span className={row.passed ? "statusGood" : "statusWarn"}>{row.score}%</span>
              <span>{new Date(row.createdAt).toLocaleDateString()}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
