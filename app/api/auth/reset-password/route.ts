import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { consumeAccountToken } from "@/lib/account-tokens";
import { hashPassword } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");

  if (!token || password.length < 10) {
    return NextResponse.json({ error: "Use a valid reset link and a password of at least 10 characters." }, { status: 400 });
  }

  const row = await consumeAccountToken({ token, purpose: "reset-password" });
  if (!row || !ObjectId.isValid(String(row.userId))) {
    return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const userId = String(row.userId);
  const db = await getDb();
  await db.collection(collections.users).updateOne(
    { _id: new ObjectId(userId) },
    { $set: { passwordHash: hashPassword(password), passwordChangedAt: new Date(), updatedAt: new Date() } },
  );
  await db.collection(collections.sessions).deleteMany({ userId });

  await createNotification({
    userId,
    title: "Password reset complete",
    body: "Your password was changed and previous sessions were revoked.",
    href: "/login",
    type: "security",
  });

  return NextResponse.json({ reset: true });
}
