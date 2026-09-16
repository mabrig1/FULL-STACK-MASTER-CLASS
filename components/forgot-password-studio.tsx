"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordStudio() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    }).catch(() => undefined);

    setBusy(false);
    setMessage("If an account exists and email delivery is configured, a reset link has been sent.");
  }

  return (
    <main className="commercialPage authShell">
      <section className="authCard">
        <span className="eyebrow">PASSWORD RECOVERY</span>
        <h1>Recover your developer identity.</h1>
        <p>Enter your account email. Reset links expire after 30 minutes.</p>
        <form className="stackForm" onSubmit={submit}>
          <input name="email" type="email" placeholder="Email address" required />
          <button className="primaryButton" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          {message && <div className="notice">{message}</div>}
        </form>
        <small><Link href="/login">Return to sign in</Link>.</small>
      </section>
    </main>
  );
}
