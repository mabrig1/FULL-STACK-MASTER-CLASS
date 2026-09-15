import { NextResponse } from "next/server";
import { validateAIConfiguration } from "@/lib/ai";\n\nexport const dynamic = "force-dynamic";

export async function GET() {
  const status = await validateAIConfiguration();
  const healthy =
    status.configured &&
    status.keyValid !== false &&
    status.modelAvailable !== false;

  return NextResponse.json(status, { status: healthy ? 200 : 503 });
}
