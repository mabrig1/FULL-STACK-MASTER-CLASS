import { NextResponse } from "next/server";
import { collections, getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth";
import { issueAccountToken } from "@/lib/account-tokens";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email";
import { consumeRateLimit, requestFingerprint } from "@/lib/security";

export async function POST(request: Request) {
  const rate = await consumeRateLimit({
    key: "forgot-password:" + requestFingerprint(request),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ accepted: true });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  if (!email || !isEmailConfigured()) return NextResponse.json({ accepted: true });

  const db = await getDb();
  const user = await db.collection(collections.users).findOne({ email });
  if (!user) return NextResponse.json({ accepted: true });

  const issued = await issueAccountToken({
    userId: user._id.toString(),
    purpose: "reset-password",
    ttlMinutes: 30,
  });
  const appUrl = (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(/\/$/, "");
  const url = appUrl + "/reset-password?token=" + encodeURIComponent(issued.token);

  await sendTransactionalEmail({
    to: email,
    subject: "Reset your Full Stack Master Class password",
    html:
      "<h2>Password reset</h2>" +
      "<p>A password reset was requested for your account.</p>" +
      '<p><a href="' + url + '">Reset password</a></p>' +
      "<p>This link expires in 30 minutes. Ignore this email if you did not request it.</p>",
  });

  return NextResponse.json({ accepted: true });
}
