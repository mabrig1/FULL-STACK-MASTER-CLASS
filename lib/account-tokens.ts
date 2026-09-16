import { createHash, randomBytes } from "crypto";
import { collections, getDb } from "@/lib/db";

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccountToken(input: {
  userId: string;
  purpose: "verify-email" | "reset-password";
  ttlMinutes: number;
}) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60 * 1000);

  await db.collection(collections.accountTokens).deleteMany({
    userId: input.userId,
    purpose: input.purpose,
  });

  await db.collection(collections.accountTokens).insertOne({
    tokenHash: digest(token),
    userId: input.userId,
    purpose: input.purpose,
    createdAt: new Date(),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeAccountToken(input: {
  token: string;
  purpose: "verify-email" | "reset-password";
}) {
  const db = await getDb();
  const row = await db.collection(collections.accountTokens).findOne({
    tokenHash: digest(input.token),
    purpose: input.purpose,
    expiresAt: { $gt: new Date() },
  });

  if (!row) return null;
  await db.collection(collections.accountTokens).deleteOne({ _id: row._id });
  return row;
}
