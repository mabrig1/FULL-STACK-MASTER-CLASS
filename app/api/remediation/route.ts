import { NextResponse } from "next/server";
import { callAI, getAIStatus, parseJsonObject } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/course";
import { getCourseContent } from "@/lib/content";
import { collections, getDb } from "@/lib/db";
import { recordAgentTrace } from "@/lib/agent-observability";
import { consumeAIQuota } from "@/lib/usage";

type RemediationPlan = {
  diagnosis: string;
  microLesson: string;
  workedExample: string;
  actions: string[];
  exitTicket: {
    question: string;
    successCriteria: string;
  };
};

function fallbackPlan(moduleTitle: string, weakConcepts: string[]): RemediationPlan {
  return {
    diagnosis:
      "The latest evidence shows incomplete mastery in " +
      (weakConcepts.length ? weakConcepts.join(", ") : moduleTitle) +
      ". Focus on one concept at a time before advancing.",
    microLesson:
      "Re-state the concept in your own words, identify the input and expected output, then build the smallest example that demonstrates the rule.",
    workedExample:
      "Take one realistic case from the module, trace it step by step, then deliberately break one assumption and explain the resulting failure.",
    actions: [
      "Review the exact failed concept, not the whole module.",
      "Build one minimal example from scratch without copying the lesson.",
      "Test one happy path and one failure path, then explain what changed.",
    ],
    exitTicket: {
      question:
        "Explain the weak concept in your own words and show one concrete example that proves you can apply it.",
      successCriteria:
        "The explanation is accurate, the example runs or is otherwise verifiable, and one failure case is identified.",
    },
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const moduleId = Number(body.moduleId);
  const module = getModule(moduleId);
  if (!module) return NextResponse.json({ error: "Invalid module." }, { status: 404 });

  const quota = await consumeAIQuota({
    subject: "user:" + user.id,
    user,
    feature: "practice",
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Daily remediation allowance reached.", quota }, { status: 429 });
  }

  const db = await getDb();
  const [content, latestPractice, latestAssessment, weakRows] = await Promise.all([
    getCourseContent(moduleId),
    db.collection(collections.practiceSessions)
      .find({ userId: user.id, moduleId, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(1)
      .next(),
    db.collection(collections.assessmentAttempts)
      .find({ userId: user.id, moduleId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next(),
    db.collection(collections.conceptMastery)
      .find({ userId: user.id, moduleId, mastery: { $lt: 70 } })
      .sort({ mastery: 1 })
      .limit(6)
      .toArray(),
  ]);

  const weakConcepts = weakRows.map((row) => String(row.skillTag || "")).filter(Boolean);
  const practiceMisses =
    latestPractice && Array.isArray(latestPractice.questions) && Array.isArray(latestPractice.answers)
      ? latestPractice.questions
          .map((item: any, index: number) => ({
            skillTag: String(item.skillTag || ""),
            question: String(item.question || ""),
            selected: String(latestPractice.answers?.[index] || ""),
            answer: String(item.answer || ""),
            correct: String(latestPractice.answers?.[index] || "") === String(item.answer || ""),
          }))
          .filter((item: any) => !item.correct)
      : [];

  const assessmentMisses =
    latestAssessment && Array.isArray(latestAssessment.answers)
      ? content.quiz
          .map((item, index) => ({
            question: item.question,
            selected: String(latestAssessment.answers?.[index] || ""),
            answer: item.answer,
            correct: String(latestAssessment.answers?.[index] || "") === item.answer,
          }))
          .filter((item) => !item.correct)
      : [];

  let plan: RemediationPlan | null = null;
  let live = false;

  try {
    const raw = await callAI([
      {
        role: "system",
        content:
          "You are a remediation tutor for software engineering. Diagnose the narrowest learning gap and create a short recovery intervention. " +
          "Return JSON only as {diagnosis:string,microLesson:string,workedExample:string,actions:string[],exitTicket:{question:string,successCriteria:string}}. " +
          "Do not reteach the entire module. Prefer one worked example, one misconception correction, and a verifiable exit ticket.",
      },
      {
        role: "user",
        content:
          "Module: " + module.title +
          "\nLesson summary: " + content.summary +
          "\nWeak concept tags: " + (weakConcepts.join(", ") || "none recorded") +
          "\nLatest adaptive-practice misses:\n" +
          practiceMisses.map((item: any) =>
            "- " + item.question + " | selected: " + item.selected + " | correct: " + item.answer
          ).join("\n").slice(0, 6000) +
          "\nLatest assessment misses:\n" +
          assessmentMisses.map((item) =>
            "- " + item.question + " | selected: " + item.selected + " | correct: " + item.answer
          ).join("\n").slice(0, 6000),
      },
    ], { temperature: 0.2, maxTokens: 1700 });

    const parsed = parseJsonObject<RemediationPlan>(raw);
    if (
      parsed?.diagnosis &&
      parsed?.microLesson &&
      parsed?.workedExample &&
      Array.isArray(parsed.actions) &&
      parsed?.exitTicket?.question
    ) {
      plan = {
        diagnosis: String(parsed.diagnosis).slice(0, 1800),
        microLesson: String(parsed.microLesson).slice(0, 3500),
        workedExample: String(parsed.workedExample).slice(0, 3500),
        actions: parsed.actions.slice(0, 5).map((item) => String(item).slice(0, 1000)),
        exitTicket: {
          question: String(parsed.exitTicket.question).slice(0, 1800),
          successCriteria: String(parsed.exitTicket.successCriteria || "").slice(0, 1800),
        },
      };
      live = true;
    }
  } catch {
    plan = null;
  }

  if (!plan) plan = fallbackPlan(module.title, weakConcepts);

  const result = await db.collection(collections.remediationPlans).insertOne({
    userId: user.id,
    moduleId,
    weakConcepts,
    source: {
      practiceScore: latestPractice?.score ?? null,
      assessmentScore: latestAssessment?.score ?? null,
    },
    plan,
    status: "active",
    createdAt: new Date(),
  });

  const aiStatus = getAIStatus();
  await recordAgentTrace({
    userId: user.id,
    kind: "remediation",
    mode: "recovery",
    input: "Build remediation plan for Module " + moduleId + ": " + module.title,
    output: plan.diagnosis + "\n" + plan.microLesson,
    status: live ? "live" : "fallback",
    latencyMs: Date.now() - startedAt,
    provider: aiStatus.provider,
    model: aiStatus.model,
    retrievedModules: [moduleId],
    metadata: {
      weakConcepts,
      practiceScore: latestPractice?.score ?? null,
      assessmentScore: latestAssessment?.score ?? null,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    id: result.insertedId.toString(),
    moduleId,
    moduleTitle: module.title,
    weakConcepts,
    plan,
    live,
    quota,
  });
}
