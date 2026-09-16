"use client";

import { useEffect, useState } from "react";

type Quality = {
  windowDays: number;
  metrics: {
    total: number;
    liveRate: number;
    fallbackRate: number;
    errorRate: number;
    strongGroundingRate: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
  kinds: Array<{
    kind: string;
    total: number;
    liveRate: number;
    fallbackRate: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  }>;
  recent: Array<{
    id: string;
    kind: string;
    mode: string;
    status: string;
    latencyMs: number;
    provider: string | null;
    model: string | null;
    skill: string | null;
    groundingStrength: string | null;
    retrievedModules: number[];
    input: string;
    output: string;
    createdAt: string;
  }>;
};

type EvalRun = {
  id: string;
  score: number;
  passRate: number;
  passed: number;
  total: number;
  provider: string | null;
  model: string | null;
  createdAt: string;
  results: Array<any>;
};

export default function AdminAgentQuality() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState("");

  async function load() {
    const [qualityResponse, evalResponse] = await Promise.all([
      fetch("/api/admin/agent-quality"),
      fetch("/api/admin/evals"),
    ]);
    const [qualityData, evalData] = await Promise.all([
      qualityResponse.json(),
      evalResponse.json(),
    ]);

    if (!qualityResponse.ok) {
      setMessage(qualityData.error || "Agent quality data unavailable.");
      return;
    }
    setQuality(qualityData);
    if (evalResponse.ok) setEvalRuns(evalData.runs || []);
  }

  useEffect(() => { load(); }, []);

  async function runEval() {
    setBusy(true);
    setMessage("Running golden evaluation suite…");
    const response = await fetch("/api/admin/evals", { method: "POST" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Evaluation failed.");
      return;
    }
    setMessage(
      "Golden eval complete: " +
        data.score +
        "% average · " +
        data.passRate +
        "% cases passed.",
    );
    await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">AGENT QUALITY LAB</span>
        <h1>Measure the learning agents like production software.</h1>
        <p>
          Inspect reliability, grounding, latency, fallback behaviour and regression evals
          instead of assuming that a successful API response means a high-quality tutor.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      {quality && (
        <>
          <section className="qualityMetricGrid">
            <article><strong>{quality.metrics.liveRate}%</strong><span>live AI rate</span></article>
            <article><strong>{quality.metrics.fallbackRate}%</strong><span>fallback rate</span></article>
            <article><strong>{quality.metrics.strongGroundingRate}%</strong><span>strong grounding</span></article>
            <article><strong>{quality.metrics.errorRate}%</strong><span>error rate</span></article>
            <article><strong>{quality.metrics.p50LatencyMs}ms</strong><span>p50 latency</span></article>
            <article><strong>{quality.metrics.p95LatencyMs}ms</strong><span>p95 latency</span></article>
          </section>

          <section className="commercialSection">
            <div className="sectionMiniHeading">
              <div>
                <span className="eyebrow">GOLDEN EVALS</span>
                <h2>Regression-test the mentor before model or prompt changes become learner problems.</h2>
              </div>
              <button className="primaryButton" disabled={busy} onClick={runEval}>
                {busy ? "Evaluating…" : "Run golden suite"}
              </button>
            </div>

            <div className="evalHistory">
              {evalRuns.map((run) => (
                <article key={run.id}>
                  <div>
                    <strong>{run.score}%</strong>
                    <span>{run.passRate}% pass rate</span>
                  </div>
                  <div>
                    <span>{run.passed}/{run.total} cases</span>
                    <small>{run.provider || "provider"} · {run.model || "model"}</small>
                  </div>
                  <time>{new Date(run.createdAt).toLocaleString()}</time>
                </article>
              ))}
              {!evalRuns.length && <p className="muted">No golden evaluation has been run yet.</p>}
            </div>
          </section>

          <section className="commercialSection">
            <span className="eyebrow">AGENT TYPES · LAST {quality.windowDays} DAYS</span>
            <div className="tableLike">
              {quality.kinds.map((row) => (
                <article className="tableRow qualityKindRow" key={row.kind}>
                  <strong>{row.kind}</strong>
                  <span>{row.total} runs</span>
                  <span>{row.liveRate}% live · {row.fallbackRate}% fallback</span>
                  <span>{row.p50LatencyMs}ms p50 · {row.p95LatencyMs}ms p95</span>
                </article>
              ))}
            </div>
          </section>

          <section className="commercialSection">
            <span className="eyebrow">RECENT TRACE EVIDENCE</span>
            <div className="traceList">
              {quality.recent.map((trace) => (
                <article key={trace.id}>
                  <button type="button" onClick={() => setExpanded(expanded === trace.id ? "" : trace.id)}>
                    <span className={"traceStatus " + trace.status}>{trace.status}</span>
                    <strong>{trace.kind}{trace.mode ? " · " + trace.mode : ""}</strong>
                    <span>{trace.latencyMs}ms</span>
                    <span>{trace.groundingStrength || "n/a"} grounding</span>
                    <time>{new Date(trace.createdAt).toLocaleString()}</time>
                  </button>
                  {expanded === trace.id && (
                    <div className="traceDetail">
                      <p><strong>Skill:</strong> {trace.skill || "not attributed"}</p>
                      <p><strong>Modules:</strong> {trace.retrievedModules.join(", ") || "none"}</p>
                      <h4>Input</h4>
                      <pre>{trace.input}</pre>
                      <h4>Output</h4>
                      <pre>{trace.output}</pre>
                    </div>
                  )}
                </article>
              ))}
              {!quality.recent.length && <p className="muted">No agent traces recorded yet.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
