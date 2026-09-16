"use client";

import { FormEvent, useState } from "react";

export default function SecurityStudio() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      setBusy(false);
      setMessage("The new passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Unable to change password.");
      return;
    }

    setMessage("Password changed. Existing sessions were revoked. Sign in again.");
    setTimeout(() => { window.location.href = "/login"; }, 1500);
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h1>Protect your developer identity.</h1>
        <p>
          Password changes revoke existing sessions so a leaked session cannot continue using
          your learner account after you secure it.
        </p>
      </section>

      <section className="commercialSection securityCard">
        <form className="stackForm" onSubmit={changePassword}>
          <input name="currentPassword" type="password" placeholder="Current password" required />
          <input name="newPassword" type="password" minLength={10} placeholder="New password (10+ characters)" required />
          <input name="confirmPassword" type="password" minLength={10} placeholder="Confirm new password" required />
          <button className="primaryButton" disabled={busy}>{busy ? "Updating…" : "Change password"}</button>
          {message && <div className="notice">{message}</div>}
        </form>
      </section>
    </main>
  );
}
