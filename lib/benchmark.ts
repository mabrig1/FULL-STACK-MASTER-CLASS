export type BenchmarkItem = {
  id: string;
  dimension: string;
  status: "implemented" | "partial" | "planned";
  evidence: string;
  pattern: string;
};

export const benchmarkItems: BenchmarkItem[] = [
  {
    id: "adaptive-personalization",
    dimension: "Adaptive personalization",
    status: "implemented",
    evidence: "/adaptive + lib/mastery.ts",
    pattern: "Learner state changes next action, difficulty and practice target.",
  },
  {
    id: "grounded-tutor",
    dimension: "Source-grounded AI tutor",
    status: "implemented",
    evidence: "/api/agent + lib/rag.ts",
    pattern: "Tutor answers use retrieved course context and expose grounding attribution.",
  },
  {
    id: "mastery-graph",
    dimension: "Prerequisite mastery graph",
    status: "implemented",
    evidence: "lib/mastery.ts",
    pattern: "Evidence-weighted module mastery with prerequisite readiness.",
  },
  {
    id: "spaced-review",
    dimension: "Spaced review scheduling",
    status: "implemented",
    evidence: "/api/practice",
    pattern: "Practice score schedules next review at 1, 3 or 7 days.",
  },
  {
    id: "cognitive-load",
    dimension: "Cognitive-load / struggle detection",
    status: "implemented",
    evidence: "/api/adaptive",
    pattern: "Recent failures, scores, retries and mentor interaction volume shape intervention.",
  },
  {
    id: "adaptive-practice",
    dimension: "AI-generated adaptive practice",
    status: "implemented",
    evidence: "/practice + /api/practice",
    pattern: "Difficulty and questions adapt to current mastery and lesson content.",
  },
  {
    id: "agent-skills",
    dimension: "Attributable agent skills",
    status: "implemented",
    evidence: "lib/agent-skills.ts + mentor UI",
    pattern: "Debugging, security, testing, deployment and architecture skills are selected per request.",
  },
  {
    id: "multi-agent",
    dimension: "Supervised multi-agent orchestration",
    status: "implemented",
    evidence: "/orchestrator",
    pattern: "Supervisor selects specialists; deep effort adds an independent evaluator.",
  },
  {
    id: "repo-context",
    dimension: "Repository-wide code review context",
    status: "implemented",
    evidence: "lib/github.ts + project grader",
    pattern: "Lite, balanced and deep review inspect prioritized files beyond README metadata.",
  },
  {
    id: "agentic-assessment",
    dimension: "Agentic / evidence-based assessment",
    status: "implemented",
    evidence: "/submissions + /assessment/[moduleId]",
    pattern: "Learners build, verify GitHub ownership, receive AI-assisted grading and explain decisions.",
  },
  {
    id: "interactive-sandbox",
    dimension: "Interactive coding environment",
    status: "implemented",
    evidence: "/sandbox",
    pattern: "Learners can experiment inside the platform before submitting evidence.",
  },
  {
    id: "credentials",
    dimension: "Verifiable evidence credentials",
    status: "implemented",
    evidence: "/verify/[id]",
    pattern: "QR-verifiable certificates include assessment, project and readiness evidence.",
  },
  {
    id: "operator-intelligence",
    dimension: "Instructor analytics and operations",
    status: "implemented",
    evidence: "/admin + /admin/gradebook + /admin/learners",
    pattern: "Staff can inspect learner performance, access, AI usage and audit events.",
  },
  {
    id: "multimodal-tutor",
    dimension: "Interactive multimodal tutor",
    status: "planned",
    evidence: "Not yet implemented",
    pattern: "Context-triggered diagrams, voice or visual explanations inside a lesson.",
  },
];

export function benchmarkSummary() {
  const implemented = benchmarkItems.filter((item) => item.status === "implemented").length;
  const partial = benchmarkItems.filter((item) => item.status === "partial").length;
  return {
    implemented,
    partial,
    planned: benchmarkItems.length - implemented - partial,
    total: benchmarkItems.length,
    coverage: Math.round(((implemented + partial * 0.5) / benchmarkItems.length) * 100),
  };
}
