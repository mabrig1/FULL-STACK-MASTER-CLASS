"use client";

import { FormEvent, useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  audience: string;
  delivered: number;
  createdAt: string;
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/announcements");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Announcement service unavailable.");
    setItems(data.announcements || []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    const response = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Unable to broadcast announcement.");
      return;
    }

    setMessage("Announcement delivered to " + data.delivered + " learner accounts.");
    event.currentTarget.reset();
    await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">ACADEMY ANNOUNCEMENTS</span>
        <h1>Broadcast important learning events without leaving the platform.</h1>
        <p>
          Target all learners, free learners or Master Class learners. Each announcement becomes an in-app notification.
        </p>
      </section>

      <section className="commercialSection twoColumn">
        <form className="stackForm" onSubmit={submit}>
          <h2>Create announcement</h2>
          <input name="title" placeholder="Announcement title" required />
          <textarea name="body" rows={6} placeholder="Write the announcement…" minLength={10} required />
          <input name="href" placeholder="Optional internal link, e.g. /learn/12" />
          <select name="audience" defaultValue="all">
            <option value="all">All learners</option>
            <option value="free">Free learners</option>
            <option value="masterclass">Master Class learners</option>
          </select>
          <button className="primaryButton" disabled={busy}>{busy ? "Broadcasting…" : "Broadcast announcement"}</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <div>
          <span className="eyebrow">DELIVERY RULE</span>
          <h2>Announcements become durable learner notifications.</h2>
          <p className="muted">
            Messages are stored in the academy, not dependent on browser sessions, and can link directly to lessons, assessments, cohorts or payment pages.
          </p>
        </div>
      </section>

      <section className="commercialSection">
        <span className="eyebrow">RECENT ANNOUNCEMENTS</span>
        <div className="announcementHistory">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
              <span>{item.audience}</span>
              <span>{item.delivered} delivered</span>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </article>
          ))}
          {!items.length && !message && <p className="muted">No announcements yet.</p>}
        </div>
      </section>
    </main>
  );
}
