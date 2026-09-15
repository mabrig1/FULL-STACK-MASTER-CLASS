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
  courseKnowledge: "course_knowledge",
} as const;

function buildMongoUri() {
  if (process.env.MONGODB_URI?.trim()) {
    return process.env.MONGODB_URI.trim();
  }

  const username = (process.env.MONGODB_USERNAME || "fullstack").trim();
  const password = process.env.MONGODB_PASSWORD || "";
  const host = (process.env.MONGODB_CLUSTER_HOST || "learnhub.07ozegd.mongodb.net").trim();
  const appName = (process.env.MONGODB_APP_NAME || "learnhub").trim();

  if (!password) return null;

  return (
    "mongodb+srv://" +
    encodeURIComponent(username) +
    ":" +
    encodeURIComponent(password) +
    "@" +
    host +
    "/?retryWrites=true&w=majority&appName=" +
    encodeURIComponent(appName)
  );
}

export function isDatabaseConfigured() {
  return Boolean(buildMongoUri());
}

export function databaseConfigSource() {
  if (process.env.MONGODB_URI?.trim()) return "MONGODB_URI";
  if (process.env.MONGODB_PASSWORD) return "structured-atlas-env";
  return "not-configured";
}

async function getClient() {
  const uri = buildMongoUri();
  if (!uri) {
    throw new Error(
      "MongoDB is not configured. Set MONGODB_PASSWORD or provide a complete MONGODB_URI.",
    );
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      retryWrites: true,
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
        db.collection(collections.courseKnowledge).createIndex({ moduleId: 1 }, { unique: true }),
      ]);
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  return indexesPromise;
}
