import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { writeAuditEvent } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) return NextResponse.json({ error: "Instructor access required." }, { status: 403 });

  const url = new URL(request.url);
  const search = String(url.searchParams.get("q") || "").trim().slice(0, 100);
  const db = await getDb();

  const filter: Record<string, unknown> = { role: "student" };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const rows = await db.collection(collections.users)
    .find(filter, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const learners = await Promise.all(rows.map(async (row) => {
    const userId = row._id.toString();
    const [completed, verified] = await Promise.all([
      db.collection(collections.progress).countDocuments({ userId, status: "completed" }),
      db.collection(collections.submissions).countDocuments({ userId, githubVerified: true }),
    ]);
    return {
      id: userId,
      name: row.name,
      email: row.email,
      plan: row.plan || "free",
      onboardingComplete: Boolean(row.onboardingComplete),
      completed,
      verifiedProjects: verified,
      lastLoginAt: row.lastLoginAt || null,
      createdAt: row.createdAt,
    };
  }));

  return NextResponse.json({ learners });
}

export async function PATCH(request: Request) {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const learnerId = String(body.learnerId || "");
  const plan = String(body.plan || "");
  if (!ObjectId.isValid(learnerId) || !["free", "masterclass"].includes(plan)) {
    return NextResponse.json({ error: "Invalid learner or plan." }, { status: 400 });
  }

  const entitlements = plan === "masterclass"
    ? ["academy", "projects", "ai", "certificates", "cohorts"]
    : ["free-course"];

  const db = await getDb();
  const result = await db.collection(collections.users).updateOne(
    { _id: new ObjectId(learnerId), role: "student" },
    { $set: { plan, entitlements, updatedAt: new Date() } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Learner not found." }, { status: 404 });

  await writeAuditEvent({
    event: "admin.plan_changed",
    actorId: admin.id,
    actorEmail: admin.email,
    request,
    metadata: { learnerId, plan },
  });

  return NextResponse.json({ updated: true, learnerId, plan });
}
