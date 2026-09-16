import { NextResponse } from "next/server";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  normalizeEmail,
  roleForEmail,
} from "@/lib/auth";
import {
  consumeRateLimit,
  requestFingerprint,
  writeAuditEvent,
} from "@/lib/security";
import { createNotification } from "@/lib/notifications";
import { issueAccountToken } from "@/lib/account-tokens";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Account storage is not configured yet." }, { status: 503 });
  }

  const throttle = await consumeRateLimit({
    key: "register:" + requestFingerprint(request),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many account-creation attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");

  if (name.length < 2 || !email.includes("@") || password.length < 10) {
    return NextResponse.json(
      { error: "Use a valid name, email and a password of at least 10 characters." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = await db.collection(collections.users).findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const role = roleForEmail(email);
  const now = new Date();
  const result = await db.collection(collections.users).insertOne({
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    plan: role === "admin" || role === "instructor" ? "staff" : "free",
    entitlements: role === "admin" || role === "instructor" ? ["academy", "admin"] : ["free-course"],
    profile: {
      targetRole: "Full Stack Developer",
      weeklyHours: 6,
      experienceLevel: "beginner",
      goal: "",
    },
    onboardingComplete: false,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const userId = result.insertedId.toString();
  const session = await createSession(userId);

  await createNotification({
    userId,
    title: "Welcome to Full Stack Master Class",
    body: "Start with Module 1, complete your learning profile and turn every lesson into visible developer evidence.",
    href: "/learn/1",
    type: "welcome",
  });

  let verificationSent = false;
  if (isEmailConfigured()) {
    const issued = await issueAccountToken({
      userId,
      purpose: "verify-email",
      ttlMinutes: 60 * 24,
    });
    const appUrl = (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(/\/$/, "");
    const verifyUrl = appUrl + "/verify-email?token=" + encodeURIComponent(issued.token);
    const sent = await sendTransactionalEmail({
      to: email,
      subject: "Verify your Full Stack Master Class email",
      html:
        "<h2>Welcome to Full Stack Master Class</h2>" +
        "<p>Verify your email to strengthen your developer identity and credential evidence.</p>" +
        '<p><a href="' + verifyUrl + '">Verify email address</a></p>' +
        "<p>This link expires in 24 hours.</p>",
    });
    verificationSent = sent.sent;
  }

  await writeAuditEvent({
    event: "auth.registered",
    actorId: userId,
    actorEmail: email,
    request,
    metadata: { role, verificationSent },
  });

  const response = NextResponse.json({
    user: {
      id: userId,
      name,
      email,
      role,
      onboardingComplete: false,
      emailVerified: false,
    },
    verificationSent,
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
