"use client";

import { FormEvent, useEffect, useState } from "react";
import { courseModules } from "@/lib/course";

type Submission = {
  id: string;
  moduleId: number;
  githubUrl: string;
  demoUrl: string;
  githubVerified: boolean;
  status: string;
  grade: null | { score: number; summary?: string };
};

export default function SubmissionStudio() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch("/api/submissions");
    const data = await response.json();
    if (response.ok) setRows(data.submissions || []);
    else setMessage(data.error || "Sign in to use project verification.");
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("submit");
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error || "Submission failed.");
    setToken(data.verificationToken);
    setMessage(data.instructions);
    event.currentTarget.reset();
    await load();
  }

  async function action(id: string, kind: "verify" | "grade") {
    setBusy(id + kind);
    const response = await fetch("/api/submissions/" + id + "/" + kind, { method: "POST" });
    const data = await response.json();
    setBusy("");
    setMessage(data.message || data.error || (kind === "grade" ? "Project graded." : "Verification complete."));
    await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">GITHUB PROOF ENGINE</span>
        <h1>Turn repositories into verified learning evidence.</h1>
        <p>
          Every submission receives a unique README challenge. Once ownership is proved,
          the grader inspects repository signals and applies the module rubric.
        </p>
      </section>

      <section className="commercialSection twoColumn">
        <form className="stackForm" onSubmit={submit}>
          <h2>Submit project evidence</h2>
          <select name="moduleId" required defaultValue="">
            <option value="" disabled>Select course module</option>
            {courseModules.map((module) => (
              <option key={module.id} value={module.id}>{module.id}. {module.title}</option>
            ))}
          </select>
          <input name="githubUrl" placeholder="https://github.com/you/project" required />
          <input name="demoUrl" placeholder="Live deployment URL (optional)" />
          <textarea name="notes" rows={5} placeholder="What did you build, and what was the hardest engineering decision?" />
          <button className="primaryButton" disabled={Boolean(busy)}>Create verification challenge</button>
        </form>
        <div className="proofInstruction">
          <span className="eyebrow">OWNERSHIP CHALLENGE</span>
          <h2>{token || "Your token appears here."}</h2>
          <p>Add the exact token to your README, commit it and push. Then use Verify below.</p>
          {message && <div className="notice">{message}</div>}
        </div>
      </section>

      <section className="commercialSection">
        <div className="sectionMiniHeading"><h2>Your project ledger</h2><span>{rows.length} submissions</span></div>
        <div className="tableLike">
          {rows.map((row) => (
            <article className="tableRow submissionRow" key={row.id}>
              <div><strong>Module {row.moduleId}</strong><small>{row.githubUrl}</small></div>
              <span className={row.githubVerified ? "statusGood" : "statusWarn"}>
                {row.githubVerified ? "Verified" : "Awaiting verification"}
              </span>
              <span>{row.grade ? "Score " + row.grade.score + "/100" : row.status}</span>
              <div className="actionRow">
                {!row.githubVerified && (
                  <button className="secondaryButton" onClick={() => action(row.id, "verify")} disabled={Boolean(busy)}>
                    Verify
                  </button>
                )}
                {row.githubVerified && (
                  <button className="secondaryButton" onClick={() => action(row.id, "grade")} disabled={Boolean(busy)}>
                    Grade
                  </button>
                )}
              </div>
            </article>
          ))}
          {!rows.length && <p className="muted">No project evidence submitted yet.</p>}
        </div>
      </section>
    </main>
  );
}
