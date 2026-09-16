import { createHash } from "crypto";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

export async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const resetAt = new Date(Math.floor(now / input.windowMs) * input.windowMs + input.windowMs);

  if (!isDatabaseConfigured()) {
    return { allowed: true, remaining: input.limit, resetAt, count: 0 };
  }

  const db = await getDb();
  const bucket = Math.floor(now / input.windowMs);
  const id = input.key + ":" + bucket;

  await db.collection(collections.rateLimits).updateOne(
    { _id: id as any },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        key: input.key,
        bucket,
        createdAt: new Date(),
        expiresAt: new Date(resetAt.getTime() + input.windowMs),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );

  const row = await db.collection(collections.rateLimits).findOne({ _id: id as any });
  const count = Number(row?.count || 1);

  return {
    allowed: count <= input.limit,
    remaining: Math.max(0, input.limit - count),
    resetAt,
    count,
  };
}

export async function writeAuditEvent(input: {
  event: string;
  actorId?: string | null;
  actorEmail?: string | null;
  request?: Request;
  metadata?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured()) return;

  const db = await getDb();
  await db.collection(collections.auditLogs).insertOne({
    event: input.event,
    actorId: input.actorId || null,
    actorEmail: input.actorEmail || null,
    fingerprint: input.request ? requestFingerprint(input.request) : null,
    metadata: input.metadata || {},
    createdAt: new Date(),
  });
}
