import { ObjectId } from "mongodb";
import { collections, getDb } from "@/lib/db";

export const REFERRAL_COOKIE = "fsmc_ref";
export const REFERRAL_COOKIE_DAYS = 30;

export function normalizeReferralCode(value: string | undefined | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 48);
}

export function referralRateBps() {
  const value = Number(process.env.REFERRAL_COMMISSION_BPS || "1500");
  if (!Number.isFinite(value) || value < 0 || value > 10000) return 1500;
  return Math.round(value);
}

export function referralRatePercent() {
  return referralRateBps() / 100;
}

export async function findReferrerByCode(code: string | undefined | null) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const db = await getDb();
  return db.collection(collections.users).findOne(
    { referralCode: normalized },
    { projection: { _id: 1, email: 1, name: 1, referralCode: 1 } },
  );
}

export async function ensureReferralCode(userId: string) {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user id.");
  const db = await getDb();
  const _id = new ObjectId(userId);
  const user = await db.collection(collections.users).findOne(
    { _id },
    { projection: { referralCode: 1, name: 1 } },
  );
  if (!user) throw new Error("User not found.");
  if (user.referralCode) return String(user.referralCode);

  const stem =
    String(user.name || "BUILDER")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "BUILDER";
  const code = stem + "-" + userId.slice(-8).toUpperCase();

  await db.collection(collections.users).updateOne(
    { _id, $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: "" }] },
    { $set: { referralCode: code, updatedAt: new Date() } },
  );

  const refreshed = await db.collection(collections.users).findOne(
    { _id },
    { projection: { referralCode: 1 } },
  );
  return String(refreshed?.referralCode || code);
}

export async function resolveReferralForUser(
  userId: string,
  cookieCode: string | undefined | null,
) {
  if (!ObjectId.isValid(userId)) return null;
  const db = await getDb();
  const buyerObjectId = new ObjectId(userId);
  const buyer = await db.collection(collections.users).findOne(
    { _id: buyerObjectId },
    { projection: { referredByUserId: 1, referredByCode: 1 } },
  );
  if (!buyer) return null;

  if (buyer.referredByUserId) {
    return {
      userId: String(buyer.referredByUserId),
      code: String(buyer.referredByCode || ""),
    };
  }

  const referrer = await findReferrerByCode(cookieCode);
  if (!referrer) return null;
  const referrerUserId = referrer._id.toString();
  if (referrerUserId === userId) return null;

  await db.collection(collections.users).updateOne(
    {
      _id: buyerObjectId,
      $or: [{ referredByUserId: { $exists: false } }, { referredByUserId: null }, { referredByUserId: "" }],
    },
    {
      $set: {
        referredByUserId: referrerUserId,
        referredByCode: String(referrer.referralCode || normalizeReferralCode(cookieCode)),
        referredAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return {
    userId: referrerUserId,
    code: String(referrer.referralCode || normalizeReferralCode(cookieCode)),
  };
}

export async function creditReferralCommission(payment: any, payload: any) {
  const referrerUserId = String(payment?.referredByUserId || "");
  const referredUserId = String(payment?.userId || "");
  const paymentReference = String(payment?.reference || payload?.reference || "");
  if (!referrerUserId || !referredUserId || !paymentReference) return null;
  if (referrerUserId === referredUserId) return null;

  const grossAmountKobo = Number(payload?.amount || payment?.amountKobo || 0);
  if (!Number.isFinite(grossAmountKobo) || grossAmountKobo <= 0) return null;

  const rateBps = referralRateBps();
  const commissionKobo = Math.round((grossAmountKobo * rateBps) / 10000);
  const now = new Date();
  const db = await getDb();

  await db.collection(collections.referralCommissions).updateOne(
    { paymentReference },
    {
      $setOnInsert: {
        referrerUserId,
        referredUserId,
        referredEmail: String(payment?.email || ""),
        referralCode: String(payment?.referralCode || ""),
        paymentReference,
        grossAmountKobo,
        commissionKobo,
        rateBps,
        currency: String(payload?.currency || payment?.currency || "NGN"),
        status: "pending",
        createdAt: now,
      },
      $set: {
        verifiedAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return { paymentReference, commissionKobo, rateBps };
}
