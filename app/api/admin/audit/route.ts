import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) return NextResponse.json({ error: "Instructor access required." }, { status: 403 });

  const db = await getDb();
  const rows = await db.collection(collections.auditLogs)
    .find()
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    events: rows.map((row) => ({
      id: row._id.toString(),
      event: row.event,
      actorEmail: row.actorEmail || null,
      metadata: row.metadata || {},
      createdAt: row.createdAt,
    })),
  });
}
