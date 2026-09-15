import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export async function loadAgentMemories(userId: string, limit = 6) {
  if (!isDatabaseConfigured()) return [];
  const db = await getDb();
  return db
    .collection(collections.memories)
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function saveAgentMemory(input: {
  userId: string;
  scope: string;
  summary: string;
  learnerMessage?: string;
  agentReply?: string;
  tags?: string[];
  importance?: number;
}) {
  if (!isDatabaseConfigured()) return;
  const db = await getDb();
  await db.collection(collections.memories).insertOne({
    ...input,
    learnerMessage: String(input.learnerMessage || "").slice(0, 3000),
    agentReply: String(input.agentReply || "").slice(0, 6000),
    tags: input.tags || [],
    importance: input.importance ?? 1,
    createdAt: new Date(),
  });
}
