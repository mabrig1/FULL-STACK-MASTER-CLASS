import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { grantPaidAccess } from "@/lib/payments";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new NextResponse("Payments not configured", { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event?.event === "charge.success" && event?.data?.reference) {
    await grantPaidAccess(String(event.data.reference), event.data).catch(() => undefined);
  }

  return NextResponse.json({ received: true });
}
