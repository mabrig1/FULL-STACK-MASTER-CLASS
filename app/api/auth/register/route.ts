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
    createdAt: now,
    updatedAt: now,
  });

  const session = await createSession(result.insertedId.toString());

  await writeAuditEvent({
    event: "auth.registered",
    actorId: result.insertedId.toString(),
    actorEmail: email,
    request,
    metadata: { role },
  });

  const response = NextResponse.json({
    user: { id: result.insertedId.toString(), name, email, role, onboardingComplete: false },
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
