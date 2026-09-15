import { NextResponse } from "next/server";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  normalizeEmail,
  roleForEmail,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Account storage is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const db = await getDb();
  const user = await db.collection(collections.users).findOne({ email });

  if (!user || !verifyPassword(password, String(user.passwordHash || ""))) {
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

  const session = await createSession(user._id.toString());
  const response = NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "student",
      plan: user.plan || "free",
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
