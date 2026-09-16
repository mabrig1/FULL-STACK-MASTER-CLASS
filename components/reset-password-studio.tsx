"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ResetPasswordStudio({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password !== confirm) {
      setBusy(false);
      setMessage("The passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Password reset failed.");
      return;
    }

    setDone(true);
    setMessage("Password reset complete. Previous sessions were revoked.");
  }

  return (
    <main className="commercialPage authShell">
      <section className="authCard">
        <span className="eyebrow">RESET PASSWORD</span>
        <h1>{done ? "Password secured." : "Choose a new password."}</h1>
        {!done ? (
          <form className="stackForm" onSubmit={submit}>
            <input name="password" type="password" minLength={10} placeholder="New password (10+ characters)" required />
            <input name="confirm" type="password" minLength={10} placeholder="Confirm new password" required />
            <button className="primaryButton" disabled={busy}>{busy ? "Updating…" : "Reset password"}</button>
          </form>
        ) : (
          <Link className="primaryButton inlineButton" href="/login">Sign in again →</Link>
        )}
        {message && <div className="notice">{message}</div>}
      </section>
    </main>
  );
}
