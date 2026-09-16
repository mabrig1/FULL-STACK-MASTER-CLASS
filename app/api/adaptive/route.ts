import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeAdaptiveState } from "@/lib/mastery";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const state = await computeAdaptiveState(user.id);
  return NextResponse.json(state);
}
