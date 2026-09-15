import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    configured: isDatabaseConfigured(),
    user: await getCurrentUser(),
  });
}
