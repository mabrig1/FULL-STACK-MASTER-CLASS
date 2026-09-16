import { NextResponse } from "next/server";
import { callAI, getAIErrorCode, getAIStatus } from "@/lib/ai";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { evalCases, scoreEvalResponse } from "@/lib/eval-cases";
import { selectAgentSkill } from "@/lib/agent-skills";
import { recordAgentTrace } from "@/lib/agent-observability";

export async function GET() {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const db = await getDb();
  const rows = await db.collection(collections.evalRuns)
    .find()
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json({
    runs: rows.map((row) => ({
      id: row._id.toString(),
      score: Number(row.score || 0),
      passRate: Number(row.passRate || 0),
      passed: Number(row.passed || 0),
      total: Number(row.total || 0),
      provider: row.provider || null,
      model: row.model || null,
      createdAt: row.createdAt,
      results: row.results || [],
    })),
  });
}

export async function POST() {
  const startedAt = Date.now();
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const aiStatus = getAIStatus();
  if (!aiStatus.configured) {
    return NextResponse.json({ error: "AI provider is not configured." }, { status: 503 });
  }

  const results = [];
  for (const test of evalCases) {
    const skill = selectAgentSkill("tutor", test.prompt);
    let output = "";
    let errorCode: string | null = null;

    try {
      output =
        (await callAI(
          [
            {
              role: "system",
              content:
                "You are the Full Stack Master Class mentor under evaluation. " +
                "Follow production engineering discipline: separate facts from assumptions, never claim execution without evidence, " +
                "require server-side authorization, validate inputs, keep secrets server-only and make learning responses practical. " +
                "Active skill: " + skill.label + ". " + skill.instructions,
            },
            { role: "user", content: test.prompt },
          ],
          { temperature: 0, maxTokens: 800 },
        )) || "";
    } catch (error) {
      errorCode = getAIErrorCode(error);
    }

    const scored = scoreEvalResponse(output, test);
    results.push({
      id: test.id,
      label: test.label,
      prompt: test.prompt,
      output: output.slice(0, 5000),
      skill: skill.id,
      errorCode,
      ...scored,
    });
  }

  const score = Math.round(
    results.reduce((sum, result) => sum + result.score, 0) / Math.max(1, results.length),
  );
  const passed = results.filter((result) => result.passed).length;
  const passRate = Math.round((passed / Math.max(1, results.length)) * 100);

  const db = await getDb();
  const insert = await db.collection(collections.evalRuns).insertOne({
    suite: "mentor-golden-v1",
    score,
    passRate,
    passed,
    total: results.length,
    provider: aiStatus.provider,
    model: aiStatus.model,
    results,
    createdBy: staff!.id,
    createdAt: new Date(),
  });

  await recordAgentTrace({
    userId: staff!.id,
    kind: "eval",
    mode: "mentor-golden-v1",
    input: "Run " + results.length + " golden mentor evaluations.",
    output: "Average score " + score + "%; pass rate " + passRate + "%.",
    status: results.every((result) => !result.errorCode) ? "completed" : "error",
    latencyMs: Date.now() - startedAt,
    provider: aiStatus.provider,
    model: aiStatus.model,
    metadata: { score, passRate, passed, total: results.length },
  }).catch(() => undefined);

  return NextResponse.json({
    id: insert.insertedId.toString(),
    suite: "mentor-golden-v1",
    score,
    passRate,
    passed,
    total: results.length,
    results,
  });
}
