export type CourseModule = {
  id: number;
  title: string;
  phase: string;
  level: "Foundation" | "Builder" | "Professional" | "Advanced";
  minutes: number;
  challenge: string;
};

const phaseData = [
  {
    phase: "Phase 1 · Developer Foundations",
    level: "Foundation" as const,
    titles: [
      "Introduction to Software Development",
      "Professional Developer Setup",
      "HTML5 Master Class",
      "CSS3 Master Class",
      "Responsive UI & UX Design",
    ],
  },
  {
    phase: "Phase 2 · JavaScript Engineering",
    level: "Builder" as const,
    titles: [
      "JavaScript Fundamentals",
      "Advanced JavaScript",
      "Data Structures & Algorithmic Thinking",
      "Git & GitHub Master Class",
      "TypeScript Master Class",
    ],
  },
  {
    phase: "Phase 3 · Modern Frontend",
    level: "Builder" as const,
    titles: ["React Fundamentals", "Advanced React", "Next.js Master Class"],
  },
  {
    phase: "Phase 4 · Backend & Data",
    level: "Professional" as const,
    titles: [
      "Node.js Engineering",
      "Express.js",
      "REST API Engineering",
      "Database Fundamentals",
      "MongoDB Master Class",
      "SQL & PostgreSQL Fundamentals",
    ],
  },
  {
    phase: "Phase 5 · Security, Cloud & Commerce",
    level: "Professional" as const,
    titles: [
      "Authentication Systems",
      "Role-Based Access Control",
      "Web Application Security",
      "File Upload Systems",
      "Cloud Storage",
      "Transactional Email",
      "Notification Architecture",
      "Payment Integration",
      "Subscriptions & Billing",
    ],
  },
  {
    phase: "Phase 6 · Production Engineering",
    level: "Professional" as const,
    titles: [
      "Admin Dashboard Engineering",
      "Software Testing",
      "Debugging Master Class",
      "Production Deployment",
      "Vercel Master Class",
      "CI/CD",
      "Domains & DNS",
    ],
  },
  {
    phase: "Phase 7 · AI & Agentic Engineering",
    level: "Advanced" as const,
    titles: [
      "Introduction to AI Applications",
      "Building AI Chat Applications",
      "Document AI",
      "RAG Systems",
      "AI Agents",
      "Research Agents",
      "Business Automation Agents",
    ],
  },
  {
    phase: "Phase 8 · SaaS & System Architecture",
    level: "Advanced" as const,
    titles: [
      "Real-Time Systems",
      "Building SaaS Products",
      "Multi-Tenant Systems",
      "Usage Tracking",
      "Software Architecture",
      "Design Patterns",
      "Performance Optimization",
      "Observability",
    ],
  },
  {
    phase: "Phase 9 · AI-Native Career Builder",
    level: "Advanced" as const,
    titles: [
      "Progressive Web Applications",
      "Professional Vibe Coding",
      "AI Code Review",
      "Developer Portfolio",
      "Technical Interviews",
      "Remote Work",
    ],
  },
  {
    phase: "Phase 10 · Tech Entrepreneurship",
    level: "Advanced" as const,
    titles: [
      "Finding Clients",
      "Software Pricing",
      "Client Management",
      "From Idea to Startup",
      "Software Monetization",
      "Launching Digital Products",
      "Agile Development",
      "Software Documentation",
    ],
  },
];

let id = 1;
export const courseModules: CourseModule[] = phaseData.flatMap((phase) =>
  phase.titles.map((title) => {
    const currentId = id++;
    return {
      id: currentId,
      title,
      phase: phase.phase,
      level: phase.level,
      minutes: 35 + ((currentId * 11) % 40),
      challenge: buildChallenge(title),
    };
  }),
);

function buildChallenge(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("html")) return "Ship an accessible multi-page profile site.";
  if (lower.includes("css") || lower.includes("ui")) return "Recreate a polished responsive product interface.";
  if (lower.includes("javascript")) return "Build an interactive productivity app without a framework.";
  if (lower.includes("react")) return "Build a reusable dashboard with real state and forms.";
  if (lower.includes("next")) return "Build a production-ready App Router application.";
  if (lower.includes("database") || lower.includes("mongo") || lower.includes("sql"))
    return "Model and query a real application's data layer.";
  if (lower.includes("auth") || lower.includes("security"))
    return "Protect a multi-role application and document the threat model.";
  if (lower.includes("payment") || lower.includes("billing"))
    return "Implement a verified checkout and entitlement flow.";
  if (lower.includes("agent") || lower.includes("ai") || lower.includes("rag"))
    return "Build an AI feature that uses tools, context and verifiable outputs.";
  if (lower.includes("saas")) return "Ship a multi-user SaaS MVP with usage limits.";
  if (lower.includes("deploy") || lower.includes("vercel") || lower.includes("ci"))
    return "Create a repeatable production delivery pipeline.";
  if (lower.includes("portfolio")) return "Publish evidence-based case studies for your strongest projects.";
  return "Turn this module into a demonstrable feature inside your capstone.";
}

export function getModule(id: number) {
  return courseModules.find((item) => item.id === id);
}

export const phases = phaseData.map((item) => item.phase);
