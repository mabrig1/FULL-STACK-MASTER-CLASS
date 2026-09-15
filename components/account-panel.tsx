"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  configured: boolean;
  user: null | {
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    entitlements: string[];
  };
};

export default function AccountPanel() {
  const [data, setData] = useState<Me | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/me").then((response) => response.json()).then(setData).catch(() => setData(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function requestCertificate() {
    const response = await fetch("/api/certificates/issue", { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      const criteria = result.criteria
        ? " Modules: " + result.criteria.modules + ", verified projects: " + result.criteria.verifiedProjects + ", readiness: " + result.criteria.readiness + "/100."
        : "";
      setMessage((result.error || "Certificate could not be issued.") + criteria);
      return;
    }
    setMessage("Certificate issued: " + result.certificateId + ". Verification URL: " + result.verifyUrl);
  }

  if (!data) return <div className="panel">Loading account…</div>;

  if (!data.user) {
    return (
      <section className="panel accountPanel">
        <span className="eyebrow">ACCOUNT</span>
        <h2>{data.configured ? "Sign in to sync your academy." : "MongoDB is ready in code, but not connected to this deployment."}</h2>
        <p>
          {data.configured
            ? "Accounts unlock cloud progress, project verification, study plans, grading, cohorts and certificates."
            : "Set MONGODB_URI in the deployment environment to activate persistent student accounts."}
        </p>
        {data.configured && <Link className="primaryButton inlineButton" href="/login">Sign in →</Link>}
      </section>
    );
  }

  return (
    <section className="panel accountPanel">
      <span className="eyebrow">DEVELOPER IDENTITY</span>
      <h2>{data.user.name}</h2>
      <p>{data.user.email}</p>
      <div className="accountFacts">
        <span>Role <strong>{data.user.role}</strong></span>
        <span>Plan <strong>{data.user.plan}</strong></span>
        <span>Access <strong>{data.user.entitlements.join(", ") || "free-course"}</strong></span>
      </div>
      <div className="actionRow">
        <Link className="secondaryButton" href="/platform">Open platform</Link>
        <Link className="secondaryButton" href="/pricing">Upgrade</Link>
        <button className="secondaryButton" onClick={requestCertificate}>Request certificate</button>
        <button className="secondaryButton" onClick={logout}>Sign out</button>
      </div>
      {message && <div className="notice accountNotice">{message}</div>}
    </section>
  );
}
