"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecordRow = {
  moduleId: number;
  title: string;
  score: number;
  passed: boolean;
  attempts: number;
  latestAt: string;
};

export default function GradebookStudio() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [summary, setSummary] = useState({ assessedModules: 0, passedModules: 0, average: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/gradebook")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) return setMessage(data.error || "Gradebook unavailable.");
        setRows(data.records || []);
        setSummary(data.summary || summary);
      })
      .catch(() => setMessage("Gradebook service unavailable."));
  }, []);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">LEARNER GRADEBOOK</span>
        <h1>Your assessment evidence in one place.</h1>
        <p>Best score is shown per assessed module while attempt history remains stored for academic evidence.</p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      <section className="dataGrid gradeSummary">
        <article><strong>{summary.average}%</strong><span>best-score average</span></article>
        <article><strong>{summary.assessedModules}</strong><span>modules assessed</span></article>
        <article><strong>{summary.passedModules}</strong><span>modules passed</span></article>
        <article><strong>70%</strong><span>pass threshold</span></article>
      </section>

      <section className="commercialSection">
        <div className="tableLike">
          {rows.map((row) => (
            <article className="tableRow" key={row.moduleId}>
              <div><strong>Module {row.moduleId}</strong><small>{row.title}</small></div>
              <span className={row.passed ? "statusGood" : "statusWarn"}>{row.passed ? "passed" : "retry needed"}</span>
              <span>{row.score}% · {row.attempts} attempt{row.attempts === 1 ? "" : "s"}</span>
              <Link className="secondaryButton" href={"/assessment/" + row.moduleId}>Retake</Link>
            </article>
          ))}
          {!rows.length && <p className="muted">No graded assessments submitted yet.</p>}
        </div>
      </section>
    </main>
  );
}
