"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to continue.");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("The account service is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="commercialPage authShell">
      <section className="authCard">
        <span className="eyebrow">FULL STACK MASTER CLASS</span>
        <h1>{mode === "login" ? "Welcome back, builder." : "Create your developer identity."}</h1>
        <p>
          {mode === "login"
            ? "Your progress, projects, AI memory and certificates follow this account."
            : "Create an account to sync progress, submit projects, join cohorts and earn verified credentials."}
        </p>
        <form onSubmit={submit} className="stackForm">
          {mode === "register" && <input name="name" placeholder="Full name" minLength={2} required />}
          <input name="email" type="email" placeholder="Email address" required />
          <input name="password" type="password" placeholder="Password (8+ characters)" minLength={8} required />
          {error && <div className="formError">{error}</div>}
          <button className="primaryButton" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <small>
          {mode === "login" ? (
            <>New learner? <Link href="/register">Create an account</Link>.</>
          ) : (
            <>Already registered? <Link href="/login">Sign in</Link>.</>
          )}
        </small>
      </section>
    </main>
  );
}
