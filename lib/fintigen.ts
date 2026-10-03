import { ObjectId } from "mongodb";
import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";

export type SyncContext = {
  event?: string;
  accessSource?: string;
  lastModuleId?: number | null;
};

function config() {
  const apiUrl = String(process.env.FINTIGEN_API_URL || "").trim().replace(/\/$/, "");
  const secret = String(process.env.FINTIGEN_FULLSTACK_SHARED_SECRET || "").trim();
  return { apiUrl, secret };
}

export function isFintigenIntegrationConfigured() {
  const { apiUrl, secret } = config();
  return Boolean(apiUrl && secret);
}

export async function getFullstackLearnerSnapshot(userId: string, context: SyncContext = {}) {
  if (!ObjectId.isValid(userId)) return null;

  const db = await getDb();
  const user = await db.collection(collections.users).findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  const [completedModules, verifiedProjects, latestProgress] = await Promise.all([
    db.collection(collections.progress).countDocuments({ userId, status: "completed" }),
    db.collection(collections.submissions).countDocuments({ userId, githubVerified: true }),
    db.collection(collections.progress).find({ userId }).sort({ updatedAt: -1 }).limit(1).next(),
  ]);

  const totalModules = courseModules.length;
  const event = context.event || "sync";

  return {
    learnerId: userId,
    name: String(user.name || ""),
    email: String(user.email || ""),
    role: String(user.role || "student"),
    plan: String(user.plan || "free"),
    entitlements: Array.isArray(user.entitlements) ? user.entitlements.map(String) : [],
    onboardingComplete: Boolean(user.onboardingComplete),
    emailVerified: Boolean(user.emailVerifiedAt),
    courseSlug: String(process.env.FINTIGEN_COURSE_SLUG || "mabrig-full-stack-founder-pro"),
    courseTitle: String(process.env.FINTIGEN_COURSE_TITLE || "Full-Stack Master-Class"),
    status: completedModules >= totalModules ? "completed" : "active",
    completedModules,
    totalModules,
    verifiedProjects,
    skillScore: null,
    lastModuleId: context.lastModuleId ?? latestProgress?.moduleId ?? null,
    accessSource: context.accessSource || event,
    enrolledAt: user.createdAt || new Date(),
    lastActivityAt: latestProgress?.updatedAt || user.updatedAt || new Date(),
    event,
    occurredAt: new Date().toISOString(),
  };
}

export async function syncFullstackLearner(userId: string, context: SyncContext = {}) {
  const { apiUrl, secret } = config();
  if (!apiUrl || !secret) {
    return { ok: false, skipped: true, reason: "integration-not-configured" };
  }

  const payload = await getFullstackLearnerSnapshot(userId, context);
  if (!payload) {
    return { ok: false, skipped: true, reason: "learner-not-found" };
  }

  try {
    const response = await fetch(apiUrl + "/integrations/fullstack/learner-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fintigen-integration-secret": secret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Fintigen learner sync failed", response.status, data);
      return { ok: false, skipped: false, status: response.status };
    }
    return { ok: true, skipped: false };
  } catch (error) {
    console.error("Fintigen learner sync unavailable", error);
    return { ok: false, skipped: false, reason: "network-error" };
  }
}
