"use client";

import { useEffect, useState } from "react";

type Overview = {
  metrics: { learners: number; submissions: number; verified: number; cohorts: number; revenueNgn: number };
  recentSubmissions: Array<{ id: string; moduleId: number; githubUrl: string; verified: boolean; score: number | null }>;
};

export default function AdminStudio() {
  const [data, setData] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => ok ? setData(data) : setMessage(data.error || "Instructor access required."))
      .catch(() => setMessage("Admin service unavailable."));
  }, []);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">INSTRUCTOR / ADMIN STUDIO</span>
        <h1>Operate learning quality like a product.</h1>
        <p>Track learners, verified evidence, cohorts and commercial activity from one control surface.</p>
      </section>
      {message && <section className="commercialSection notice">{message}</section>}
      {data && (
        <>
          <section className="dataGrid">
            <article><strong>{data.metrics.learners}</strong><span>students</span></article>
            <article><strong>{data.metrics.verified}/{data.metrics.submissions}</strong><span>verified projects</span></article>
            <article><strong>{data.metrics.cohorts}</strong><span>cohorts</span></article>
            <article><strong>₦{data.metrics.revenueNgn.toLocaleString()}</strong><span>verified revenue</span></article>
          </section>
          <section className="commercialSection">
            <span className="eyebrow">RECENT EVIDENCE</span>
            <div className="tableLike">
              {data.recentSubmissions.map((row) => (
                <article className="tableRow" key={row.id}>
                  <strong>Module {row.moduleId}</strong>
                  <span className="mono">{row.githubUrl}</span>
                  <span className={row.verified ? "statusGood" : "statusWarn"}>{row.verified ? "verified" : "pending"}</span>
                  <span>{row.score == null ? "ungraded" : row.score + "/100"}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
