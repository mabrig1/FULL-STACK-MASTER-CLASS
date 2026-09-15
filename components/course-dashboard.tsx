"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AgentPanel from "@/components/agent-panel";
import { courseModules, phases } from "@/lib/course";

const STORAGE_KEY = "fsmc-progress-v1";

export default function CourseDashboard() {
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCompleted(JSON.parse(stored));
    } catch {}
  }, []);

  const progress = Math.round((completed.length / courseModules.length) * 100);
  const nextModule = courseModules.find((module) => !completed.includes(module.id)) ?? courseModules[0];

  const xp = completed.length * 120;
  const streak = Math.min(30, Math.max(1, Math.ceil(completed.length / 2)));
  const skillScore = Math.min(100, 8 + completed.length * 2);

  const phaseProgress = useMemo(
    () =>
      phases.map((phase) => {
        const modules = courseModules.filter((module) => module.phase === phase);
        const done = modules.filter((module) => completed.includes(module.id)).length;
        return { phase, modules, done };
      }),
    [completed],
  );

  return (
    <main className="dashboardPage">
      <section className="dashboardHero">
        <div>
          <span className="eyebrow">ADAPTIVE DEVELOPER OS</span>
          <h1>Your path changes as your proof grows.</h1>
          <p>
            The academy tracks completed modules locally, recommends the next build,
            and gives your AI mentor the exact course context you are working in.
          </p>
        </div>
        <div className="progressOrb" style={{ "--progress": progress } as React.CSSProperties}>
          <strong>{progress}%</strong>
          <span>mastery</span>
        </div>
      </section>

      <section className="statGrid">
        <article><span>Skill score</span><strong>{skillScore}/100</strong><small>Based on completed evidence</small></article>
        <article><span>Build XP</span><strong>{xp.toLocaleString()}</strong><small>Earned by shipping modules</small></article>
        <article><span>Momentum</span><strong>{streak} days</strong><small>Simulated learning streak</small></article>
        <article><span>Portfolio proof</span><strong>{completed.length}</strong><small>Modules converted into evidence</small></article>
      </section>

      <section className="dashboardGrid">
        <div className="panel">
          <div className="panelHeading">
            <div>
              <span className="eyebrow">NEXT BEST ACTION</span>
              <h2>{nextModule.title}</h2>
            </div>
            <span className="pill">{nextModule.level}</span>
          </div>
          <p>{nextModule.challenge}</p>
          <div className="nextMeta">
            <span>≈ {nextModule.minutes} min core lesson</span>
            <span>Module {nextModule.id} of {courseModules.length}</span>
          </div>
          <Link className="primaryButton inlineButton" href={"/learn/" + nextModule.id}>
            Start this module →
          </Link>
        </div>

        <div className="panel signalPanel">
          <span className="eyebrow">LEARNING SIGNALS</span>
          <h2>Build intelligence, not content consumption.</h2>
          <div className="signalList">
            <span>01 · Explain it</span>
            <span>02 · Build it</span>
            <span>03 · Break it</span>
            <span>04 · Fix it</span>
            <span>05 · Ship it</span>
          </div>
        </div>
      </section>

      <AgentPanel
        context={"Dashboard context. Completed " + completed.length + " of " + courseModules.length + " modules. Next recommended module: " + nextModule.title + "."}
      />

      <section className="curriculumSection">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">64-MODULE MASTERY GRAPH</span>
            <h2>Curriculum that behaves like a product roadmap.</h2>
          </div>
          <p>Each phase moves from knowledge to a demonstrable technical artifact.</p>
        </div>

        <div className="phaseList">
          {phaseProgress.map((phase) => (
            <article className="phaseCard" key={phase.phase}>
              <div className="phaseTop">
                <div>
                  <h3>{phase.phase}</h3>
                  <p>{phase.done}/{phase.modules.length} complete</p>
                </div>
                <strong>{Math.round((phase.done / phase.modules.length) * 100)}%</strong>
              </div>
              <div className="miniProgress">
                <span style={{ width: (phase.done / phase.modules.length) * 100 + "%" }} />
              </div>
              <div className="moduleRows">
                {phase.modules.map((module) => (
                  <Link key={module.id} href={"/learn/" + module.id} className="moduleRow">
                    <span className={completed.includes(module.id) ? "moduleIndex done" : "moduleIndex"}>
                      {completed.includes(module.id) ? "✓" : String(module.id).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{module.title}</strong>
                      <small>{module.challenge}</small>
                    </span>
                    <span className="moduleArrow">→</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export { STORAGE_KEY };
