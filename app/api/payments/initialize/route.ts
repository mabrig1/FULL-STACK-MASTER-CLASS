import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { masterclassPriceNgn, paystackRequest } from "@/lib/payments";
import { REFERRAL_COOKIE, resolveReferralForUser } from "@/lib/referrals";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const priceNgn = masterclassPriceNgn();
  const amountKobo = priceNgn * 100;
  const reference = "FSMC_" + user.id.slice(-8) + "_" + Date.now() + "_" + randomBytes(3).toString("hex");
  const appUrl = (process.env.APP_URL || new URL(requestUrl()).origin).replace(/\/$/, "");

  const db = await getDb();
  const userObjectId = new ObjectId(user.id);
  const referral = await resolveReferralForUser(
    user.id,
    request.cookies.get(REFERRAL_COOKIE)?.value,
  );
  await db.collection(collections.payments).insertOne({
    userId: user.id,
    userObjectId,
    email: user.email,
    plan: "masterclass",
    reference,
    amountNgn: priceNgn,
    amountKobo,
    currency: "NGN",
    status: "initialized",
    referredByUserId: referral?.userId || null,
    referralCode: referral?.code || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const data = await paystackRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        reference,
        callback_url: appUrl + "/pricing?reference=" + encodeURIComponent(reference),
        metadata: {
          userId: user.id,
          plan: "masterclass",
          product: "Full Stack Master Class",
          referralCode: referral?.code || "",
        },
      }),
    });
    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      amountNgn: priceNgn,
    });
  } catch (error) {
    await db.collection(collections.payments).updateOne(
      { reference },
      { $set: { status: "initialize-failed", updatedAt: new Date() } },
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to initialize payment." },
      { status: 502 },
    );
  }
}

function requestUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}
