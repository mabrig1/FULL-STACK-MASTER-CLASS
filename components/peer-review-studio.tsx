"use client";

import { FormEvent, useEffect, useState } from "react";

type Candidate = { id: string; moduleId: number; githubUrl: string; demoUrl: string; grade?: { score: number } | null };

export default function PeerReviewStudio() {
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/peer-reviews");
    const data = await response.json();
    if (response.ok) setQueue(data.queue || []);
    else setMessage(data.error || "Sign in and join a cohort first.");
  }
  useEffect(() => { load(); }, []);

  async function review(event: FormEvent<HTMLFormElement>, submissionId: string) {
    event.preventDefault();
    const payload = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), submissionId };
    const response = await fetch("/api/peer-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(data.error || "Review saved with overall score " + data.overall + "/5.");
    if (response.ok) await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">STRUCTURED PEER REVIEW</span>
        <h1>Learn to read engineering work, not only write it.</h1>
        <p>Only verified projects from shared cohort peers enter your review queue.</p>
      </section>
      {message && <div className="commercialSection notice">{message}</div>}
      <section className="reviewGrid">
        {queue.map((item) => (
          <article className="commercialSection" key={item.id}>
            <span className="eyebrow">MODULE {item.moduleId}</span>
            <h2>Peer project</h2>
            <p><a href={item.githubUrl} target="_blank" rel="noreferrer">{item.githubUrl}</a></p>
            <form className="stackForm" onSubmit={(e) => review(e, item.id)}>
              <label>Correctness <input name="correctness" type="number" min={1} max={5} defaultValue={4} /></label>
              <label>Maintainability <input name="maintainability" type="number" min={1} max={5} defaultValue={4} /></label>
              <label>Documentation <input name="documentation" type="number" min={1} max={5} defaultValue={4} /></label>
              <textarea name="feedback" rows={5} minLength={30} placeholder="Give specific, respectful engineering feedback with at least one improvement." required />
              <button className="primaryButton">Submit peer review</button>
            </form>
          </article>
        ))}
        {!queue.length && <p className="muted">No eligible peer projects in your queue yet.</p>}
      </section>
    </main>
  );
}
