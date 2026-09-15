import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeJobReadiness } from "@/lib/readiness";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json(await computeJobReadiness(user.id));
}
