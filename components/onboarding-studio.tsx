"use client";

import { FormEvent, useEffect, useState } from "react";

const roles = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI Application Engineer",
  "SaaS Developer",
  "Freelance Developer",
  "Startup Builder",
];

export default function OnboardingStudio() {
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) {
          setMessage(data.error || "Sign in to configure your learning profile.");
          return;
        }
        setProfile(data);
      })
      .catch(() => setMessage("Profile service unavailable."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to save your profile.");
      return;
    }
    window.location.href = "/study-plan";
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">LEARNER ONBOARDING</span>
        <h1>Tell the academy where you are going.</h1>
        <p>
          Your target role, current level and weekly time become inputs to study planning,
          mentor context and future readiness recommendations.
        </p>
      </section>

      <section className="commercialSection onboardingCard">
        {message && <div className="notice">{message}</div>}
        {profile && (
          <form className="stackForm" onSubmit={save}>
            <label>
              Name
              <input name="name" defaultValue={profile.name || ""} minLength={2} required />
            </label>
            <label>
              Target role
              <select name="targetRole" defaultValue={profile.profile?.targetRole || roles[0]}>
                {roles.map((role) => <option value={role} key={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Experience level
              <select name="experienceLevel" defaultValue={profile.profile?.experienceLevel || "beginner"}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              Weekly learning hours
              <input name="weeklyHours" type="number" min={2} max={40} defaultValue={profile.profile?.weeklyHours || 6} />
            </label>
            <label>
              Your main goal
              <textarea
                name="goal"
                rows={5}
                defaultValue={profile.profile?.goal || ""}
                placeholder="Example: build and launch a production SaaS, win freelance clients, or become job-ready."
              />
            </label>
            <button className="primaryButton" disabled={busy}>
              {busy ? "Saving…" : "Save and generate my learning route"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
