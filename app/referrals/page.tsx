import { redirect } from "next/navigation";
import ReferralDashboard from "@/components/referral-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import {
  ensureReferralCode,
  referralRatePercent,
} from "@/lib/referrals";

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const referralCode = await ensureReferralCode(user.id);
  const db = await getDb();
  const commissions = await db
    .collection(collections.referralCommissions)
    .find({ referrerUserId: user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const pendingKobo = commissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.commissionKobo || 0), 0);
  const paidKobo = commissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.commissionKobo || 0), 0);
  const grossKobo = commissions.reduce(
    (sum, item) => sum + Number(item.grossAmountKobo || 0),
    0,
  );

  const appUrl = (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(/\/$/, "");
  const referralUrl = appUrl + "/r/" + encodeURIComponent(referralCode);

  return (
    <ReferralDashboard
      referralCode={referralCode}
      referralUrl={referralUrl}
      ratePercent={referralRatePercent()}
      summary={{
        conversions: commissions.length,
        grossNgn: grossKobo / 100,
        pendingNgn: pendingKobo / 100,
        paidNgn: paidKobo / 100,
      }}
      commissions={commissions.map((item) => ({
        reference: String(item.paymentReference || ""),
        email: String(item.referredEmail || ""),
        grossNgn: Number(item.grossAmountKobo || 0) / 100,
        commissionNgn: Number(item.commissionKobo || 0) / 100,
        status: String(item.status || "pending"),
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : "",
      }))}
    />
  );
}
