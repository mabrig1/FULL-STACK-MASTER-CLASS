import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  const db = await getDb();
  const result = await db.collection(collections.cohorts).updateOne(
    { code },
    { $addToSet: { memberIds: user.id }, $set: { updatedAt: new Date() } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Cohort code not found." }, { status: 404 });
  return NextResponse.json({ joined: true });
}
