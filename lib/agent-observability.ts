import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export type AgentTraceInput = {
  userId?: string | null;
  kind: "mentor" | "orchestrator" | "practice" | "visual" | "grading" | "remediation" | "eval";
  mode?: string;
  input?: string;
  output?: string;
  status: "live" | "fallback" | "error" | "completed";
  latencyMs: number;
  provider?: string | null;
  model?: string | null;
  skill?: string | null;
  groundingStrength?: string | null;
  retrievedModules?: number[];
  metadata?: Record<string, unknown>;
};

export async function recordAgentTrace(input: AgentTraceInput) {
  if (!isDatabaseConfigured()) return;
  const db = await getDb();
  await db.collection(collections.agentTraces).insertOne({
    ...input,
    userId: input.userId || null,
    input: String(input.input || "").slice(0, 3000),
    output: String(input.output || "").slice(0, 8000),
    retrievedModules: input.retrievedModules || [],
    metadata: input.metadata || {},
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}
