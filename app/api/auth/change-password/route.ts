import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { consumeRateLimit, requestFingerprint, writeAuditEvent } from "@/lib/security";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const throttle = await consumeRateLimit({
    key: "change-password:" + requestFingerprint(request) + ":" + user.id,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!throttle.allowed) {
    return NextResponse.json({ error: "Too many password-change attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 10) {
    return NextResponse.json({ error: "New password must be at least 10 characters." }, { status: 400 });
  }

  const db = await getDb();
  const row = await db.collection(collections.users).findOne({ _id: new ObjectId(user.id) });
  if (!row || !verifyPassword(currentPassword, String(row.passwordHash || ""))) {
    await writeAuditEvent({
      event: "password.change_failed",
      actorId: user.id,
      actorEmail: user.email,
      request,
    });
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await db.collection(collections.users).updateOne(
    { _id: row._id },
    { $set: { passwordHash: hashPassword(newPassword), passwordChangedAt: new Date(), updatedAt: new Date() } },
  );

  await db.collection(collections.sessions).deleteMany({ userId: user.id });

  await writeAuditEvent({
    event: "password.changed",
    actorId: user.id,
    actorEmail: user.email,
    request,
  });

  return NextResponse.json({ changed: true, signInAgain: true });
}
