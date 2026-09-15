import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { getModule } from "@/lib/course";
import { parseGitHubUrl } from "@/lib/github";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDb();
  const rows = await db.collection(collections.submissions)
    .find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    submissions: rows.map((row) => ({
      id: row._id.toString(),
      moduleId: row.moduleId,
      githubUrl: row.githubUrl,
      demoUrl: row.demoUrl || "",
      githubVerified: Boolean(row.githubVerified),
      status: row.status || "submitted",
      grade: row.grade || null,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const moduleId = Number(body.moduleId);
  const githubUrl = String(body.githubUrl || "").trim();
  const demoUrl = String(body.demoUrl || "").trim();
  const notes = String(body.notes || "").trim().slice(0, 4000);

  if (!getModule(moduleId) || !parseGitHubUrl(githubUrl)) {
    return NextResponse.json({ error: "Choose a valid module and GitHub repository URL." }, { status: 400 });
  }

  const verificationToken = "FSMC-VERIFY:" + randomBytes(12).toString("hex");
  const now = new Date();
  const db = await getDb();
  const result = await db.collection(collections.submissions).insertOne({
    userId: user.id,
    revieweeId: user.id,
    moduleId,
    githubUrl,
    demoUrl,
    notes,
    verificationToken,
    githubVerified: false,
    status: "awaiting-verification",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    id: result.insertedId.toString(),
    verificationToken,
    instructions:
      "Add the exact verification token to the repository README, commit and push it, then run verification.",
  });
}
