import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { collections, getDb } from "@/lib/db";
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

  const db = await getDb();
  const learners = await db.collection(collections.users)
    .find({ role: "student" }, { projection: { _id: 1 } })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  let synced = 0;
  let failed = 0;
  const batchSize = 8;

  for (let index = 0; index < learners.length; index += batchSize) {
    const batch = learners.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map((learner) =>
        syncFullstackLearner(learner._id.toString(), {
          event: "fintigen-admin-backfill",
          accessSource: "fintigen-admin",
        }),
      ),
    );
    for (const result of results) {
      if (result.ok) synced += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    scanned: learners.length,
    synced,
    failed,
  });
}
