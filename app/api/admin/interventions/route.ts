import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

function daysSince(value: Date | string | null | undefined) {
  if (!value) return 999;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

export async function GET() {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const db = await getDb();
  const learners = await db.collection(collections.users)
    .find({ role: "student" })
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();

  const userIds = learners.map((row) => row._id.toString());
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [progress, assessments, practice, traces, weakConcepts] = await Promise.all([
    db.collection(collections.progress).find({ userId: { $in: userIds } }).toArray(),
    db.collection(collections.assessmentAttempts)
      .find({ userId: { $in: userIds }, createdAt: { $gte: fourteenDaysAgo } })
      .toArray(),
    db.collection(collections.practiceSessions)
      .find({ userId: { $in: userIds }, status: "completed", completedAt: { $gte: fourteenDaysAgo } })
      .toArray(),
    db.collection(collections.agentTraces)
      .find({ userId: { $in: userIds }, createdAt: { $gte: fourteenDaysAgo } })
      .toArray(),
    db.collection(collections.conceptMastery)
      .find({ userId: { $in: userIds }, mastery: { $lt: 50 } })
      .toArray(),
  ]);

  function group(rows: any[]) {
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const id = String(row.userId || "");
      if (!id) continue;
      map.set(id, [...(map.get(id) || []), row]);
    }
    return map;
  }

  const progressMap = group(progress);
  const assessmentMap = group(assessments);
  const practiceMap = group(practice);
  const traceMap = group(traces);
  const conceptMap = group(weakConcepts);

  const rows = learners.map((learner) => {
    const userId = learner._id.toString();
    const userProgress = progressMap.get(userId) || [];
    const userAssessments = assessmentMap.get(userId) || [];
    const userPractice = practiceMap.get(userId) || [];
    const userTraces = traceMap.get(userId) || [];
    const userConcepts = conceptMap.get(userId) || [];

    const activityDates = [
      learner.createdAt,
      ...userProgress.map((row) => row.updatedAt || row.createdAt),
      ...userAssessments.map((row) => row.createdAt),
      ...userPractice.map((row) => row.completedAt || row.createdAt),
      ...userTraces.map((row) => row.createdAt),
    ].filter(Boolean);
    const lastActivity = activityDates.length
      ? new Date(Math.max(...activityDates.map((value) => new Date(value).getTime())))
      : new Date(learner.createdAt || 0);

    const inactiveDays = daysSince(lastActivity);
    const failed = userAssessments.filter((row) => !row.passed).length;
    const averageAssessment = userAssessments.length
      ? Math.round(userAssessments.reduce((sum, row) => sum + Number(row.score || 0), 0) / userAssessments.length)
      : null;
    const averagePractice = userPractice.length
      ? Math.round(userPractice.reduce((sum, row) => sum + Number(row.score || 0), 0) / userPractice.length)
      : null;
    const completedModules = userProgress.filter((row) => row.status === "completed").length;
    const fallbackRate = userTraces.length
      ? Math.round((userTraces.filter((row) => row.status === "fallback").length / userTraces.length) * 100)
      : 0;

    let riskScore = 0;
    const reasons: string[] = [];

    if (inactiveDays >= 14) {
      riskScore += 35;
      reasons.push("No learning activity for " + inactiveDays + " days.");
    } else if (inactiveDays >= 7) {
      riskScore += 20;
      reasons.push("Learning activity has slowed for " + inactiveDays + " days.");
    }

    if (failed >= 2) {
      riskScore += 20;
      reasons.push(failed + " failed assessments in the last 14 days.");
    }

    if (averageAssessment !== null && averageAssessment < 60) {
      riskScore += 20;
      reasons.push("Assessment average is " + averageAssessment + "%.");
    } else if (averageAssessment !== null && averageAssessment < 70) {
      riskScore += 10;
      reasons.push("Assessment average is below the mastery threshold.");
    }

    if (averagePractice !== null && averagePractice < 60) {
      riskScore += 15;
      reasons.push("Adaptive-practice average is " + averagePractice + "%.");
    }

    if (userConcepts.length >= 3) {
      riskScore += 10;
      reasons.push(userConcepts.length + " unresolved weak concepts.");
    }

    if (userTraces.length >= 3 && fallbackRate >= 50) {
      riskScore += 10;
      reasons.push("AI interactions are falling back " + fallbackRate + "% of the time.");
    }

    if (completedModules === 0 && daysSince(learner.createdAt) >= 7) {
      riskScore += 10;
      reasons.push("No completed module after the first week.");
    }

    riskScore = Math.min(100, riskScore);
    const level = riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";

    const intervention =
      level === "high"
        ? "Contact the learner, reduce the next task to one recoverable concept, and assign a remediation workout."
        : level === "medium"
          ? "Send a targeted nudge and recommend the weakest module or due review."
          : "No intervention required; continue normal adaptive progression.";

    return {
      userId,
      name: String(learner.name || "Learner"),
      email: String(learner.email || ""),
      plan: String(learner.plan || "free"),
      riskScore,
      level,
      reasons,
      intervention,
      signals: {
        inactiveDays,
        failedAssessments14d: failed,
        averageAssessment,
        averagePractice,
        completedModules,
        weakConcepts: userConcepts.length,
        fallbackRate,
      },
      lastActivity,
    };
  }).sort((a, b) => b.riskScore - a.riskScore || b.signals.inactiveDays - a.signals.inactiveDays);

  return NextResponse.json({
    learners: rows,
    summary: {
      total: rows.length,
      high: rows.filter((row) => row.level === "high").length,
      medium: rows.filter((row) => row.level === "medium").length,
      low: rows.filter((row) => row.level === "low").length,
    },
  });
}

export async function POST(request: Request) {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const title = String(body.title || "Learning support").trim().slice(0, 160);
  const message = String(body.message || "").trim().slice(0, 1200);
  const href = String(body.href || "/adaptive").trim().slice(0, 500);

  if (!userId || message.length < 8) {
    return NextResponse.json({ error: "Learner and intervention message are required." }, { status: 400 });
  }

  const db = await getDb();
  const learner = await db.collection(collections.users).findOne({ _id: new (await import("mongodb")).ObjectId(userId) }).catch(() => null);
  if (!learner) return NextResponse.json({ error: "Learner not found." }, { status: 404 });

  await createNotification({
    userId,
    title,
    body: message,
    href,
    type: "intervention",
  });

  return NextResponse.json({ sent: true });
}
