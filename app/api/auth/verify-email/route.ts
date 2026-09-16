import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { consumeAccountToken } from "@/lib/account-tokens";
import { collections, getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "");
  if (!token) return NextResponse.json({ error: "Verification token is required." }, { status: 400 });

  const row = await consumeAccountToken({ token, purpose: "verify-email" });
  if (!row || !ObjectId.isValid(String(row.userId))) {
    return NextResponse.json({ error: "Verification link is invalid or expired." }, { status: 400 });
  }

  const db = await getDb();
  await db.collection(collections.users).updateOne(
    { _id: new ObjectId(String(row.userId)) },
    { $set: { emailVerifiedAt: new Date(), updatedAt: new Date() } },
  );

  await createNotification({
    userId: String(row.userId),
    title: "Email verified",
    body: "Your developer identity email has been verified successfully.",
    href: "/account",
    type: "success",
  });

  return NextResponse.json({ verified: true });
}
