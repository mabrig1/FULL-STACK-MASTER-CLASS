"use client";

import { useEffect, useState } from "react";

type Readiness = {
  total: number;
  breakdown: Record<string, number>;
  evidence: Record<string, number>;
  gaps: string[];
};

export default function ReadinessPanel() {
  const [data, setData] = useState<Readiness | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/readiness")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => ok ? setData(data) : setMessage(data.error || "Sign in to calculate readiness."))
      .catch(() => setMessage("Readiness service unavailable."));
  }, []);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">JOB-READINESS INDEX</span>
        <h1>Measure evidence, not confidence.</h1>
        <p>The score weighs curriculum completion, verified projects, code quality, deployments and structured peer review.</p>
      </section>
      {message && <section className="commercialSection notice">{message}</section>}
      {data && (
        <>
          <section className="readinessHero">
            <strong>{data.total}</strong><span>/100</span>
            <p>{data.total >= 80 ? "Strong production evidence." : data.total >= 60 ? "Developing professional evidence." : "Build more verifiable proof."}</p>
          </section>
          <section className="dataGrid readinessBreakdown">
            {Object.entries(data.breakdown).map(([key, value]) => (
              <article key={key}><strong>{value}</strong><span>{key}</span></article>
            ))}
          </section>
          <section className="commercialSection">
            <span className="eyebrow">NEXT READINESS GAPS</span>
            <div className="gapList">
              {data.gaps.length ? data.gaps.map((gap) => <p key={gap}>→ {gap}</p>) : <p>Core evidence targets are satisfied. Keep raising project quality.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
