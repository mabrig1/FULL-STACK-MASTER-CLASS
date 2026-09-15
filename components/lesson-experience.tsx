"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AgentPanel from "@/components/agent-panel";
import { CourseModule } from "@/lib/course";

const STORAGE_KEY = "fsmc-progress-v1";

export default function LessonExperience({
  module,
  total,
}: {
  module: CourseModule;
  total: number;
}) {
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("// Build evidence here.\n");

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setDone(stored.includes(module.id));
    } catch {}
  }, [module.id]);

  function toggleDone() {
    try {
      const stored: number[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      const next = done
        ? stored.filter((id) => id !== module.id)
        : Array.from(new Set([...stored, module.id]));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setDone(!done);
    } catch {}
  }

  const outcomes = [
    "Explain the core engineering idea in your own words.",
    "Implement the idea inside a working feature.",
    "Identify at least one failure mode and debug it.",
    "Document the decision so another developer can reproduce it.",
  ];

  return (
    <main className="lessonPage">
      <div className="lessonBreadcrumb">
        <Link href="/dashboard">Academy</Link>
        <span>/</span>
        <span>Module {module.id}</span>
      </div>

      <section className="lessonHero">
        <div>
          <span className="eyebrow">{module.phase}</span>
          <h1>{module.title}</h1>
          <p>
            This lesson is taught through a mastery loop: understand → build → test →
            explain → ship.
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
          <div className="outcomeList">
            {outcomes.map((item, index) => (
              <div key={item}>
                <span>0{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>

          <div className="challengeBox">
            <span className="eyebrow">BUILD CHALLENGE</span>
            <h3>{module.challenge}</h3>
            <p>
              Your submission should include working behaviour, a short README, one
              screenshot or demo link, and a paragraph explaining the hardest decision.
            </p>
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
              Copy your experiment into the Code Review agent. The mentor is designed to
              point out defects and trade-offs before giving a replacement solution.
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
              ". Build challenge: " +
              module.challenge
            }
          />
          <div className="proofCard">
            <span className="eyebrow">PORTFOLIO PROOF</span>
            <h3>Do not finish with notes.</h3>
            <p>
              Finish with something another human can run, inspect, test or click.
            </p>
            {module.id < total && (
              <Link href={"/learn/" + (module.id + 1)}>Preview next module →</Link>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
