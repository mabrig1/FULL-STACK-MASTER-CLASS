import { NextResponse } from "next/server";
import { databaseConfigSource, getDb, isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        configured: false,
        database: process.env.MONGODB_DB || "full_stack_master_class",
        cluster: process.env.MONGODB_CLUSTER_HOST || "learnhub.07ozegd.mongodb.net",
        configSource: databaseConfigSource(),
      },
      { status: 503 },
    );
  }

  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    return NextResponse.json({
      connected: true,
      configured: true,
      database: db.databaseName,
      cluster: process.env.MONGODB_CLUSTER_HOST || "learnhub.07ozegd.mongodb.net",
      configSource: databaseConfigSource(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        configured: true,
        database: process.env.MONGODB_DB || "full_stack_master_class",
        cluster: process.env.MONGODB_CLUSTER_HOST || "learnhub.07ozegd.mongodb.net",
        configSource: databaseConfigSource(),
        error: error instanceof Error ? error.message : "MongoDB connection failed.",
      },
      { status: 503 },
    );
  }
}
