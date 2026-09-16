import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { collections, getDb } from "@/lib/db";
import { issueAccountToken } from "@/lib/account-tokens";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email";
import { consumeRateLimit } from "@/lib/security";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email delivery is not configured yet." }, { status: 503 });
  }

  const rate = await consumeRateLimit({
    key: "verify-email:" + user.id,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Verification email limit reached. Try again later." }, { status: 429 });
  }

  const db = await getDb();
  const row = await db.collection(collections.users).findOne({ _id: new ObjectId(user.id) });
  if (!row) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (row.emailVerifiedAt) return NextResponse.json({ alreadyVerified: true });

  const issued = await issueAccountToken({ userId: user.id, purpose: "verify-email", ttlMinutes: 60 * 24 });
  const appUrl = (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(/\/$/, "");
  const verifyUrl = appUrl + "/verify-email?token=" + encodeURIComponent(issued.token);

  const sent = await sendTransactionalEmail({
    to: user.email,
    subject: "Verify your Full Stack Master Class email",
    html:
      "<h2>Verify your developer identity</h2>" +
      "<p>Confirm this email address for your Full Stack Master Class account.</p>" +
      '<p><a href="' + verifyUrl + '">Verify email address</a></p>' +
      "<p>This link expires in 24 hours.</p>",
  });

  return NextResponse.json({ sent: sent.sent });
}
