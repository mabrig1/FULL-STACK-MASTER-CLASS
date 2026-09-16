"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Mastery = {
  moduleId: number;
  title: string;
  score: number;
  status: string;
  prerequisiteReady: boolean;
};

type AdaptiveState = {
  mastery: Mastery[];
  recommendation: null | {
    type: "review" | "practice" | "advance" | "recover";
    moduleId: number;
    title: string;
    reason: string;
  };
  reviewQueue: Array<{ moduleId: number; title: string }>;
  cognitiveLoad: {
    score: number;
    level: "low" | "medium" | "high";
    signals: Record<string, number>;
    intervention: string;
  };
};

type PracticeQuestion = {
  id: number;
  question: string;
  options: string[];
  skillTag: string;
  difficulty: string;
};

export default function AdaptiveLearningStudio() {
  const [state, setState] = useState<AdaptiveState | null>(null);
  const [session, setSession] = useState<null | {
    sessionId: string;
    moduleId: number;
    moduleTitle: string;
    masteryBefore: number;
    difficulty: string;
    questions: PracticeQuestion[];
  }>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/adaptive");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Learning intelligence requires a signed-in account.");
    setState(data);
  }

  useEffect(() => { load(); }, []);

  async function generate(moduleId?: number) {
    setBusy(true);
    setMessage("");
    setResult(null);
    const response = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", moduleId: moduleId || state?.recommendation?.moduleId }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Unable to generate adaptive practice.");
    setSession(data);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const answers = session.questions.map((q) => String(form.get("q-" + q.id) || ""));
    const response = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", sessionId: session.sessionId, answers }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Practice grading failed.");
    setResult(data);
    setSession(null);
    await load();
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">ADAPTIVE AGENTIC LEARNING ENGINE</span>
        <h1>The academy decides whether you should advance, practise or review.</h1>
        <p>
          Recommendations combine completion evidence, assessments, verified projects,
          adaptive practice, prerequisites and recent struggle signals.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      {state && (
        <>
          <section className="adaptiveHeroGrid">
            <article className="commercialSection adaptiveRecommendation">
              <span className="eyebrow">NEXT BEST ACTION · {state.recommendation?.type || "complete"}</span>
              <h2>{state.recommendation?.title || "Keep shipping evidence."}</h2>
              <p>{state.recommendation?.reason || "No outstanding adaptive recommendation."}</p>
              {state.recommendation && (
                <div className="actionRow">
                  <Link className="secondaryButton" href={"/learn/" + state.recommendation.moduleId}>Open lesson</Link>
                  <button className="primaryButton" disabled={busy} onClick={() => generate(state.recommendation!.moduleId)}>
                    {busy ? "Generating…" : "Start adaptive workout"}
                  </button>
                </div>
              )}
            </article>

            <article className={"commercialSection cognitiveLoad " + state.cognitiveLoad.level}>
              <span className="eyebrow">COGNITIVE LOAD SIGNAL</span>
              <strong>{state.cognitiveLoad.score}</strong>
              <h2>{state.cognitiveLoad.level} load</h2>
              <p>{state.cognitiveLoad.intervention}</p>
              <div className="signalFacts">
                <span>Failed assessments <strong>{state.cognitiveLoad.signals.failedAssessments7d}</strong></span>
                <span>7-day average <strong>{state.cognitiveLoad.signals.averageAssessment7d}%</strong></span>
                <span>Mentor interactions <strong>{state.cognitiveLoad.signals.mentorInteractions7d}</strong></span>
              </div>
            </article>
          </section>

          <section className="commercialSection">
            <div className="sectionMiniHeading">
              <div>
                <span className="eyebrow">MASTERY GRAPH</span>
                <h2>Evidence-weighted module mastery</h2>
              </div>
              <span>{state.mastery.filter((item) => item.score >= 60).length} competent or mastered</span>
            </div>
            <div className="masteryGrid">
              {state.mastery.map((item) => (
                <article key={item.moduleId} className={"masteryNode " + item.status}>
                  <div>
                    <span>M{String(item.moduleId).padStart(2, "0")}</span>
                    <strong>{item.score}</strong>
                  </div>
                  <h3>{item.title}</h3>
                  <small>{item.status} · {item.prerequisiteReady ? "prerequisites ready" : "prerequisites developing"}</small>
                  <div className="masteryBar"><span style={{ width: item.score + "%" }} /></div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {session && (
        <form className="assessmentList" onSubmit={submit}>
          <section className="commercialSection">
            <span className="eyebrow">ADAPTIVE WORKOUT · {session.difficulty}</span>
            <h2>{session.moduleTitle}</h2>
            <p className="muted">Mastery before this workout: {session.masteryBefore}/100.</p>
          </section>
          {session.questions.map((item, index) => (
            <section className="commercialSection assessmentQuestion" key={item.id}>
              <span className="eyebrow">QUESTION {index + 1} · {item.skillTag || item.difficulty}</span>
              <h2>{item.question}</h2>
              <div className="assessmentOptions">
                {item.options.map((option) => (
                  <label key={option}>
                    <input type="radio" name={"q-" + item.id} value={option} required />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
          <button className="primaryButton" disabled={busy}>{busy ? "Scoring…" : "Complete adaptive workout"}</button>
        </form>
      )}

      {result && (
        <section className={result.score >= 70 ? "assessmentResult passed" : "assessmentResult failed"}>
          <strong>{result.score}%</strong>
          <span>{result.score >= 70 ? "REINFORCED" : "REVIEW SOON"}</span>
          <p>Next spaced review in {result.intervalDays} day{result.intervalDays === 1 ? "" : "s"}.</p>
        </section>
      )}
    </main>
  );
}
