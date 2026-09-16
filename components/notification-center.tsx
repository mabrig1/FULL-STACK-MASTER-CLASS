"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notice = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  type: string;
  read: boolean;
  createdAt: string;
};

export default function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/notifications");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Notifications unavailable.");
    setItems(data.notifications || []);
    setUnread(Number(data.unread || 0));
  }

  useEffect(() => { load(); }, []);

  async function mark(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">LEARNER NOTIFICATIONS</span>
        <h1>Important learning events, without the noise.</h1>
        <p>{unread} unread notification{unread === 1 ? "" : "s"}.</p>
      </section>

      <section className="commercialSection">
        <div className="sectionMiniHeading">
          <h2>Activity</h2>
          {unread > 0 && <button className="secondaryButton" onClick={() => mark("all")}>Mark all read</button>}
        </div>
        {message && <div className="notice">{message}</div>}
        <div className="notificationList">
          {items.map((item) => (
            <article className={item.read ? "read" : "unread"} key={item.id}>
              <div>
                <span className="eyebrow">{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div className="actionRow">
                {item.href && <Link className="secondaryButton" href={item.href}>Open</Link>}
                {!item.read && <button className="secondaryButton" onClick={() => mark(item.id)}>Mark read</button>}
              </div>
            </article>
          ))}
          {!items.length && !message && <p className="muted">No notifications yet.</p>}
        </div>
      </section>
    </main>
  );
}
