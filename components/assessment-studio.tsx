"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Question = { id: number; question: string; options: string[] };
type Result = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  review: Array<{
    index: number;
    correct: boolean;
    selected: string;
    answer: string;
    explanation: string;
  }>;
};

export default function AssessmentStudio({ moduleId }: { moduleId: number }) {
  const [title, setTitle] = useState("Module assessment");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/assessments/" + moduleId)
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) {
          setMessage(data.error || "Assessment unavailable.");
          return;
        }
        setTitle(data.module?.title ? data.module.title + " Assessment" : "Module Assessment");
        setQuestions(data.questions || []);
        setAvailable(Boolean(data.available));
      })
      .catch(() => setMessage("Assessment service unavailable."));
  }, [moduleId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const answers = questions.map((question) => String(form.get("q-" + question.id) || ""));

    const response = await fetch("/api/assessments/" + moduleId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to grade assessment.");
      return;
    }
    setResult(data);
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">GRADED ASSESSMENT · MODULE {moduleId}</span>
        <h1>{title}</h1>
        <p>Passing score: 70%. Your best module score is recorded in your gradebook.</p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      {!available && (
        <section className="commercialSection">
          <h2>No graded assessment has been published for this module yet.</h2>
          <Link className="secondaryButton" href={"/learn/" + moduleId}>Return to lesson</Link>
        </section>
      )}

      {available && questions.length > 0 && !result && (
        <form className="assessmentList" onSubmit={submit}>
          {questions.map((item, index) => (
            <section className="commercialSection assessmentQuestion" key={item.id}>
              <span className="eyebrow">QUESTION {index + 1}</span>
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
          <button className="primaryButton" disabled={busy}>
            {busy ? "Grading…" : "Submit assessment"}
          </button>
        </form>
      )}

      {result && (
        <>
          <section className={result.passed ? "assessmentResult passed" : "assessmentResult failed"}>
            <strong>{result.score}%</strong>
            <span>{result.passed ? "PASSED" : "NOT YET PASSED"}</span>
            <p>{result.correct} of {result.total} correct.</p>
          </section>

          <section className="commercialSection">
            <span className="eyebrow">ANSWER REVIEW</span>
            <div className="reviewAnswers">
              {result.review.map((item) => (
                <article key={item.index}>
                  <strong className={item.correct ? "statusGood" : "statusWarn"}>
                    Question {item.index + 1} · {item.correct ? "Correct" : "Review"}
                  </strong>
                  {!item.correct && <p>Your answer: {item.selected || "No answer"}</p>}
                  <p>Correct answer: {item.answer}</p>
                  <small>{item.explanation}</small>
                </article>
              ))}
            </div>
            <div className="actionRow">
              <Link className="secondaryButton" href="/gradebook">Open gradebook</Link>
              <Link className="secondaryButton" href={"/learn/" + moduleId}>Return to lesson</Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
