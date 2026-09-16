import { NextResponse } from "next/server";
import { callAI, parseJsonObject } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";
import { consumeAIQuota } from "@/lib/usage";

type StudyPlan = {
  summary: string;
  weeks: Array<{
    week: number;
    focus: string;
    moduleIds: number[];
    deliverable: string;
  }>;
  milestones: string[];
};

function fallbackPlan(remainingIds: number[], weeklyHours: number, weeks: number): StudyPlan {
  const pace = Math.max(1, Math.floor(weeklyHours / 2));
  const selected = remainingIds.slice(0, Math.max(weeks, weeks * pace));
  return {
    summary: "A project-first plan based on your remaining modules and available weekly time.",
    weeks: Array.from({ length: weeks }, (_, index) => {
      const moduleIds = selected.slice(index * pace, (index + 1) * pace);
      const titles = moduleIds.map((id) => courseModules.find((item) => item.id === id)?.title).filter(Boolean);
      return {
        week: index + 1,
        focus: titles.join(" + ") || "Portfolio consolidation",
        moduleIds,
        deliverable: moduleIds.length
          ? "Complete the listed modules and convert at least one lesson into runnable evidence."
          : "Improve a previous project using reviewer feedback.",
      };
    }),
    milestones: ["Ship weekly evidence", "Verify GitHub work", "Request automated grading", "Review job-readiness gaps"],
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDb();
  const plan = await db.collection(collections.studyPlans).findOne(
    { userId: user.id },
    { sort: { createdAt: -1 } },
  );
  return NextResponse.json({ plan: plan || null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const quota = await consumeAIQuota({
    subject: "user:" + user.id,
    user,
    feature: "study-plan",
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Daily AI study-plan allowance reached.", quota }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const goal = String(body.goal || "Become a job-ready full stack developer").slice(0, 500);
  const targetRole = String(body.targetRole || "Full Stack Developer").slice(0, 120);
  const weeklyHours = Math.max(2, Math.min(40, Number(body.weeklyHours || 6)));
  const weeks = Math.max(2, Math.min(24, Number(body.weeks || 8)));

  const db = await getDb();
  const completed = await db.collection(collections.progress)
    .find({ userId: user.id, status: "completed" })
    .project({ moduleId: 1 })
    .toArray();
  const completedSet = new Set(completed.map((row) => Number(row.moduleId)));
  const remaining = courseModules.filter((item) => !completedSet.has(item.id));
  const fallback = fallbackPlan(remaining.map((item) => item.id), weeklyHours, weeks);

  let plan: StudyPlan | null = null;
  try {
    const ai = await callAI([
      {
        role: "system",
        content:
          "You are the Full Stack Master Class study planner. Produce strict JSON only with summary, weeks and milestones. " +
          "weeks must be an array of objects with week, focus, moduleIds and deliverable. Use only module IDs supplied. " +
          "Prioritize prerequisites, project evidence and sustainable workload.",
      },
      {
        role: "user",
        content:
          "Goal: " + goal +
          "\nTarget role: " + targetRole +
          "\nWeekly hours: " + weeklyHours +
          "\nPlan length: " + weeks + " weeks" +
          "\nRemaining modules:\n" +
          remaining.map((item) => item.id + ": " + item.title + " — " + item.challenge).join("\n"),
      },
    ]);
    plan = parseJsonObject<StudyPlan>(ai);
  } catch {
    plan = null;
  }

  const finalPlan = plan?.weeks?.length ? plan : fallback;
  const stored = {
    userId: user.id,
    goal,
    targetRole,
    weeklyHours,
    requestedWeeks: weeks,
    ...finalPlan,
    createdAt: new Date(),
  };
  await db.collection(collections.studyPlans).insertOne(stored);
  return NextResponse.json({ plan: stored, quota });
}
