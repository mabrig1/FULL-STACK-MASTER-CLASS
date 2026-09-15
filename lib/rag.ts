import { courseModules, phases } from "@/lib/course";

const phaseGuides: Record<string, string> = {
  "Phase 1 · Developer Foundations":
    "Foundation work emphasizes web fundamentals, semantic markup, responsive layout, accessibility, developer tooling and UI reasoning.",
  "Phase 2 · JavaScript Engineering":
    "JavaScript mastery requires data flow, functions, asynchronous behaviour, debugging, algorithms, Git discipline and typed thinking.",
  "Phase 3 · Modern Frontend":
    "Frontend engineering focuses on component boundaries, state, rendering, data fetching, performance, accessibility and production UX.",
  "Phase 4 · Backend & Data":
    "Backend engineering focuses on APIs, validation, persistence, data modelling, indexes, transactions, failure handling and service boundaries.",
  "Phase 5 · Security, Cloud & Commerce":
    "Security and commerce modules require explicit trust boundaries, authorization, secret handling, file safety, payments and webhook verification.",
  "Phase 6 · Production Engineering":
    "Production engineering emphasizes testing, observability, repeatable deployments, CI/CD, DNS and recovery from failures.",
  "Phase 7 · AI & Agentic Engineering":
    "AI engineering emphasizes context, retrieval, tool use, evaluation, grounded outputs, agent boundaries and human approval where needed.",
  "Phase 8 · SaaS & System Architecture":
    "SaaS architecture covers tenants, entitlements, billing, usage, scalable boundaries, performance and observability.",
  "Phase 9 · AI-Native Career Builder":
    "Career evidence should prove decisions, code quality, deployed behaviour, communication and ability to work with modern AI development tools.",
  "Phase 10 · Tech Entrepreneurship":
    "Product entrepreneurship turns technical capability into validated problems, scoped MVPs, client value, pricing, launch and measurable outcomes.",
};

function tokens(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function retrieveCourseContext(query: string, limit = 5) {
  const queryTokens = new Set(tokens(query));

  const ranked = courseModules
    .map((module) => {
      const text = [module.title, module.phase, module.level, module.challenge, phaseGuides[module.phase] || ""].join(" ");
      const moduleTokens = tokens(text);
      let score = 0;
      for (const token of moduleTokens) {
        if (queryTokens.has(token)) score += 1;
      }
      if (query.toLowerCase().includes(module.title.toLowerCase())) score += 8;
      return { module, score };
    })
    .sort((a, b) => b.score - a.score || a.module.id - b.module.id)
    .slice(0, limit);

  return ranked.map(({ module, score }) => ({
    score,
    moduleId: module.id,
    title: module.title,
    phase: module.phase,
    challenge: module.challenge,
    guidance: phaseGuides[module.phase] || "",
  }));
}

export function courseCatalogSummary() {
  return phases
    .map((phase) => {
      const modules = courseModules.filter((item) => item.phase === phase);
      return phase + ": " + modules.map((item) => item.title).join(", ");
    })
    .join("\n");
}
