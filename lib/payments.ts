import { collections, getDb } from "@/lib/db";

export function masterclassPriceNgn() {
  const value = Number(process.env.MASTERCLASS_PRICE_NGN || "100000");
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 100000;
}

export async function paystackRequest(path: string, init: RequestInit = {}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured.");

  const response = await fetch("https://api.paystack.co" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || data.status === false) {
    throw new Error(data.message || "Paystack request failed.");
  }
  return data;
}

export async function grantPaidAccess(reference: string, payload: any) {
  const db = await getDb();
  const payment = await db.collection(collections.payments).findOne({ reference });
  if (!payment) throw new Error("Unknown payment reference.");

  const paidAmount = Number(payload?.amount || 0);
  if (paidAmount !== Number(payment.amountKobo)) {
    throw new Error("Payment amount does not match the initialized transaction.");
  }

  const status = String(payload?.status || "");
  if (status !== "success") throw new Error("Payment is not successful.");

  await db.collection(collections.payments).updateOne(
    { reference },
    {
      $set: {
        status: "success",
        paidAt: new Date(payload?.paid_at || Date.now()),
        providerData: {
          channel: payload?.channel || "",
          currency: payload?.currency || "NGN",
          customerCode: payload?.customer?.customer_code || "",
        },
        updatedAt: new Date(),
      },
    },
  );

  await db.collection(collections.users).updateOne(
    { _id: payment.userObjectId },
    {
      $set: { plan: "masterclass", updatedAt: new Date() },
      $addToSet: { entitlements: { $each: ["academy", "projects", "ai", "certificates", "cohorts"] } },
    },
  );

  return payment;
}
