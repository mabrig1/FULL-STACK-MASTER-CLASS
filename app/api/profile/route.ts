import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { writeAuditEvent } from "@/lib/security";

const allowedLevels = new Set(["beginner", "intermediate", "advanced"]);
const allowedRoles = new Set([
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI Application Engineer",
  "SaaS Developer",
  "Freelance Developer",
  "Startup Builder",
]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDb();
  const row = await db.collection(collections.users).findOne(
    { _id: new ObjectId(user.id) },
    { projection: { passwordHash: 0 } },
  );

  return NextResponse.json({
    profile: row?.profile || {},
    name: row?.name || user.name,
    email: row?.email || user.email,
    plan: row?.plan || user.plan,
    role: row?.role || user.role,
    onboardingComplete: Boolean(row?.onboardingComplete),
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 100);
  const targetRole = String(body.targetRole || "").trim();
  const experienceLevel = String(body.experienceLevel || "").trim();
  const weeklyHours = Math.max(2, Math.min(40, Number(body.weeklyHours || 6)));
  const goal = String(body.goal || "").trim().slice(0, 600);

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
  }
  if (!allowedRoles.has(targetRole) || !allowedLevels.has(experienceLevel)) {
    return NextResponse.json({ error: "Choose a valid role and experience level." }, { status: 400 });
  }

  const db = await getDb();
  await db.collection(collections.users).updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        name,
        profile: { targetRole, experienceLevel, weeklyHours, goal },
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    },
  );

  await writeAuditEvent({
    event: "profile.updated",
    actorId: user.id,
    actorEmail: user.email,
    request,
    metadata: { targetRole, experienceLevel, weeklyHours },
  });

  return NextResponse.json({ saved: true });
}
