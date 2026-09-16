"use client";

import { FormEvent, useEffect, useState } from "react";

type Learner = {
  id: string;
  name: string;
  email: string;
  plan: string;
  onboardingComplete: boolean;
  completed: number;
  verifiedProjects: number;
  lastLoginAt: string | null;
};

export default function AdminLearners() {
  const [rows, setRows] = useState<Learner[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  async function load(q = "") {
    const response = await fetch("/api/admin/learners?q=" + encodeURIComponent(q));
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Admin learner service unavailable.");
      return;
    }
    setRows(data.learners || []);
  }

  useEffect(() => { load(); }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    await load(query);
  }

  async function setPlan(learnerId: string, plan: "free" | "masterclass") {
    setBusy(learnerId + plan);
    const response = await fetch("/api/admin/learners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId, plan }),
    });
    const data = await response.json();
    setBusy("");
    setMessage(data.error || "Learner access updated.");
    if (response.ok) await load(query);
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">LEARNER OPERATIONS</span>
        <h1>See who is learning and control access deliberately.</h1>
        <p>Search students, inspect proof signals and grant or revoke paid Master Class access.</p>
      </section>

      <section className="commercialSection">
        <form className="adminSearch" onSubmit={search}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" />
          <button className="secondaryButton">Search</button>
        </form>
        {message && <div className="notice">{message}</div>}
      </section>

      <section className="commercialSection">
        <div className="tableLike">
          {rows.map((row) => (
            <article className="learnerRow" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <small>{row.email}</small>
              </div>
              <span>Plan <strong>{row.plan}</strong></span>
              <span>Modules <strong>{row.completed}/64</strong></span>
              <span>Verified <strong>{row.verifiedProjects}</strong></span>
              <span className={row.onboardingComplete ? "statusGood" : "statusWarn"}>
                {row.onboardingComplete ? "onboarded" : "onboarding pending"}
              </span>
              <div className="actionRow">
                {row.plan !== "masterclass" && (
                  <button
                    className="secondaryButton"
                    disabled={Boolean(busy)}
                    onClick={() => setPlan(row.id, "masterclass")}
                  >
                    Grant Master Class
                  </button>
                )}
                {row.plan === "masterclass" && (
                  <button
                    className="secondaryButton"
                    disabled={Boolean(busy)}
                    onClick={() => setPlan(row.id, "free")}
                  >
                    Revoke premium
                  </button>
                )}
              </div>
            </article>
          ))}
          {!rows.length && <p className="muted">No learners found.</p>}
        </div>
      </section>
    </main>
  );
}
