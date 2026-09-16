"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Overview = {
  metrics: {
    learners: number;
    onboardedLearners: number;
    submissions: number;
    verified: number;
    cohorts: number;
    revenueNgn: number;
    aiCallsToday: number;
  };
  recentSubmissions: Array<{
    id: string;
    moduleId: number;
    githubUrl: string;
    verified: boolean;
    score: number | null;
  }>;
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
        <p>
          Track learners, verified evidence, AI usage, cohorts, revenue and security activity
          from one operator surface.
        </p>
      </section>

      <section className="adminCommandBar">
        <Link href="/admin/benchmark">Benchmark Lab →</Link>
        <Link href="/admin/quality">Agent Quality Lab →</Link>
        <Link href="/admin/interventions">Intervention Radar →</Link>
        <Link href="/admin/course">Course Studio →</Link>
        <Link href="/admin/gradebook">Assessment analytics →</Link>
        <Link href="/admin/announcements">Announcements →</Link>
        <Link href="/admin/learners">Manage learners →</Link>
        <Link href="/admin/audit">Audit trail →</Link>
        <Link href="/cohorts">Cohorts →</Link>
        <Link href="/submissions">Project evidence →</Link>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      {data && (
        <>
          <section className="dataGrid adminMetrics">
            <article><strong>{data.metrics.learners}</strong><span>students</span></article>
            <article><strong>{data.metrics.onboardedLearners}</strong><span>onboarded</span></article>
            <article><strong>{data.metrics.aiCallsToday}</strong><span>AI calls today</span></article>
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
                  <span className={row.verified ? "statusGood" : "statusWarn"}>
                    {row.verified ? "verified" : "pending"}
                  </span>
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
