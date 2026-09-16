import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { percentile } from "@/lib/agent-observability";

export async function GET() {
  const staff = await getCurrentUser();
  if (!canManageAcademy(staff)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const db = await getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const traces = await db.collection(collections.agentTraces)
    .find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(5000)
    .toArray();

  const latencies = traces.map((row) => Number(row.latencyMs || 0)).filter((value) => value >= 0);
  const live = traces.filter((row) => row.status === "live").length;
  const fallback = traces.filter((row) => row.status === "fallback").length;
  const errors = traces.filter((row) => row.status === "error").length;
  const grounded = traces.filter((row) => row.groundingStrength === "strong").length;

  const byKind = new Map<string, { total: number; live: number; fallback: number; latency: number[] }>();
  for (const row of traces) {
    const kind = String(row.kind || "unknown");
    const stats = byKind.get(kind) || { total: 0, live: 0, fallback: 0, latency: [] };
    stats.total += 1;
    if (row.status === "live") stats.live += 1;
    if (row.status === "fallback") stats.fallback += 1;
    stats.latency.push(Number(row.latencyMs || 0));
    byKind.set(kind, stats);
  }

  const kinds = Array.from(byKind.entries())
    .map(([kind, stats]) => ({
      kind,
      total: stats.total,
      liveRate: stats.total ? Math.round((stats.live / stats.total) * 100) : 0,
      fallbackRate: stats.total ? Math.round((stats.fallback / stats.total) * 100) : 0,
      p50LatencyMs: percentile(stats.latency, 50),
      p95LatencyMs: percentile(stats.latency, 95),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    windowDays: 7,
    metrics: {
      total: traces.length,
      liveRate: traces.length ? Math.round((live / traces.length) * 100) : 0,
      fallbackRate: traces.length ? Math.round((fallback / traces.length) * 100) : 0,
      errorRate: traces.length ? Math.round((errors / traces.length) * 100) : 0,
      strongGroundingRate: traces.length ? Math.round((grounded / traces.length) * 100) : 0,
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
    },
    kinds,
    recent: traces.slice(0, 100).map((row) => ({
      id: row._id.toString(),
      kind: row.kind,
      mode: row.mode || "",
      status: row.status,
      latencyMs: Number(row.latencyMs || 0),
      provider: row.provider || null,
      model: row.model || null,
      skill: row.skill || null,
      groundingStrength: row.groundingStrength || null,
      retrievedModules: row.retrievedModules || [],
      input: row.input || "",
      output: row.output || "",
      metadata: row.metadata || {},
      createdAt: row.createdAt,
    })),
  });
}
