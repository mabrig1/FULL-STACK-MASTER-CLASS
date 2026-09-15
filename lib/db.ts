import { Db, MongoClient } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;
let indexesPromise: Promise<void> | null = null;

export const collections = {
  users: "users",
  sessions: "sessions",
  progress: "progress",
  submissions: "submissions",
  memories: "agent_memories",
  studyPlans: "study_plans",
  payments: "payments",
  cohorts: "cohorts",
  peerReviews: "peer_reviews",
  certificates: "certificates",
} as const;

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

async function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB || "full_stack_master_class");
  await ensureIndexes(db);
  return db;
}

function ensureIndexes(db: Db) {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      await Promise.all([
        db.collection(collections.users).createIndex({ email: 1 }, { unique: true }),
        db.collection(collections.sessions).createIndex({ tokenHash: 1 }, { unique: true }),
        db.collection(collections.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection(collections.progress).createIndex({ userId: 1, moduleId: 1 }, { unique: true }),
        db.collection(collections.submissions).createIndex({ userId: 1, createdAt: -1 }),
        db.collection(collections.memories).createIndex({ userId: 1, createdAt: -1 }),
        db.collection(collections.studyPlans).createIndex({ userId: 1, createdAt: -1 }),
        db.collection(collections.payments).createIndex({ reference: 1 }, { unique: true }),
        db.collection(collections.cohorts).createIndex({ code: 1 }, { unique: true }),
        db.collection(collections.peerReviews).createIndex({ reviewerId: 1, submissionId: 1 }, { unique: true }),
        db.collection(collections.certificates).createIndex({ certificateId: 1 }, { unique: true }),
      ]);
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  return indexesPromise;
}
