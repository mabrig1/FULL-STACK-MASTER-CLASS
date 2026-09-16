import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDb();
  const attempts = await db.collection(collections.assessmentAttempts)
    .find({ userId: user.id })
    .sort({ createdAt: -1 })
    .toArray();

  const best = new Map<number, any>();
  for (const attempt of attempts) {
    const moduleId = Number(attempt.moduleId);
    const existing = best.get(moduleId);
    if (!existing || Number(attempt.score) > Number(existing.score)) best.set(moduleId, attempt);
  }

  const records = Array.from(best.values())
    .map((row) => {
      const module = courseModules.find((item) => item.id === Number(row.moduleId));
      return {
        moduleId: Number(row.moduleId),
        title: module?.title || "Module " + row.moduleId,
        score: Number(row.score || 0),
        passed: Boolean(row.passed),
        attempts: attempts.filter((item) => Number(item.moduleId) === Number(row.moduleId)).length,
        latestAt: attempts.find((item) => Number(item.moduleId) === Number(row.moduleId))?.createdAt || row.createdAt,
      };
    })
    .sort((a, b) => a.moduleId - b.moduleId);

  const average = records.length
    ? Math.round(records.reduce((sum, row) => sum + row.score, 0) / records.length)
    : 0;

  return NextResponse.json({
    records,
    summary: {
      assessedModules: records.length,
      passedModules: records.filter((row) => row.passed).length,
      average,
    },
  });
}
