"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyEmailStudio({ token }: { token: string }) {
  const [status, setStatus] = useState("Verifying your email…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("Verification token is missing.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        setOk(ok);
        setStatus(ok ? "Email verified successfully." : data.error || "Verification failed.");
      })
      .catch(() => setStatus("Verification service unavailable."));
  }, [token]);

  return (
    <main className="commercialPage authShell">
      <section className="authCard">
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>{ok ? "Developer identity verified." : "Verifying identity."}</h1>
        <p>{status}</p>
        <Link className="primaryButton inlineButton" href={ok ? "/account" : "/login"}>
          {ok ? "Open account →" : "Return to sign in →"}
        </Link>
      </section>
    </main>
  );
}
