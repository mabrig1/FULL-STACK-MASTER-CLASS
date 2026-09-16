import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export type UserRole = "student" | "instructor" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: string;
  entitlements: string[];
  emailVerified: boolean;
};

export const SESSION_COOKIE = "fsmc_session";
const SESSION_DAYS = 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.collection(collections.sessions).insertOne({
    tokenHash: tokenHash(token),
    userId,
    createdAt: new Date(),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined) {
  if (!token || !isDatabaseConfigured()) return;
  const db = await getDb();
  await db.collection(collections.sessions).deleteOne({ tokenHash: tokenHash(token) });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isDatabaseConfigured()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection(collections.sessions).findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session?.userId || !ObjectId.isValid(session.userId)) return null;

  const user = await db.collection(collections.users).findOne({ _id: new ObjectId(session.userId) });
  if (!user) return null;

  return {
    id: user._id.toString(),
    email: String(user.email),
    name: String(user.name),
    role: (user.role || "student") as UserRole,
    plan: String(user.plan || "free"),
    entitlements: Array.isArray(user.entitlements) ? user.entitlements.map(String) : [],
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export function roleForEmail(email: string): UserRole {
  const normalized = normalizeEmail(email);
  const admins = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  const instructors = String(process.env.INSTRUCTOR_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  if (admins.includes(normalized)) return "admin";
  if (instructors.includes(normalized)) return "instructor";
  return "student";
}

export function canManageAcademy(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "instructor";
}
