export type AgentSkillId =
  | "debugging"
  | "security-review"
  | "test-design"
  | "architecture"
  | "deployment"
  | "api-design"
  | "learning-coach"
  | "career-evidence";

export type AgentSkill = {
  id: AgentSkillId;
  label: string;
  instructions: string;
};

const skills: Record<AgentSkillId, AgentSkill> = {
  debugging: {
    id: "debugging",
    label: "Evidence-Driven Debugging",
    instructions:
      "Reproduce the smallest failing case. Separate known facts from assumptions. Trace inputs, outputs and boundaries before proposing code changes. Require a regression check.",
  },
  "security-review": {
    id: "security-review",
    label: "Security Review",
    instructions:
      "Inspect trust boundaries, authentication, authorization, input validation, secret handling, data exposure and failure modes. Do not call client-only checks security controls.",
  },
  "test-design": {
    id: "test-design",
    label: "Test Design",
    instructions:
      "Define observable behaviour, happy path, edge cases, failure paths and regression tests. Prefer small deterministic checks over broad vague testing advice.",
  },
  architecture: {
    id: "architecture",
    label: "Architecture Reasoning",
    instructions:
      "Identify responsibilities, interfaces, data flow, state ownership, scalability limits and operational risks. Prefer the smallest architecture that satisfies current requirements.",
  },
  deployment: {
    id: "deployment",
    label: "Production Delivery",
    instructions:
      "Check environment variables, build/runtime differences, CI, deployment logs, health checks, DNS and rollback evidence. Distinguish build-time from runtime failures.",
  },
  "api-design": {
    id: "api-design",
    label: "API Design",
    instructions:
      "Clarify resource boundaries, request/response contracts, validation, authorization, idempotency, errors and observability. Keep contracts explicit and testable.",
  },
  "learning-coach": {
    id: "learning-coach",
    label: "Adaptive Learning Coach",
    instructions:
      "Use learner mastery and cognitive-load signals. Prefer retrieval practice over re-explaining when the learner already has partial mastery. Reduce difficulty when overload signals are high.",
  },
  "career-evidence": {
    id: "career-evidence",
    label: "Career Evidence",
    instructions:
      "Turn technical work into verifiable evidence: problem, engineering decision, implementation, tests, deployment and measurable result. Avoid inflated claims.",
  },
};

export function selectAgentSkill(mode: string, message: string): AgentSkill {
  const lower = message.toLowerCase();
  if (/security|auth|permission|role|token|secret|vulnerab/.test(lower)) return skills["security-review"];
  if (/test|coverage|edge case|regression|assert/.test(lower)) return skills["test-design"];
  if (/deploy|vercel|production|build|dns|runtime|environment/.test(lower)) return skills.deployment;
  if (/api|rest|endpoint|route|webhook/.test(lower)) return skills["api-design"];
  if (/architecture|system|scale|saas|tenant|design/.test(lower)) return skills.architecture;
  if (/bug|debug|error|fail|broken|issue/.test(lower)) return skills.debugging;
  if (mode === "career") return skills["career-evidence"];
  return skills["learning-coach"];
}

export function allAgentSkills() {
  return Object.values(skills);
}
