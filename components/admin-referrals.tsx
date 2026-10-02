"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, CheckCircle2, RefreshCw, UsersRound } from "lucide-react";

type Data = {
  ratePercent: number;
  metrics: {
    conversions: number;
    pendingNgn: number;
    paidNgn: number;
  };
  commissions: Array<{
    reference: string;
    buyerEmail: string;
    referralCode: string;
    grossNgn: number;
    commissionNgn: number;
    status: string;
    createdAt: string;
  }>;
};

export default function AdminReferrals() {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/referrals", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Unable to load referral data.");
      return;
    }
    setData(payload);
  }, []);

  useEffect(() => {
    load().catch(() => setMessage("Referral service unavailable."));
  }, [load]);

  async function markPaid(reference: string) {
    setBusy(reference);
    setMessage("");
    const response = await fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentReference: reference }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Unable to update commission.");
      setBusy("");
      return;
    }
    await load();
    setBusy("");
  }

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">REFERRAL OPERATIONS</span>
        <h1>Track verified sales and control commission payouts.</h1>
        <p>
          The ledger is tied to successful Paystack references, so repeated webhook
          delivery or manual verification cannot create duplicate commissions.
        </p>
      </section>

      {message && <section className="commercialSection notice">{message}</section>}

      {data && (
        <>
          <section className="referralMetricGrid adminReferralMetrics">
            <article><UsersRound size={20} /><span>Conversions</span><strong>{data.metrics.conversions}</strong></article>
            <article><BadgeDollarSign size={20} /><span>Commission rate</span><strong>{data.ratePercent}%</strong></article>
            <article><RefreshCw size={20} /><span>Pending</span><strong>₦{data.metrics.pendingNgn.toLocaleString()}</strong></article>
            <article><CheckCircle2 size={20} /><span>Paid</span><strong>₦{data.metrics.paidNgn.toLocaleString()}</strong></article>
          </section>

          <section className="commercialSection">
            <div className="sectionMiniHeading">
              <div>
                <span className="eyebrow">PAYOUT QUEUE</span>
                <h2>Verified commission ledger</h2>
              </div>
            </div>
            <div className="referralTable adminReferralTable">
              {data.commissions.map((item) => (
                <article key={item.reference}>
                  <div>
                    <strong>{item.buyerEmail || "Learner"}</strong>
                    <small>{item.referralCode || "No code"} · {item.reference}</small>
                  </div>
                  <span>₦{item.grossNgn.toLocaleString()} sale</span>
                  <strong>₦{item.commissionNgn.toLocaleString()}</strong>
                  <span className={item.status === "paid" ? "statusGood" : "statusWarn"}>{item.status}</span>
                  {item.status === "pending" ? (
                    <button
                      className="secondaryButton compactButton"
                      disabled={busy === item.reference}
                      onClick={() => markPaid(item.reference)}
                    >
                      {busy === item.reference ? "Updating…" : "Mark paid"}
                    </button>
                  ) : (
                    <span className="statusGood">Settled</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
