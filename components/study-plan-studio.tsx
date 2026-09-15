"use client";

import { FormEvent, useEffect, useState } from "react";

type Plan = {
  summary: string;
  weeks: Array<{ week: number; focus: string; moduleIds: number[]; deliverable: string }>;
  milestones: string[];
};

export default function StudyPlanStudio() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/study-plan")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => ok ? setPlan(data.plan) : setMessage(data.error || "Sign in to create a plan."))
      .catch(() => undefined);
  }, []);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Unable to create plan.");
    setMessage("");
    setPlan(data.plan);
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">PERSONALIZED STUDY INTELLIGENCE</span>
        <h1>Your curriculum should adapt to your destination.</h1>
        <p>The planner reads completed modules, your target role and available time, then produces a project-first weekly mission.</p>
      </section>
      <section className="commercialSection twoColumn">
        <form className="stackForm" onSubmit={generate}>
          <h2>Generate your route</h2>
          <input name="targetRole" defaultValue="Full Stack Developer" placeholder="Target role" />
          <textarea name="goal" rows={4} defaultValue="Become production-ready and build a portfolio that can win real opportunities." />
          <input name="weeklyHours" type="number" min={2} max={40} defaultValue={6} />
          <input name="weeks" type="number" min={2} max={24} defaultValue={8} />
          <button className="primaryButton" disabled={busy}>{busy ? "Planning…" : "Generate adaptive plan"}</button>
          {message && <div className="notice">{message}</div>}
        </form>
        <div>
          <span className="eyebrow">LATEST PLAN</span>
          <h2>{plan?.summary || "No study plan generated yet."}</h2>
          {plan?.milestones?.length ? <div className="chipRow">{plan.milestones.map((item) => <span key={item}>{item}</span>)}</div> : null}
        </div>
      </section>
      {plan && (
        <section className="commercialSection planWeeks">
          {plan.weeks.map((week) => (
            <article key={week.week}>
              <span>WEEK {week.week}</span>
              <h3>{week.focus}</h3>
              <p>{week.deliverable}</p>
              <small>Modules: {week.moduleIds.join(", ") || "portfolio refinement"}</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
