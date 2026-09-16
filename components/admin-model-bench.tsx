"use client";

import { FormEvent, useEffect, useState } from "react";

type ModelEval = {
  model: string;
  score: number;
  passed: number;
  total: number;
  passRate: number;
  criticalFailures: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number | null;
  averageTokens: number | null;
  results: Array<{
    id: string;
    label: string;
    score: number;
    passed: boolean;
    errorCode: string | null;
    latencyMs: number;
    totalTokens: number | null;
    forbiddenHits: string[];
  }>;
};

type BenchRun = {
  id: string;
  baseline: ModelEval;
  candidate: ModelEval;
  gate: {
    promotable: boolean;
    decision: string;
    checks: Record<string, boolean>;
    scoreDelta: number;
    passRateDelta: number;
    p95LatencyDeltaMs: number;
    tokenDelta: number | null;
  };
  policyVersion: string;
  createdAt: string;
};

export default function AdminModelBench() {
  const [runs, setRuns] = useState<BenchRun[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [candidate, setCandidate] = useState("");
  const [policyVersion, setPolicyVersion] = useState("");
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [active, setActive] = useState<BenchRun | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/model-benchmark");
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Model benchmark service unavailable.");
      return;
    }
    setRuns(data.runs || []);
    setCurrentModel(data.currentModel || "");
    setCandidate((value) => value || data.candidateDefault || "");
    setPolicyVersion(data.policyVersion || "");
    setThresholds(data.thresholds || {});
  }

  useEffect(() => { load(); }, []);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Running baseline and candidate through the same golden cases…");

    const response = await fetch("/api/admin/model-benchmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateModel: candidate }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Model benchmark failed.");
      return;
    }

    setActive(data);
    setMessage(
      data.gate.promotable
        ? "Candidate cleared every promotion gate. Promotion is still a human deployment decision."
        : "Candidate did not clear every promotion gate. Keep the current production model.",
    );
    await load();
  }

  const visible = active || runs[0] || null;

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">MABRIG MODEL BENCH</span>
        <h1>Promote models by evidence, not novelty.</h1>
        <p>
          The production baseline and candidate receive the same versioned golden cases.
          The gate compares quality, safety failures, latency and token usage without
          changing the production model automatically.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      <section className="commercialSection modelBenchForm">
        <form className="stackForm" onSubmit={run}>
          <div className="modelBenchIdentity">
            <span>Production baseline <strong>{currentModel || "not configured"}</strong></span>
            <span>Agent policy <strong>{policyVersion || "unknown"}</strong></span>
          </div>
          <label>
            Candidate model ID
            <input
              value={candidate}
              onChange={(event) => setCandidate(event.target.value)}
              placeholder="provider/model-id"
              required
            />
          </label>
          <button className="primaryButton" disabled={busy || !candidate.trim()}>
            {busy ? "Benchmarking…" : "Run baseline vs candidate"}
          </button>
        </form>

        <div className="promotionThresholds">
          <span className="eyebrow">PROMOTION GATE</span>
          {Object.entries(thresholds).map(([key, value]) => (
            <span key={key}>{key} <strong>{value}</strong></span>
          ))}
        </div>
      </section>

      {visible && (
        <>
          <section className={"promotionVerdict " + (visible.gate.promotable ? "pass" : "hold")}>
            <span className="eyebrow">PROMOTION DECISION</span>
            <strong>{visible.gate.promotable ? "CLEAR" : "HOLD"}</strong>
            <h2>{visible.gate.decision.replaceAll("-", " ")}</h2>
            <p>
              Score Δ {visible.gate.scoreDelta >= 0 ? "+" : ""}{visible.gate.scoreDelta} ·
              Pass-rate Δ {visible.gate.passRateDelta >= 0 ? "+" : ""}{visible.gate.passRateDelta}% ·
              p95 latency Δ {visible.gate.p95LatencyDeltaMs >= 0 ? "+" : ""}{visible.gate.p95LatencyDeltaMs}ms
            </p>
          </section>

          <section className="modelComparisonGrid">
            {[["Production", visible.baseline], ["Candidate", visible.candidate]].map(([label, model]) => {
              const item = model as ModelEval;
              return (
                <article className="commercialSection" key={String(label)}>
                  <span className="eyebrow">{String(label).toUpperCase()}</span>
                  <h2>{item.model}</h2>
                  <div className="modelMetricGrid">
                    <span>Quality <strong>{item.score}%</strong></span>
                    <span>Pass rate <strong>{item.passRate}%</strong></span>
                    <span>Critical failures <strong>{item.criticalFailures}</strong></span>
                    <span>p50 <strong>{item.p50LatencyMs}ms</strong></span>
                    <span>p95 <strong>{item.p95LatencyMs}ms</strong></span>
                    <span>Tokens <strong>{item.totalTokens ?? "n/a"}</strong></span>
                  </div>
                  <div className="modelCaseList">
                    {item.results.map((result) => (
                      <article key={result.id}>
                        <span className={result.passed ? "statusGood" : "statusWarn"}>
                          {result.passed ? "PASS" : "FAIL"}
                        </span>
                        <strong>{result.label}</strong>
                        <small>
                          {result.score}% · {result.latencyMs}ms
                          {result.totalTokens !== null ? " · " + result.totalTokens + " tokens" : ""}
                          {result.errorCode ? " · " + result.errorCode : ""}
                        </small>
                      </article>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="commercialSection">
            <span className="eyebrow">GATE CHECKS</span>
            <div className="gateChecks">
              {Object.entries(visible.gate.checks).map(([key, passed]) => (
                <span className={passed ? "statusGood" : "statusWarn"} key={key}>
                  {passed ? "✓" : "×"} {key}
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="commercialSection">
        <span className="eyebrow">BENCHMARK HISTORY</span>
        <div className="benchmarkRunHistory">
          {runs.map((run) => (
            <button key={run.id} type="button" onClick={() => setActive(run)}>
              <span className={run.gate.promotable ? "statusGood" : "statusWarn"}>
                {run.gate.promotable ? "CLEAR" : "HOLD"}
              </span>
              <strong>{run.candidate.model}</strong>
              <span>{run.candidate.score}% vs {run.baseline.score}%</span>
              <time>{new Date(run.createdAt).toLocaleString()}</time>
            </button>
          ))}
          {!runs.length && <p className="muted">No model comparison has been run yet.</p>}
        </div>
      </section>
    </main>
  );
}
