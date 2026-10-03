import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections, getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth";
import { syncFullstackLearner } from "@/lib/fintigen";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function authorized(request: Request) {
  const expected = String(process.env.FINTIGEN_FULLSTACK_SHARED_SECRET || "");
  const provided = String(request.headers.get("x-fintigen-integration-secret") || "");
  if (!expected || !provided) return false;
  const a = digest(provided);
  const b = digest(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Invalid integration credentials." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const learnerId = String(body.learnerId || "");
  const email = normalizeEmail(String(body.email || ""));
  const plan = String(body.plan || "");

  if (!["free", "masterclass"].includes(plan)) {
    return NextResponse.json({ error: "plan must be free or masterclass." }, { status: 400 });
  }

  const selectors: Record<string, unknown>[] = [];
  if (ObjectId.isValid(learnerId)) selectors.push({ _id: new ObjectId(learnerId) });
  if (email) selectors.push({ email });
  if (!selectors.length) {
    return NextResponse.json({ error: "learnerId or email is required." }, { status: 400 });
  }

  const db = await getDb();
  const learner = await db.collection(collections.users).findOne({
    role: "student",
    $or: selectors,
  });
  if (!learner) return NextResponse.json({ error: "Learner not found." }, { status: 404 });

  const entitlements = plan === "masterclass"
    ? ["academy", "projects", "ai", "certificates", "cohorts"]
    : ["free-course"];

  await db.collection(collections.users).updateOne(
    { _id: learner._id },
    { $set: { plan, entitlements, updatedAt: new Date() } },
  );

  await syncFullstackLearner(learner._id.toString(), {
    event: "fintigen-admin-access",
    accessSource: "fintigen-admin",
  });

  return NextResponse.json({
    updated: true,
    learnerId: learner._id.toString(),
    email: learner.email,
    plan,
  });
}
