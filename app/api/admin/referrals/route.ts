import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { writeAuditEvent } from "@/lib/security";
import { referralRatePercent } from "@/lib/referrals";

export async function GET() {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const db = await getDb();
  const commissions = await db
    .collection(collections.referralCommissions)
    .find()
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const pendingKobo = commissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.commissionKobo || 0), 0);
  const paidKobo = commissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.commissionKobo || 0), 0);

  return NextResponse.json({
    ratePercent: referralRatePercent(),
    metrics: {
      conversions: commissions.length,
      pendingNgn: pendingKobo / 100,
      paidNgn: paidKobo / 100,
    },
    commissions: commissions.map((item) => ({
      reference: String(item.paymentReference || ""),
      referrerUserId: String(item.referrerUserId || ""),
      buyerEmail: String(item.referredEmail || ""),
      referralCode: String(item.referralCode || ""),
      grossNgn: Number(item.grossAmountKobo || 0) / 100,
      commissionNgn: Number(item.commissionKobo || 0) / 100,
      status: String(item.status || "pending"),
      createdAt: item.createdAt,
      paidAt: item.paidAt || null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const paymentReference = String(body.paymentReference || "").trim();
  if (!paymentReference) {
    return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection(collections.referralCommissions).updateOne(
    { paymentReference, status: "pending" },
    {
      $set: {
        status: "paid",
        paidAt: new Date(),
        paidBy: user!.id,
        updatedAt: new Date(),
      },
    },
  );

  if (!result.matchedCount) {
    return NextResponse.json(
      { error: "Pending commission not found or already paid." },
      { status: 404 },
    );
  }

  await writeAuditEvent({
    event: "referral.commission_paid",
    actorId: user!.id,
    actorEmail: user!.email,
    request,
    metadata: { paymentReference },
  });

  return NextResponse.json({ success: true, paymentReference });
}
