import { NextResponse } from "next/server";

type AgentMode = "tutor" | "code-review" | "project-coach" | "quiz" | "career";

const personas: Record<AgentMode, string> = {
  tutor:
    "You are a rigorous full-stack mentor. Diagnose misunderstanding first. Teach with a short explanation, a concrete example, then one check-for-understanding question. Do not overwhelm the learner.",
  "code-review":
    "You are a senior code reviewer. Identify correctness, security, maintainability and performance issues. Explain why each issue matters. Prefer targeted changes over rewriting everything.",
  "project-coach":
    "You are a technical product coach. Turn the learner's idea into the smallest shippable vertical slice. Give a clear build order, acceptance criteria and one stretch goal.",
  quiz:
    "You are a Socratic quiz master. Test application and reasoning, not trivia. Ask one challenging question at a time and include what a strong answer must demonstrate.",
  career:
    "You are a developer career agent. Convert the learner's technical work into verifiable portfolio evidence, strong case-study bullets and a practical next opportunity.",
};

function fallback(mode: AgentMode, message: string, context: string) {
  const base = {
    tutor:
      "Start by separating what you know from what you are assuming. Reproduce the problem in the smallest example, inspect the data flowing into the failing step, and explain the expected result before changing code.",
    "code-review":
      "Review this in four passes: correctness, security, maintainability and failure handling. First confirm inputs and outputs, then test edge cases, then remove duplicated responsibility, then make errors explicit.",
    "project-coach":
      "Reduce the idea to one vertical slice that a user can complete end-to-end. Define the user action, data required, success state and one failure state. Ship that before adding breadth.",
    quiz:
      "Challenge: explain how you would prove that this feature works in production—not just locally. Your answer should cover expected behaviour, one edge case, one failure case and how you would observe the result.",
    career:
      "Turn this work into evidence: problem → engineering decision → implementation → measurable result → live proof. A strong portfolio entry shows your reasoning, not only screenshots.",
  }[mode];

  return base + "\n\nCurrent context: " + context + "\n\nYour request: " + message.slice(0, 600);
}

function nextActions(mode: AgentMode) {
  const map: Record<AgentMode, string[]> = {
    tutor: ["Explain it back", "Build a tiny example", "Test one edge case"],
    "code-review": ["Run the smallest failing case", "Fix highest-risk issue", "Add a regression test"],
    "project-coach": ["Define acceptance criteria", "Build vertical slice", "Deploy preview"],
    quiz: ["Answer without notes", "Justify the trade-off", "Ask for the next question"],
    career: ["Capture a screenshot", "Write the case study", "Publish live proof"],
  };
  return map[mode];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode: AgentMode = Object.keys(personas).includes(body.mode)
    ? body.mode
    : "tutor";
  const message = String(body.message || "").trim();
  const context = String(body.context || "General Full Stack Master Class context.");

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_MODEL;
  const baseUrl = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";

  if (!apiKey || !model) {
    return NextResponse.json({
      reply: fallback(mode, message, context),
      nextActions: nextActions(mode),
      source: "built-in-coach",
    });
  }

  try {
    const response = await fetch(baseUrl.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              personas[mode] +
              "\nYou are part of the Full Stack Master Class mentor swarm. " +
              "Keep advice project-based, production-aware, concise and safe. " +
              "Never pretend code ran when it did not. Course context: " +
              context,
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Gateway request failed with " + response.status);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    return NextResponse.json({
      reply: reply || fallback(mode, message, context),
      nextActions: nextActions(mode),
      source: "live-ai",
    });
  } catch {
    return NextResponse.json({
      reply: fallback(mode, message, context),
      nextActions: nextActions(mode),
      source: "fallback-after-provider-error",
    });
  }
}
