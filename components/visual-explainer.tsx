"use client";

import { FormEvent, useState } from "react";

type Visual = {
  title: string;
  summary: string;
  nodes: Array<{ id: string; label: string; detail: string }>;
  edges: Array<{ from: string; to: string; label: string }>;
};

export default function VisualExplainer({ moduleId }: { moduleId: number }) {
  const [visual, setVisual] = useState<Visual | null>(null);
  const [focus, setFocus] = useState("");
  const [active, setActive] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/visual-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, focus }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Visual explanation unavailable.");
    setVisual(data.visual);
    setActive(data.visual?.nodes?.[0]?.id || "");
  }

  function speak() {
    if (!visual || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setMessage("Read-aloud is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const selected = visual.nodes.find((node) => node.id === active);
    const utterance = new SpeechSynthesisUtterance(
      selected ? selected.label + ". " + selected.detail : visual.title + ". " + visual.summary,
    );
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="visualExplainer">
      <div className="sectionMiniHeading">
        <div>
          <span className="eyebrow">VISUAL EXPLAINER AGENT</span>
          <h3>Turn the lesson into a concept map.</h3>
        </div>
        {visual && <button className="secondaryButton" type="button" onClick={speak}>Read aloud</button>}
      </div>

      <form className="visualFocus" onSubmit={generate}>
        <input
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
          placeholder="Optional focus: e.g. show me the request flow"
        />
        <button className="secondaryButton" disabled={busy}>{busy ? "Mapping…" : visual ? "Remap" : "Generate map"}</button>
      </form>

      {message && <div className="notice">{message}</div>}

      {visual && (
        <>
          <h4>{visual.title}</h4>
          <p className="muted">{visual.summary}</p>
          <div className="conceptMap">
            {visual.nodes.map((node, index) => (
              <button
                type="button"
                key={node.id}
                className={active === node.id ? "conceptNode active" : "conceptNode"}
                onClick={() => setActive(node.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{node.label}</strong>
                {active === node.id && <small>{node.detail}</small>}
              </button>
            ))}
          </div>
          {visual.edges.length > 0 && (
            <div className="conceptEdges">
              {visual.edges.map((edge, index) => (
                <span key={edge.from + edge.to + index}>
                  {visual.nodes.find((node) => node.id === edge.from)?.label || edge.from}
                  {" → "}{edge.label}{" → "}
                  {visual.nodes.find((node) => node.id === edge.to)?.label || edge.to}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
