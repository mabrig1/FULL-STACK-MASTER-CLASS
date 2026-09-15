import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDb();
  const filter = canManageAcademy(user)
    ? { $or: [{ instructorIds: user.id }, { createdBy: user.id }] }
    : { memberIds: user.id };
  const rows = await db.collection(collections.cohorts).find(filter).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({
    cohorts: rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      code: canManageAcademy(user) ? row.code : undefined,
      startDate: row.startDate,
      endDate: row.endDate,
      memberCount: Array.isArray(row.memberIds) ? row.memberIds.length : 0,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 120);
  if (name.length < 3) return NextResponse.json({ error: "Cohort name is required." }, { status: 400 });

  const code = randomBytes(4).toString("hex").toUpperCase();
  const db = await getDb();
  const result = await db.collection(collections.cohorts).insertOne({
    name,
    code,
    createdBy: user!.id,
    instructorIds: [user!.id],
    memberIds: [],
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return NextResponse.json({ id: result.insertedId.toString(), name, code });
}
