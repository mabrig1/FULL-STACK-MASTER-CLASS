"use client";

import { useEffect, useState } from "react";

export default function PricingPanel() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) return;
    setBusy(true);
    fetch("/api/payments/verify?reference=" + encodeURIComponent(reference))
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => setMessage(ok ? "Payment verified. Master Class access is active." : data.error || "Payment could not be verified."))
      .finally(() => setBusy(false));
  }, []);

  async function upgrade() {
    setBusy(true);
    const response = await fetch("/api/payments/initialize", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to start checkout.");
      setBusy(false);
      return;
    }
    window.location.href = data.authorizationUrl;
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">COMMERCIAL ACCESS</span>
        <h1>Invest in proof you can carry into the market.</h1>
        <p>Checkout is initialized server-side and access is granted only after verified payment status.</p>
      </section>
      <section className="pricingCard">
        <span className="eyebrow">FULL MASTER CLASS</span>
        <h2>Production Builder Access</h2>
        <ul>
          <li>64-module mastery graph</li>
          <li>Persistent AI mentor memory</li>
          <li>Autonomous multi-agent orchestrator</li>
          <li>GitHub verification + automated grading</li>
          <li>Cohorts + peer review</li>
          <li>Evidence-backed certificate eligibility</li>
        </ul>
        <button className="primaryButton" onClick={upgrade} disabled={busy}>{busy ? "Checking…" : "Start secure checkout"}</button>
        {message && <div className="notice">{message}</div>}
      </section>
    </main>
  );
}
