import PricingPanel from "@/components/pricing-panel";

export default function PricingPage() {
  const priceNgn = Math.max(1, Number(process.env.MASTERCLASS_PRICE_NGN || "100000"));
  return <PricingPanel priceNgn={priceNgn} />;
}
