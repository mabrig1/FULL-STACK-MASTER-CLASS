"use client";

import { useState } from "react";
import {
  Check,
  CircleDollarSign,
  Copy,
  Share2,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";

type Commission = {
  reference: string;
  email: string;
  grossNgn: number;
  commissionNgn: number;
  status: string;
  createdAt: string;
};

export default function ReferralDashboard({
  referralCode,
  referralUrl,
  ratePercent,
  summary,
  commissions,
}: {
  referralCode: string;
  referralUrl: string;
  ratePercent: number;
  summary: {
    conversions: number;
    grossNgn: number;
    pendingNgn: number;
    paidNgn: number;
  };
  commissions: Commission[];
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: "Full Stack Master Class",
        text: "Learn full stack engineering, AI, SaaS and agentic development with me.",
        url: referralUrl,
      });
      return;
    }
    await copyLink();
  }

  return (
    <main className="commercialPage referralDashboard">
      <section className="commercialHero referralHero">
        <span className="eyebrow">BUILDER REFERRAL PROGRAMME</span>
        <h1>Earn {ratePercent}% when your referral becomes a paid learner.</h1>
        <p>
          Share one tracked link. Commission is created only after a successful,
          verified Paystack payment and remains visible here until payout.
        </p>
        <div className="referralShareCard">
          <div>
            <small>Your referral code</small>
            <strong>{referralCode}</strong>
            <span>{referralUrl}</span>
          </div>
          <div className="actionRow">
            <button className="secondaryButton iconButton" onClick={copyLink}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button className="primaryButton iconButton" onClick={shareLink}>
              <Share2 size={17} />
              Share
            </button>
          </div>
        </div>
      </section>

      <section className="referralMetricGrid">
        <article>
          <UserRoundCheck size={20} />
          <span>Paid referrals</span>
          <strong>{summary.conversions}</strong>
        </article>
        <article>
          <CircleDollarSign size={20} />
          <span>Referred revenue</span>
          <strong>₦{summary.grossNgn.toLocaleString()}</strong>
        </article>
        <article>
          <WalletCards size={20} />
          <span>Pending commission</span>
          <strong>₦{summary.pendingNgn.toLocaleString()}</strong>
        </article>
        <article>
          <Check size={20} />
          <span>Paid out</span>
          <strong>₦{summary.paidNgn.toLocaleString()}</strong>
        </article>
      </section>

      <section className="commercialSection">
        <div className="sectionMiniHeading">
          <div>
            <span className="eyebrow">COMMISSION LEDGER</span>
            <h2>Every verified conversion, in one place.</h2>
          </div>
          <span className="pill">{ratePercent}% verified-sale commission</span>
        </div>

        <div className="referralTable">
          {commissions.length === 0 ? (
            <div className="emptyState">
              Your first verified referral will appear here automatically.
            </div>
          ) : (
            commissions.map((item) => (
              <article key={item.reference}>
                <div>
                  <strong>{item.email || "Referred learner"}</strong>
                  <small>{item.reference}</small>
                </div>
                <span>₦{item.grossNgn.toLocaleString()} sale</span>
                <strong>₦{item.commissionNgn.toLocaleString()}</strong>
                <span className={item.status === "paid" ? "statusGood" : "statusWarn"}>
                  {item.status}
                </span>
                <time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</time>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
