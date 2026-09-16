import { NextResponse } from "next/server";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  normalizeEmail,
  roleForEmail,
  verifyPassword,
} from "@/lib/auth";
import {
  consumeRateLimit,
  requestFingerprint,
  writeAuditEvent,
} from "@/lib/security";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Account storage is not configured yet." }, { status: 503 });
  }

  const fingerprint = requestFingerprint(request);
  const throttle = await consumeRateLimit({
    key: "login:" + fingerprint,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again after the cooldown." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((throttle.resetAt.getTime() - Date.now()) / 1000)) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const db = await getDb();
  const user = await db.collection(collections.users).findOne({ email });

  if (!user || !verifyPassword(password, String(user.passwordHash || ""))) {
    await writeAuditEvent({
      event: "auth.login_failed",
      actorEmail: email || null,
      request,
    });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const desiredRole = roleForEmail(email);
  if (desiredRole !== user.role && desiredRole !== "student") {
    await db.collection(collections.users).updateOne(
      { _id: user._id },
      {
        $set: {
          role: desiredRole,
          plan: "staff",
          entitlements: ["academy", "admin"],
          updatedAt: new Date(),
        },
      },
    );
    user.role = desiredRole;
  }

  await db.collection(collections.users).updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
  );

  const session = await createSession(user._id.toString());

  await writeAuditEvent({
    event: "auth.login_success",
    actorId: user._id.toString(),
    actorEmail: String(user.email),
    request,
    metadata: { role: user.role || "student", plan: user.plan || "free" },
  });

  const response = NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "student",
      plan: user.plan || "free",
      onboardingComplete: Boolean(user.onboardingComplete),
    },
  });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
