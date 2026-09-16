import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDb();
  const rows = await db.collection(collections.notifications)
    .find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row._id.toString(),
      title: row.title,
      body: row.body,
      href: row.href || null,
      type: row.type || "info",
      read: Boolean(row.readAt),
      createdAt: row.createdAt,
    })),
    unread: rows.filter((row) => !row.readAt).length,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const db = await getDb();

  if (id === "all") {
    await db.collection(collections.notifications).updateMany(
      { userId: user.id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return NextResponse.json({ updated: true });
  }

  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });

  await db.collection(collections.notifications).updateOne(
    { _id: new ObjectId(id), userId: user.id },
    { $set: { readAt: new Date() } },
  );
  return NextResponse.json({ updated: true });
}
