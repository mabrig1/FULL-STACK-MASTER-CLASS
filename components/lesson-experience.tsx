"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AgentPanel from "@/components/agent-panel";
import { CourseModule } from "@/lib/course";
import type { CourseContent } from "@/lib/content";

const STORAGE_KEY = "fsmc-progress-v1";

export default function LessonExperience({
  module,
  total,
  content,
}: {
  module: CourseModule;
  total: number;
  content: CourseContent;
}) {
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("// Build evidence here.\n");
  const [syncMode, setSyncMode] = useState<"local" | "cloud">("local");

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setDone(stored.includes(module.id));
    } catch {}

    fetch("/api/progress")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) return;
        const completed = Array.isArray(data.completed) ? data.completed : [];
        setDone(completed.includes(module.id));
        setSyncMode("cloud");
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      })
      .catch(() => undefined);
  }, [module.id]);

  async function toggleDone() {
    const nextDone = !done;
    setDone(nextDone);

    try {
      const stored: number[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      const next = nextDone
        ? Array.from(new Set([...stored, module.id]))
        : stored.filter((id) => id !== module.id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, completed: nextDone }),
      });
      if (response.ok) setSyncMode("cloud");
    } catch {}
  }

  const outcomes = content.objectives;

  return (
    <main className="lessonPage">
      <div className="lessonBreadcrumb">
        <Link href="/dashboard">Academy</Link>
        <span>/</span>
        <span>Module {module.id}</span>
        <span>/</span>
        <span>{syncMode === "cloud" ? "cloud-synced" : "local"}</span>
      </div>

      <section className="lessonHero">
        <div>
          <span className="eyebrow">{module.phase}</span>
          <h1>{module.title}</h1>
          <p>
            This lesson follows a mastery loop: understand → build → test → explain → verify → ship.
          </p>
          <div className="lessonTags">
            <span>{module.level}</span>
            <span>≈ {module.minutes} min</span>
            <span>Module {module.id}/{total}</span>
          </div>
        </div>
        <button className={done ? "completeButton done" : "completeButton"} onClick={toggleDone}>
          {done ? "✓ Evidence complete" : "Mark evidence complete"}
        </button>
      </section>

      <section className="lessonGrid">
        <article className="lessonArticle">
          <span className="eyebrow">THE MASTERY BRIEF</span>
          <h2>What you must be able to prove</h2>
          <p className="lessonSummary">{content.summary}</p>
          <div className="outcomeList">
            {outcomes.map((item, index) => (
              <div key={item}>
                <span>0{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>

          <div className="lessonContentSections">
            {content.sections.map((section, index) => (
              <section key={section.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </div>
              </section>
            ))}
          </div>

          <div className="lessonLab">
            <span className="eyebrow">GUIDED LAB</span>
            <h3>{content.lab.title}</h3>
            <ol>
              {content.lab.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="labDeliverable">
              <strong>Deliverable</strong>
              <p>{content.lab.deliverable}</p>
            </div>
          </div>

          {content.quiz.length > 0 && (
            <div className="lessonQuiz">
              <span className="eyebrow">GRADED KNOWLEDGE CHECK</span>
              <h3>{content.quiz.length} questions · 70% required to pass.</h3>
              <p>
                Answers are graded on the server and recorded in your learner gradebook.
                Complete the lesson first, then take the assessment without answer hints.
              </p>
              <Link className="primaryButton inlineButton" href={"/assessment/" + module.id}>
                Take graded assessment →
              </Link>
            </div>
          )}

          <div className="reflectionBox">
            <span className="eyebrow">REFLECTION</span>
            <p>{content.reflection}</p>
          </div>

          <div className="challengeBox">
            <span className="eyebrow">BUILD CHALLENGE</span>
            <h3>{module.challenge}</h3>
            <p>
              Submit working behaviour, a useful README, live proof when appropriate and
              a short explanation of the hardest engineering decision.
            </p>
            <div className="actionRow">
              <Link className="secondaryButton" href="/sandbox">Open code sandbox</Link>
              <Link className="secondaryButton" href="/submissions">Submit GitHub proof</Link>
            </div>
          </div>

          <div className="codeLab">
            <div className="codeLabTop">
              <div>
                <span className="eyebrow">AI CODE LAB</span>
                <h3>Think in code, then ask for review.</h3>
              </div>
              <span>scratchpad</span>
            </div>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} rows={14} />
            <p className="hint">
              The Code Review agent is grounded in this module and can remember your prior
              signed-in learning interactions.
            </p>
          </div>
        </article>

        <aside className="lessonAside">
          <AgentPanel
            compact
            context={
              "Learner is currently in Module " +
              module.id +
              ": " +
              module.title +
              ". Lesson summary: " +
              content.summary +
              ". Build challenge: " +
              module.challenge +
              ". Completion is " +
              (done ? "marked complete" : "not complete") +
              "."
            }
          />
          <div className="proofCard">
            <span className="eyebrow">PORTFOLIO PROOF</span>
            <h3>Do not finish with notes.</h3>
            <p>Finish with something another human can run, inspect, test or click.</p>
            <Link href="/submissions">Verify a project →</Link>
            {module.id < total && (
              <><br /><Link href={"/learn/" + (module.id + 1)}>Preview next module →</Link></>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
