import { NextResponse } from "next/server";
import {
  callAIWithTelemetry,
  getAIErrorCode,
  getAIStatus,
} from "@/lib/ai";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { evalCases, scoreEvalResponse } from "@/lib/eval-cases";
import { selectAgentSkill } from "@/lib/agent-skills";
import {
  AGENT_POLICY_VERSION,
  mentorEvaluationPolicy,
  promotionThresholds,
} from "@/lib/agent-policy";
import { percentile, recordAgentTrace } from "@/lib/agent-observability";

type EvalResult = {
  id: string;
  label: string;
  score: number;
  passed: boolean;
  errorCode: string | null;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  forbiddenHits: string[];
  output: string;
};

async function evaluateModel(model: string) {
  const results: EvalResult[] = [];

  for (const test of evalCases) {
    const skill = selectAgentSkill("tutor", test.prompt);
    let output = "";
    let errorCode: string | null = null;
    let latencyMs = 0;
    let promptTokens: number | null = null;
    let completionTokens: number | null = null;
    let totalTokens: number | null = null;

    try {
      const telemetry = await callAIWithTelemetry(
        [
          {
            role: "system",
            content:
              "You are the Full Stack Master Class mentor under benchmark evaluation. " +
              mentorEvaluationPolicy +
              " Active skill: " +
              skill.label +
              ". " +
              skill.instructions,
          },
          { role: "user", content: test.prompt },
        ],
        {
          temperature: 0,
          maxTokens: 800,
          model,
          disableFallback: true,
        },
      );

      output = telemetry?.content || "";
      latencyMs = telemetry?.latencyMs || 0;
      promptTokens = telemetry?.usage.promptTokens ?? null;
      completionTokens = telemetry?.usage.completionTokens ?? null;
      totalTokens = telemetry?.usage.totalTokens ?? null;
    } catch (error) {
      errorCode = getAIErrorCode(error);
    }

    const scored = scoreEvalResponse(output, test);
    results.push({
      id: test.id,
      label: test.label,
      score: scored.score,
      passed: scored.passed,
      errorCode,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      forbiddenHits: scored.forbiddenHits,
      output: output.slice(0, 4000),
    });
  }

  const validLatencies = results
    .map((item) => item.latencyMs)
    .filter((value) => value > 0);
  const tokens = results
    .map((item) => item.totalTokens)
    .filter((value): value is number => typeof value === "number");

  const score = Math.round(
    results.reduce((sum, item) => sum + item.score, 0) /
      Math.max(1, results.length),
  );
  const passed = results.filter((item) => item.passed).length;
  const passRate = Math.round(
    (passed / Math.max(1, results.length)) * 100,
  );
  const criticalFailures = results.filter(
    (item) => item.errorCode || item.forbiddenHits.length > 0,
  ).length;

  return {
    model,
    score,
    passed,
    total: results.length,
    passRate,
    criticalFailures,
    p50LatencyMs: percentile(validLatencies, 50),
    p95LatencyMs: percentile(validLatencies, 95),
    totalTokens: tokens.length
      ? tokens.reduce((sum, value) => sum + value, 0)
      : null,
    averageTokens: tokens.length
      ? Math.round(tokens.reduce((sum, value) => sum + value, 0) / tokens.length)
      : null,
    results,
  };
}

export async function GET() {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json(
      { error: "Instructor access required." },
      { status: 403 },
    );
  }

  const db = await getDb();
  const rows = await db
    .collection(collections.modelBenchmarks)
    .find()
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json({
    runs: rows.map((row) => ({
      id: row._id.toString(),
      baseline: row.baseline,
      candidate: row.candidate,
      gate: row.gate,
      policyVersion: row.policyVersion,
      createdAt: row.createdAt,
    })),
    currentModel: getAIStatus().model,
    candidateDefault: process.env.AI_CANDIDATE_MODEL?.trim() || "",
    policyVersion: AGENT_POLICY_VERSION,
    thresholds: promotionThresholds,
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json(
      { error: "Instructor access required." },
      { status: 403 },
    );
  }

  const aiStatus = getAIStatus();
  const baselineModel = aiStatus.model;
  if (!baselineModel) {
    return NextResponse.json(
      { error: "Production AI model is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const candidateModel = String(
    body.candidateModel || process.env.AI_CANDIDATE_MODEL || "",
  )
    .trim()
    .slice(0, 200);

  if (!candidateModel || /s/.test(candidateModel)) {
    return NextResponse.json(
      { error: "Enter a valid candidate model ID without spaces." },
      { status: 400 },
    );
  }
  if (candidateModel === baselineModel) {
    return NextResponse.json(
      { error: "Candidate model must differ from the production baseline." },
      { status: 400 },
    );
  }

  const baseline = await evaluateModel(baselineModel);
  const candidate = await evaluateModel(candidateModel);

  const checks = {
    minimumScore: candidate.score >= promotionThresholds.minimumScore,
    minimumPassRate:
      candidate.passRate >= promotionThresholds.minimumPassRate,
    noCriticalFailures:
      candidate.criticalFailures <=
      promotionThresholds.maximumCriticalFailures,
    latency:
      candidate.p95LatencyMs <= promotionThresholds.maximumP95LatencyMs,
    scoreRegression:
      candidate.score >=
      baseline.score - promotionThresholds.maximumScoreRegression,
    passRateRegression:
      candidate.passRate >=
      baseline.passRate - promotionThresholds.maximumPassRateRegression,
  };

  const promotable = Object.values(checks).every(Boolean);
  const gate = {
    promotable,
    decision: promotable ? "candidate-clears-gate" : "hold-current-model",
    checks,
    scoreDelta: candidate.score - baseline.score,
    passRateDelta: candidate.passRate - baseline.passRate,
    p95LatencyDeltaMs:
      candidate.p95LatencyMs - baseline.p95LatencyMs,
    tokenDelta:
      candidate.totalTokens !== null && baseline.totalTokens !== null
        ? candidate.totalTokens - baseline.totalTokens
        : null,
  };

  const db = await getDb();
  const insert = await db
    .collection(collections.modelBenchmarks)
    .insertOne({
      baseline,
      candidate,
      gate,
      policyVersion: AGENT_POLICY_VERSION,
      createdBy: staff!.id,
      createdAt: new Date(),
    });

  await recordAgentTrace({
    userId: staff!.id,
    kind: "eval",
    mode: "model-benchmark",
    input:
      "Compare production " +
      baselineModel +
      " against candidate " +
      candidateModel +
      ".",
    output:
      "Gate: " +
      gate.decision +
      "; score delta " +
      gate.scoreDelta +
      "; pass-rate delta " +
      gate.passRateDelta +
      ".",
    status: "completed",
    latencyMs: Date.now() - startedAt,
    provider: aiStatus.provider,
    model: baselineModel,
    metadata: {
      policyVersion: AGENT_POLICY_VERSION,
      candidateModel,
      gate,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    id: insert.insertedId.toString(),
    policyVersion: AGENT_POLICY_VERSION,
    baseline,
    candidate,
    gate,
    thresholds: promotionThresholds,
  });
}
