import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { collections, getDb } from "@/lib/db";
import { getFullstackLearnerSnapshot } from "@/lib/fintigen";

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

  const db = await getDb();
  const total = await db.collection(collections.users).countDocuments({ role: "student" });
  const learners = await db.collection(collections.users)
    .find({ role: "student" }, { projection: { _id: 1 } })
    .sort({ createdAt: -1 })
    .limit(250)
    .toArray();

  const snapshots = (
    await Promise.all(
      learners.map((learner) =>
        getFullstackLearnerSnapshot(learner._id.toString(), {
          event: "fintigen-admin-backfill",
          accessSource: "fintigen-admin",
        }),
      ),
    )
  ).filter(Boolean);

  return NextResponse.json({
    ok: true,
    total,
    returned: snapshots.length,
    hasMore: total > learners.length,
    learners: snapshots,
  });
}
