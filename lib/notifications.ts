import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  href?: string;
  type?: string;
}) {
  if (!isDatabaseConfigured()) return;
  const db = await getDb();
  await db.collection(collections.notifications).insertOne({
    userId: input.userId,
    title: input.title.slice(0, 160),
    body: input.body.slice(0, 1200),
    href: input.href || null,
    type: input.type || "info",
    readAt: null,
    createdAt: new Date(),
  });
}
