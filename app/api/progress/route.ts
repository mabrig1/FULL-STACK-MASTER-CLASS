import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { getModule } from "@/lib/course";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .collection(collections.progress)
    .find({ userId: user.id })
    .sort({ moduleId: 1 })
    .toArray();

  return NextResponse.json({
    completed: rows.filter((row) => row.status === "completed").map((row) => row.moduleId),
    progress: rows.map((row) => ({
      moduleId: row.moduleId,
      status: row.status,
      score: row.score ?? null,
      completedAt: row.completedAt ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const moduleId = Number(body.moduleId);
  const completed = Boolean(body.completed);
  if (!getModule(moduleId)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 });
  }

  const db = await getDb();
  if (completed) {
    await db.collection(collections.progress).updateOne(
      { userId: user.id, moduleId },
      {
        $set: {
          userId: user.id,
          moduleId,
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  } else {
    await db.collection(collections.progress).deleteOne({ userId: user.id, moduleId });
  }

  return NextResponse.json({ ok: true, moduleId, completed });
}
