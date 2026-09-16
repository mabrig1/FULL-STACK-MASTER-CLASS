import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";

export async function GET(request: Request) {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const moduleFilter = Number(url.searchParams.get("moduleId") || "0");
  const db = await getDb();

  const filter: Record<string, unknown> = {};
  if (moduleFilter > 0) filter.moduleId = moduleFilter;

  const attempts = await db.collection(collections.assessmentAttempts)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();

  const userIds = Array.from(new Set(attempts.map((row) => String(row.userId))))
    .filter((id) => ObjectId.isValid(id));

  const users = userIds.length
    ? await db.collection(collections.users)
        .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
        .project({ name: 1, email: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((row) => [row._id.toString(), row]));

  const byModule = new Map<number, { attempts: number; passed: number; scores: number[]; learners: Set<string> }>();
  for (const row of attempts) {
    const moduleId = Number(row.moduleId);
    const current = byModule.get(moduleId) || {
      attempts: 0,
      passed: 0,
      scores: [],
      learners: new Set<string>(),
    };
    current.attempts += 1;
    if (row.passed) current.passed += 1;
    current.scores.push(Number(row.score || 0));
    current.learners.add(String(row.userId));
    byModule.set(moduleId, current);
  }

  const modules = Array.from(byModule.entries())
    .map(([moduleId, stats]) => {
      const module = courseModules.find((item) => item.id === moduleId);
      const average = stats.scores.length
        ? Math.round(stats.scores.reduce((sum, value) => sum + value, 0) / stats.scores.length)
        : 0;
      return {
        moduleId,
        title: module?.title || "Module " + moduleId,
        attempts: stats.attempts,
        uniqueLearners: stats.learners.size,
        passed: stats.passed,
        passRate: stats.attempts ? Math.round((stats.passed / stats.attempts) * 100) : 0,
        average,
      };
    })
    .sort((a, b) => a.moduleId - b.moduleId);

  const recent = attempts.slice(0, 100).map((row) => {
    const user = userMap.get(String(row.userId));
    const module = courseModules.find((item) => item.id === Number(row.moduleId));
    return {
      id: row._id.toString(),
      learnerName: user?.name || "Unknown learner",
      learnerEmail: user?.email || "",
      moduleId: Number(row.moduleId),
      moduleTitle: module?.title || "Module " + row.moduleId,
      score: Number(row.score || 0),
      passed: Boolean(row.passed),
      createdAt: row.createdAt,
    };
  });

  return NextResponse.json({
    modules,
    recent,
    totals: {
      attempts: attempts.length,
      passed: attempts.filter((row) => row.passed).length,
      learners: new Set(attempts.map((row) => String(row.userId))).size,
    },
  });
}
