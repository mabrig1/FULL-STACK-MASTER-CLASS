import { NextResponse } from "next/server";
import { callAI, parseJsonObject } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentMemories, saveAgentMemory } from "@/lib/memory";
import { retrieveCourseContextHybrid } from "@/lib/rag";
import { consumeAIQuota } from "@/lib/usage";
import { computeAdaptiveState } from "@/lib/mastery";

type Specialist = "diagnostician" | "architect" | "builder" | "reviewer" | "evaluator" | "career";

const specialistPrompts: Record<Specialist, string> = {
  diagnostician:
    "Diagnose the learner's actual knowledge or implementation gap. Separate symptoms, assumptions, missing evidence and likely root causes. End with the single highest-value next test.",
  architect:
    "Convert the goal into a technically sound architecture and execution sequence. Keep scope small, define boundaries, data flow, security concerns and acceptance criteria.",
  builder:
    "Act as implementation coach. Produce the smallest vertical slice, ordered steps, concrete interfaces and testable completion criteria. Do not pretend to execute code.",
  reviewer:
    "Act as senior reviewer. Attack the proposed solution for correctness, security, reliability, maintainability and missing tests. Prioritize the top risks.",
  evaluator:
    "Act as an independent evaluator. Decide what evidence would prove the task is complete, identify unsupported claims, define pass/fail verification gates and require human-checkable outputs.",
  career:
    "Convert the work into portfolio and job-readiness evidence: what to demonstrate, metrics to capture, README proof and interview talking points.",
};

function defaultRoute(task: string): Specialist[] {
  const lower = task.toLowerCase();
  if (/bug|error|fail|debug|broken/.test(lower)) return ["diagnostician", "builder", "reviewer"];
  if (/job|career|portfolio|interview/.test(lower)) return ["diagnostician", "career", "reviewer"];
  if (/architecture|system|saas|design/.test(lower)) return ["architect", "builder", "reviewer"];
  return ["diagnostician", "builder", "reviewer"];
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const quota = await consumeAIQuota({
    subject: "user:" + user.id,
    user,
    feature: "orchestrator",
  });
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Daily orchestrator allowance reached.",
        quota,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const effort = ["lite", "balanced", "deep"].includes(String(body.effort))
    ? String(body.effort)
    : "balanced";
  const task = String(body.task || "").trim().slice(0, 8000);
  if (!task) return NextResponse.json({ error: "Give the orchestrator a goal or problem." }, { status: 400 });

  const retrieval = await retrieveCourseContextHybrid(task, effort === "deep" ? 8 : 5);
  const memories = await loadAgentMemories(user.id, effort === "deep" ? 10 : 6);
  const adaptive = await computeAdaptiveState(user.id).catch(() => null);
  const ground = retrieval.map((item) => "M" + item.moduleId + " " + item.title + ": " + item.challenge).join("\n");
  const memory = memories.map((item) => item.summary).filter(Boolean).join("\n");
  const masteryContext = adaptive
    ? "Recommended action: " +
      (adaptive.recommendation
        ? adaptive.recommendation.type + " M" + adaptive.recommendation.moduleId + " " + adaptive.recommendation.title
        : "none") +
      ". Cognitive load: " + adaptive.cognitiveLoad.level + " (" + adaptive.cognitiveLoad.score + "/100). " +
      "Intervention: " + adaptive.cognitiveLoad.intervention
    : "No adaptive learner state available.";

  let route = defaultRoute(task);
  let supervisorGoal = "Move the learner to the smallest verified next outcome.";
  try {
    const supervisor = await callAI([
      {
        role: "system",
        content:
          "You supervise a developer-learning multi-agent system. Select specialists from diagnostician, architect, builder, reviewer, evaluator, career. " +
          "Return JSON only: {route:[...], goal:string}. Prefer the smallest route that can solve the request. " +
          "Always include evaluator for deep effort. Adjust task breadth if learner cognitive load is high.",
      },
      { role: "user", content: "Effort: " + effort + "\nTask: " + task + "\nCourse context:\n" + ground + "\nMemory:\n" + memory + "\nLearner state:\n" + masteryContext },
    ]);
    const decision = parseJsonObject<{ route?: Specialist[]; goal?: string }>(supervisor);
    const allowed = (decision?.route || []).filter((item): item is Specialist => item in specialistPrompts);
    const maxAgents = effort === "lite" ? 2 : effort === "deep" ? 4 : 3;
    if (allowed.length >= 2) route = allowed.slice(0, maxAgents);
    if (effort === "deep" && !route.includes("evaluator")) {
      route = [...route.slice(0, 3), "evaluator"];
    }
    if (decision?.goal) supervisorGoal = decision.goal.slice(0, 500);
  } catch {}

  const traces: Array<{ agent: Specialist; output: string; live: boolean }> = [];
  let accumulated = "";

  for (const agent of route) {
    let output: string | null = null;
    try {
      output = await callAI([
        {
          role: "system",
          content:
            specialistPrompts[agent] +
            "\nYou are one specialist in a supervised Full Stack Master Class workflow. " +
            "Ground your work in the course context and learner mastery state. Use previous specialist output as input, but challenge it where necessary. " +
            "Do not expand task scope when cognitive load is high; reduce to one verifiable vertical slice.",
        },
        {
          role: "user",
          content:
            "Supervisor goal: " + supervisorGoal +
            "\nOriginal learner task: " + task +
            "\nCourse context:\n" + ground +
            "\nRelevant learner memory:\n" + (memory || "None") +
            "\nAdaptive learner state:\n" + masteryContext +
            "\nPrevious specialist work:\n" + (accumulated || "None yet"),
        },
      ]);
    } catch {
      output = null;
    }

    const fallback =
      agent.toUpperCase() + ": " +
      specialistPrompts[agent] +
      " Apply this to the learner task, produce one concrete next action, and require visible evidence before marking it complete.";
    const finalOutput = output || fallback;
    traces.push({ agent, output: finalOutput, live: Boolean(output) });
    accumulated += "\n\n[" + agent + "]\n" + finalOutput;
  }

  let synthesis: string | null = null;
  try {
    synthesis = await callAI([
      {
        role: "system",
        content:
          "You are the supervisor. Synthesize specialist outputs into one decisive learning mission. " +
          "Return concise sections: Mission, Build Order, Verification Gates, Definition of Done, Next Review. Resolve contradictions and preserve independent evaluator concerns."
      },
      { role: "user", content: "Task: " + task + "\nSpecialist traces:\n" + accumulated },
    ]);
  } catch {
    synthesis = null;
  }

  const finalSynthesis =
    synthesis ||
    "Mission: solve the task through a small verifiable build.\n\nBuild Order: follow the specialist sequence above.\n\nVerification Gates: require runnable behaviour, repository evidence and at least one failure test.\n\nDefinition of Done: another developer can reproduce the result from the evidence.";

  await saveAgentMemory({
    userId: user.id,
    scope: "orchestrator",
    summary: "Orchestrated task: " + task.slice(0, 220),
    learnerMessage: task,
    agentReply: finalSynthesis,
    tags: ["orchestrated", ...retrieval.map((item) => "module-" + item.moduleId)],
    importance: 3,
  }).catch(() => undefined);

  return NextResponse.json({
    route,
    supervisorGoal,
    retrievedModules: retrieval.map((item) => item.moduleId),
    traces,
    synthesis: finalSynthesis,
    liveAgents: traces.filter((item) => item.live).length,
    quota,
    effort,
    adaptive: adaptive
      ? {
          recommendation: adaptive.recommendation,
          cognitiveLoad: adaptive.cognitiveLoad,
        }
      : null,
  });
}
