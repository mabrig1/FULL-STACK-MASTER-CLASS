import { collections, getDb, isDatabaseConfigured } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

type Feature = "mentor" | "orchestrator" | "study-plan" | "grading" | "practice";

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function aiLimitFor(user: SessionUser | null, feature: Feature) {
  const staff = user?.role === "admin" || user?.role === "instructor";
  if (staff) return feature === "orchestrator" ? 80 : 500;

  if (user?.plan === "masterclass") {
    if (feature === "orchestrator") return 20;
    if (feature === "grading") return 40;
    if (feature === "practice") return 60;
    return 150;
  }

  if (feature === "orchestrator") return 1;
  if (feature === "grading") return 2;
  if (feature === "practice") return user ? 8 : 2;
  return user ? 10 : 3;
}

export async function consumeAIQuota(input: {
  subject: string;
  user: SessionUser | null;
  feature: Feature;
}) {
  const limit = aiLimitFor(input.user, input.feature);
  const date = dayKey();
  const resetAt = new Date(date + "T00:00:00.000Z");
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);

  if (!isDatabaseConfigured()) {
    return { allowed: true, count: 0, limit, remaining: limit, resetAt };
  }

  const db = await getDb();
  const id = input.subject + ":" + input.feature + ":" + date;

  await db.collection(collections.aiUsage).updateOne(
    { _id: id as any },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        subject: input.subject,
        userId: input.user?.id || null,
        plan: input.user?.plan || "anonymous",
        feature: input.feature,
        date,
        createdAt: new Date(),
        expiresAt: new Date(resetAt.getTime() + 90 * 24 * 60 * 60 * 1000),
      },
      $set: { lastUsedAt: new Date() },
    },
    { upsert: true },
  );

  const row = await db.collection(collections.aiUsage).findOne({ _id: id as any });
  const count = Number(row?.count || 1);

  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
