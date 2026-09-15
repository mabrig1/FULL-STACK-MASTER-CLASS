"use client";

import { FormEvent, useEffect, useState } from "react";

type Cohort = { id: string; name: string; code?: string; memberCount: number; startDate?: string; endDate?: string };

export default function CohortStudio() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/cohorts");
    const data = await response.json();
    if (response.ok) setCohorts(data.cohorts || []);
    else setMessage(data.error || "Sign in to use cohorts.");
  }
  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>, action: "join" | "create") {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(action === "join" ? "/api/cohorts/join" : "/api/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(data.error || (action === "join" ? "Cohort joined." : "Cohort created. Code: " + data.code));
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">COHORT LEARNING</span>
        <h1>Build with accountability around you.</h1>
        <p>Cohorts create the social boundary for peer review, instructor oversight and synchronized project milestones.</p>
      </section>
      <section className="commercialSection twoColumn">
        <form className="stackForm" onSubmit={(e) => submit(e, "join")}>
          <h2>Join a cohort</h2>
          <input name="code" placeholder="Cohort code" required />
          <button className="primaryButton">Join cohort</button>
        </form>
        <form className="stackForm" onSubmit={(e) => submit(e, "create")}>
          <h2>Instructor: create cohort</h2>
          <input name="name" placeholder="Cohort name" required />
          <input name="startDate" type="date" />
          <input name="endDate" type="date" />
          <button className="secondaryButton">Create cohort</button>
        </form>
      </section>
      {message && <div className="commercialSection notice">{message}</div>}
      <section className="commercialSection">
        <div className="tableLike">
          {cohorts.map((cohort) => (
            <article className="tableRow" key={cohort.id}>
              <strong>{cohort.name}</strong>
              <span>{cohort.memberCount} learners</span>
              <span>{cohort.code ? "Code " + cohort.code : "Active membership"}</span>
              <span className="statusGood">active</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
