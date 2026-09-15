"use client";

import { FormEvent, useState } from "react";

type Result = {
  route: string[];
  supervisorGoal: string;
  traces: Array<{ agent: string; output: string; live: boolean }>;
  synthesis: string;
  liveAgents: number;
};

export default function OrchestratorStudio() {
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orchestrator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: form.get("task") }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Orchestration failed.");
    setResult(data);
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">AUTONOMOUS MULTI-AGENT LEARNING</span>
        <h1>Give the system a mission, not a prompt.</h1>
        <p>
          A supervisor chooses the smallest specialist route for the task, passes context between
          agents, retrieves relevant course material and stores the final learning memory.
        </p>
      </section>

      <section className="commercialSection">
        <form className="stackForm" onSubmit={run}>
          <textarea
            name="task"
            rows={6}
            placeholder="Example: My Next.js checkout works locally but fails after deployment. Diagnose it, give me a build plan, review the risks and define proof that it is fixed."
            required
          />
          <button className="primaryButton" disabled={busy}>{busy ? "Agents collaborating…" : "Run autonomous learning mission"}</button>
          {message && <div className="notice">{message}</div>}
        </form>
      </section>

      {result && (
        <>
          <section className="commercialSection">
            <span className="eyebrow">SUPERVISOR ROUTE</span>
            <h2>{result.supervisorGoal}</h2>
            <div className="chipRow">{result.route.map((agent) => <span key={agent}>{agent}</span>)}</div>
            <p className="muted">{result.liveAgents} specialist agents used live AI on this run.</p>
          </section>
          <section className="agentTraceGrid">
            {result.traces.map((trace, index) => (
              <article key={trace.agent + index}>
                <span className="eyebrow">{String(index + 1).padStart(2, "0")} · {trace.agent}</span>
                <p>{trace.output}</p>
              </article>
            ))}
          </section>
          <section className="commercialSection synthesis">
            <span className="eyebrow">SUPERVISOR SYNTHESIS</span>
            <pre>{result.synthesis}</pre>
          </section>
        </>
      )}
    </main>
  );
}
