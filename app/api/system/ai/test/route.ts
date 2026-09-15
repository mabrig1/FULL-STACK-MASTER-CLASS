import { NextResponse } from "next/server";
import { callAI, getAIErrorCode, getAIStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getAIStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        ...status,
        completionTest: false,
        diagnostic: "not-configured",
      },
      { status: 503 },
    );
  }

  try {
    const reply = await callAI(
      [
        {
          role: "system",
          content:
            "You are a health-check assistant. Reply with exactly: FULLSTACK_AI_OK",
        },
        {
          role: "user",
          content: "Run the Full Stack Master Class AI health check.",
        },
      ],
      { temperature: 0, maxTokens: 20 },
    );

    const success = reply?.trim().includes("FULLSTACK_AI_OK") ?? false;

    return NextResponse.json(
      {
        ...status,
        completionTest: success,
        diagnostic: success ? "completion-ready" : "unexpected-model-response",
        responsePreview: reply ? reply.slice(0, 80) : null,
      },
      { status: success ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ...status,
        completionTest: false,
        diagnostic: getAIErrorCode(error),
      },
      { status: 502 },
    );
  }
}
