import { NextResponse } from "next/server";
import { callAI, getAIErrorCode, getAIStatus } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentMemories, saveAgentMemory } from "@/lib/memory";
import { retrieveCourseContextHybrid } from "@/lib/rag";
import { requestFingerprint } from "@/lib/security";
import { consumeAIQuota } from "@/lib/usage";

type AgentMode = "tutor" | "code-review" | "project-coach" | "quiz" | "career";

const personas: Record<AgentMode, string> = {
  tutor:
    "You are a rigorous full-stack mentor. Diagnose misunderstanding first. Teach with a short explanation, a concrete example, then one check-for-understanding question. For production examples, use secure server-verified authentication and authorization, reuse persistent database connections, validate inputs, and label shortcuts as educational only. Do not overwhelm the learner.",
  "code-review":
    "You are a senior code reviewer. Identify correctness, security, maintainability and performance issues. Explain why each issue matters. Prefer targeted changes over rewriting everything. Treat client-controlled roles, unsigned cookies, missing input validation, leaked secrets and per-request database clients as production defects.",
  "project-coach":
    "You are a technical product coach. Turn the learner's idea into the smallest secure shippable vertical slice. Give a clear build order, acceptance criteria and one stretch goal. Never call an unsigned client-controlled role cookie production-ready; enforce authorization at the server/API/data boundary and use server-verified sessions or tokens.",
  quiz:
    "You are a Socratic quiz master. Test application and reasoning, not trivia. Ask one challenging question at a time and include what a strong answer must demonstrate.",
  career:
    "You are a developer career agent. Convert the learner's technical work into verifiable portfolio evidence, strong case-study bullets and a practical next opportunity.",
};

function fallback(mode: AgentMode, message: string, context: string) {
  const base = {
    tutor:
      "Separate what you know from what you are assuming. Reproduce the problem in the smallest example, inspect the data entering the failing step, then explain the expected result before changing code.",
    "code-review":
      "Review this in four passes: correctness, security, maintainability and failure handling. Confirm inputs and outputs, test edge cases, remove duplicated responsibility and make errors explicit.",
    "project-coach":
      "Reduce the idea to one secure vertical slice a user can complete end-to-end. Define the user action, required data, server-side authorization, success state and one failure state. Ship that before adding breadth.",
    quiz:
      "Challenge: explain how you would prove this feature works in production, covering expected behaviour, one edge case, one failure case and how you would observe the result.",
    career:
      "Turn the work into evidence: problem → engineering decision → implementation → measurable result → live proof. A strong portfolio entry demonstrates reasoning, not screenshots alone.",
  }[mode];

  return base + "\n\nCurrent context: " + context + "\n\nYour request: " + message.slice(0, 900);
}

function nextActions(mode: AgentMode) {
  const map: Record<AgentMode, string[]> = {
    tutor: ["Explain it back", "Build a tiny example", "Test one edge case"],
    "code-review": ["Run the smallest failing case", "Fix highest-risk issue", "Add a regression test"],
    "project-coach": ["Define acceptance criteria", "Build vertical slice", "Deploy preview"],
    quiz: ["Answer without notes", "Justify the trade-off", "Ask for the next question"],
    career: ["Capture live proof", "Write the case study", "Publish the repository"],
  };
  return map[mode];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode: AgentMode = Object.keys(personas).includes(body.mode) ? body.mode : "tutor";
  const message = String(body.message || "").trim();
  const context = String(body.context || "General Full Stack Master Class context.");

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const aiConfig = getAIStatus();
  const user = await getCurrentUser();
  const quota = await consumeAIQuota({
    subject: user ? "user:" + user.id : "anon:" + requestFingerprint(request),
    user,
    feature: "mentor",
  });

  if (!quota.allowed) {
    return NextResponse.json({
      reply:
        "You have reached today's AI mentor allowance. Continue with the module challenge and return after the daily reset, or use a paid Master Class account for a larger allowance.",
      nextActions: ["Continue the build challenge", "Review previous mentor notes", "Upgrade access"],
      source: "quota-guard",
      retrievedModules: [],
      memoryEnabled: Boolean(user),
      aiStatus: "fallback",
      aiErrorCode: "daily-ai-limit",
      aiProvider: aiConfig.provider,
      aiModel: aiConfig.model,
      aiConfiguredInAgentRuntime: aiConfig.configured,
      quota,
    });
  }
  const retrieval = await retrieveCourseContextHybrid(message + " " + context, 4);
  const memories = user ? await loadAgentMemories(user.id, 5) : [];

  const grounding = retrieval
    .map((item) => "Module " + item.moduleId + " — " + item.title + ": " + item.challenge + " " + item.guidance)
    .join("\n");
  const memoryContext = memories
    .map((item) => item.summary || item.learnerMessage)
    .filter(Boolean)
    .join("\n");

  let reply: string | null = null;
  let aiErrorCode: string | null = null;

  try {
    reply = await callAI(
      [
        {
          role: "system",
          content:
            personas[mode] +
            "\nYou are part of the Full Stack Master Class mentor swarm. Ground answers in the retrieved course context. " +
            "Use learner memory only when relevant. Never claim code ran unless evidence confirms it. " +
            "For production examples: never trust unsigned client cookies for authorization, validate input, reuse the shared database helper instead of opening a new MongoClient per request, keep secrets server-only, and distinguish demo shortcuts from production patterns. " +
            "Return clean GitHub-flavored Markdown without escaping Markdown syntax. Keep the learner building." +
            "\n\nRetrieved course context:\n" +
            grounding +
            "\n\nRelevant learner memory:\n" +
            (memoryContext || "No persistent memory yet.") +
            "\n\nCurrent screen context:\n" +
            context,
        },
        { role: "user", content: message },
      ],
      { temperature: mode === "quiz" ? 0.45 : 0.25 },
    );
  } catch (error) {
    aiErrorCode = getAIErrorCode(error);
    reply = null;
  }

  if (!reply && !aiErrorCode) {
    aiErrorCode = aiConfig.configured
      ? "empty-provider-result"
      : "not-configured-in-agent-runtime";
  }

  const finalReply = reply || fallback(mode, message, context);

  if (user) {
    await saveAgentMemory({
      userId: user.id,
      scope: mode,
      summary: mode + " interaction about " + message.slice(0, 180),
      learnerMessage: message,
      agentReply: finalReply,
      tags: retrieval.map((item) => "module-" + item.moduleId),
      importance: mode === "career" || mode === "code-review" ? 2 : 1,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    reply: finalReply,
    nextActions: nextActions(mode),
    source: reply ? "live-ai-rag-memory" : "built-in-coach",
    retrievedModules: retrieval.map((item) => item.moduleId),
    memoryEnabled: Boolean(user),
    aiStatus: reply ? "live" : "fallback",
    aiErrorCode,
    aiProvider: aiConfig.provider,
    aiModel: aiConfig.model,
    aiConfiguredInAgentRuntime: aiConfig.configured,
    quota,
  });
}
