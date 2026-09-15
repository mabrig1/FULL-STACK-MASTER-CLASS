import { NextResponse } from "next/server";
import { getAIStatus } from "@/lib/ai";

export async function GET() {
  const status = getAIStatus();
  return NextResponse.json(status, { status: status.configured ? 200 : 503 });
}
