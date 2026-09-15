"use client";

import { useMemo, useState } from "react";

const starterHtml = `<main class="card">
  <h1>Build something real.</h1>
  <p>Edit HTML, CSS and JavaScript, then run it safely in the isolated preview.</p>
  <button id="action">Test interaction</button>
</main>`;

const starterCss = `body {
  font-family: system-ui, sans-serif;
  background: #07110f;
  color: #f5fbf8;
  padding: 32px;
}
.card {
  max-width: 520px;
  padding: 28px;
  border: 1px solid #2b5144;
  border-radius: 20px;
}
button { padding: 10px 14px; }`;

const starterJs = `document.querySelector("#action")?.addEventListener("click", () => {
  document.querySelector("h1").textContent = "Interaction verified ✓";
});`;

export default function SandboxLab() {
  const [html, setHtml] = useState(starterHtml);
  const [css, setCss] = useState(starterCss);
  const [js, setJs] = useState(starterJs);
  const [runVersion, setRunVersion] = useState(0);

  const srcDoc = useMemo(() => {
    const safeJs = js.replace(/<\/script/gi, "<\\/script");
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:;">
<style>${css}</style>
</head>
<body>
${html}
<script>
try {
  ${safeJs}
} catch (error) {
  document.body.insertAdjacentHTML('beforeend', '<pre style="color:#ff9b8f">' + String(error) + '</pre>');
}
<\/script>
</body>
</html>`;
  }, [html, css, js, runVersion]);

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">ISOLATED BROWSER SANDBOX</span>
        <h1>Write it. Run it. Break it. Fix it.</h1>
        <p>
          This first sandbox executes client-side HTML, CSS and JavaScript inside a sandboxed
          iframe with a restrictive content-security policy. Server execution is intentionally
          not exposed.
        </p>
      </section>

      <section className="sandboxGrid">
        <div className="sandboxEditors">
          <label>HTML<textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={12} /></label>
          <label>CSS<textarea value={css} onChange={(e) => setCss(e.target.value)} rows={12} /></label>
          <label>JavaScript<textarea value={js} onChange={(e) => setJs(e.target.value)} rows={12} /></label>
          <button className="primaryButton" onClick={() => setRunVersion((value) => value + 1)}>
            Run isolated preview
          </button>
        </div>
        <div className="sandboxPreview">
          <div className="sandboxPreviewTop">
            <span className="eyebrow">LIVE PREVIEW</span>
            <span className="muted">network blocked · no same-origin access</span>
          </div>
          <iframe key={runVersion} title="Code preview" sandbox="allow-scripts" srcDoc={srcDoc} />
        </div>
      </section>
    </main>
  );
}
