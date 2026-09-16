"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  event: string;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export default function AdminAudit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => ok ? setEvents(data.events || []) : setMessage(data.error || "Audit access required."))
      .catch(() => setMessage("Audit service unavailable."));
  }, []);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">AUDIT TRAIL</span>
        <h1>Know what changed, who changed it and when.</h1>
        <p>Security and administrative events are retained without storing raw IP addresses.</p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      <section className="commercialSection">
        <div className="auditList">
          {events.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.event}</strong>
                <small>{item.actorEmail || "system / anonymous"}</small>
              </div>
              <pre>{Object.keys(item.metadata || {}).length ? JSON.stringify(item.metadata) : "—"}</pre>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </article>
          ))}
          {!events.length && !message && <p className="muted">No audit events yet.</p>}
        </div>
      </section>
    </main>
  );
}
