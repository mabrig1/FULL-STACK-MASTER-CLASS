"use client";

import { FormEvent, useEffect, useState } from "react";
import { courseModules } from "@/lib/course";

export default function CourseStudio() {
  const [moduleId, setModuleId] = useState(1);
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(id: number) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/course-content?moduleId=" + id);
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to load course content.");
      return;
    }
    setJson(JSON.stringify(data.content, null, 2));
    setSource(data.source || "");
  }

  useEffect(() => { load(moduleId); }, [moduleId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    let content;
    try {
      content = JSON.parse(json);
    } catch {
      setBusy(false);
      setMessage("Lesson JSON is not valid.");
      return;
    }

    const response = await fetch("/api/admin/course-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, content }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.error || "Lesson saved as version " + data.version + ".");
    if (response.ok) setSource("database");
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">COURSE STUDIO</span>
        <h1>Edit the academy without editing the application.</h1>
        <p>
          Each module has structured lesson content, objectives, lab steps, assessment questions
          and reflection prompts. Saved versions override the code fallback in MongoDB.
        </p>
      </section>

      <section className="commercialSection">
        <div className="courseStudioTop">
          <select value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>
            {courseModules.map((module) => (
              <option value={module.id} key={module.id}>{module.id}. {module.title}</option>
            ))}
          </select>
          <span className="pill">{source || "loading"}</span>
        </div>

        <form className="stackForm" onSubmit={save}>
          <textarea
            className="courseJsonEditor"
            rows={34}
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
          <div className="actionRow">
            <button className="primaryButton" disabled={busy}>{busy ? "Saving…" : "Save lesson version"}</button>
            <button type="button" className="secondaryButton" onClick={() => load(moduleId)}>Reload</button>
          </div>
          {message && <div className="notice">{message}</div>}
        </form>
      </section>
    </main>
  );
}
