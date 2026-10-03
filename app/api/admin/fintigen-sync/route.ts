import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { syncFullstackLearner } from "@/lib/fintigen";

export async function POST() {
  const admin = await getCurrentUser();
  if (!canManageAcademy(admin)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const db = await getDb();
  const learners = await db.collection(collections.users)
    .find({ role: "student" }, { projection: { _id: 1 } })
    .sort({ createdAt: -1 })
    .limit(250)
    .toArray();

  let synced = 0;
  let failed = 0;
  const batchSize = 8;

  for (let i = 0; i < learners.length; i += batchSize) {
    const batch = learners.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((learner) =>
        syncFullstackLearner(learner._id.toString(), {
          event: "admin-backfill",
          accessSource: "fullstack-admin",
        }),
      ),
    );
    for (const result of results) {
      if (result.ok) synced += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({ ok: failed === 0, scanned: learners.length, synced, failed });
}
