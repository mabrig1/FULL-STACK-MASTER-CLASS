import { NextRequest, NextResponse } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
  findReferrerByCode,
  normalizeReferralCode,
} from "@/lib/referrals";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  const referrer = await findReferrerByCode(code);

  const destination = new URL("/register", request.url);
  if (!referrer) {
    destination.searchParams.set("referral", "invalid");
    return NextResponse.redirect(destination);
  }

  destination.searchParams.set("ref", code);
  const response = NextResponse.redirect(destination);
  response.cookies.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
  });
  return response;
}
