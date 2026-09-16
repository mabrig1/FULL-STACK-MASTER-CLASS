import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { writeAuditEvent } from "@/lib/security";

export async function GET() {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const db = await getDb();
  const rows = await db.collection(collections.announcements)
    .find()
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({
    announcements: rows.map((row) => ({
      id: row._id.toString(),
      title: row.title,
      body: row.body,
      href: row.href || null,
      audience: row.audience,
      delivered: row.delivered || 0,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 160);
  const text = String(body.body || "").trim().slice(0, 2000);
  const href = String(body.href || "").trim().slice(0, 500);
  const audience = ["all", "free", "masterclass"].includes(String(body.audience))
    ? String(body.audience)
    : "all";

  if (title.length < 3 || text.length < 10) {
    return NextResponse.json(
      { error: "Provide a meaningful title and announcement body." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const userFilter: Record<string, unknown> = { role: "student" };
  if (audience === "free") userFilter.plan = "free";
  if (audience === "masterclass") userFilter.plan = "masterclass";

  const users = await db.collection(collections.users)
    .find(userFilter)
    .project({ _id: 1 })
    .limit(5000)
    .toArray();

  const now = new Date();
  const inserted = await db.collection(collections.announcements).insertOne({
    title,
    body: text,
    href: href || null,
    audience,
    delivered: users.length,
    createdBy: staff!.id,
    createdAt: now,
  });

  if (users.length) {
    await db.collection(collections.notifications).insertMany(
      users.map((user) => ({
        userId: user._id.toString(),
        title,
        body: text,
        href: href || null,
        type: "announcement",
        announcementId: inserted.insertedId,
        readAt: null,
        createdAt: now,
      })),
    );
  }

  await writeAuditEvent({
    event: "announcement.broadcast",
    actorId: staff!.id,
    actorEmail: staff!.email,
    request,
    metadata: { announcementId: inserted.insertedId.toString(), audience, delivered: users.length },
  });

  return NextResponse.json({
    sent: true,
    id: inserted.insertedId.toString(),
    delivered: users.length,
  });
}
