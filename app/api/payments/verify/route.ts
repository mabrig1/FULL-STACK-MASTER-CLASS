import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { grantPaidAccess, paystackRequest } from "@/lib/payments";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const reference = new URL(request.url).searchParams.get("reference") || "";
  if (!reference) return NextResponse.json({ error: "Reference is required." }, { status: 400 });

  const db = await getDb();
  const payment = await db.collection(collections.payments).findOne({ reference, userId: user.id });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  try {
    const result = await paystackRequest("/transaction/verify/" + encodeURIComponent(reference));
    const payload = result.data;
    if (String(payload?.reference) !== reference) throw new Error("Reference mismatch.");
    await grantPaidAccess(reference, payload);
    return NextResponse.json({ success: true, status: payload.status, reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed." },
      { status: 400 },
    );
  }
}
