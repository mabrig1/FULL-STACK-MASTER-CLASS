"use client";

import { FormEvent, useState } from "react";

type Mode = "tutor" | "code-review" | "project-coach" | "quiz" | "career";

const modes: { id: Mode; label: string; note: string }[] = [
  { id: "tutor", label: "Mentor", note: "Explain, diagnose and teach" },
  { id: "code-review", label: "Code Review", note: "Find bugs and improve quality" },
  { id: "project-coach", label: "Project Coach", note: "Turn learning into shipped work" },
  { id: "quiz", label: "Quiz Master", note: "Test recall and reasoning" },
  { id: "career", label: "Career Agent", note: "Turn proof into opportunity" },
];

export default function AgentPanel({
  context,
  compact = false,
}: {
  context: string;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("tutor");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(
    "I am your AI learning team. Choose a role and give me a challenge.",
  );
  const [actions, setActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    setReply("Thinking through the best learning move…");
    setActions([]);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: input, context }),
      });
      const data = await response.json();
      setReply(data.reply || "I could not generate a response.");
      setActions(data.nextActions || []);
    } catch {
      setReply("The mentor service is temporarily unavailable. Keep building and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={compact ? "agentCard compact" : "agentCard"}>
      <div className="agentHeader">
        <div>
          <span className="eyebrow">MABRIG MENTOR SWARM</span>
          <h2>One learner. Five expert agents.</h2>
        </div>
        <span className="liveDot">● adaptive</span>
      </div>

      <div className="agentModes">
        {modes.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "mode active" : "mode"}
            onClick={() => setMode(item.id)}
            title={item.note}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="agentReply">{reply}</div>

      {actions.length > 0 && (
        <div className="agentActions">
          {actions.map((action) => (
            <span key={action}>{action}</span>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="agentForm">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            mode === "code-review"
              ? "Paste code or describe the bug you want reviewed…"
              : "Ask a question, describe what is blocking you, or request your next challenge…"
          }
          rows={compact ? 3 : 5}
        />
        <button className="primaryButton" disabled={busy}>
          {busy ? "Agent working…" : "Ask the agent"}
        </button>
      </form>
    </section>
  );
}
