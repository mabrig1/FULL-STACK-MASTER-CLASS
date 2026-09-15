import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDb();
  const cohorts = await db.collection(collections.cohorts).find({ memberIds: user.id }).toArray();
  const peers = Array.from(new Set(cohorts.flatMap((item) => item.memberIds || []))).filter((id) => id !== user.id);
  const reviewed = await db.collection(collections.peerReviews)
    .find({ reviewerId: user.id })
    .project({ submissionId: 1 })
    .toArray();
  const reviewedIds = reviewed.map((item) => item.submissionId);

  const queue = await db.collection(collections.submissions)
    .find({
      userId: { $in: peers },
      githubVerified: true,
      _id: { $nin: reviewedIds.filter((id) => ObjectId.isValid(String(id))).map((id) => new ObjectId(String(id))) },
    })
    .limit(20)
    .toArray();

  return NextResponse.json({
    queue: queue.map((item) => ({
      id: item._id.toString(),
      moduleId: item.moduleId,
      githubUrl: item.githubUrl,
      demoUrl: item.demoUrl || "",
      grade: item.grade || null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const submissionId = String(body.submissionId || "");
  if (!ObjectId.isValid(submissionId)) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  const feedback = String(body.feedback || "").trim().slice(0, 4000);
  const ratings = {
    correctness: Math.max(1, Math.min(5, Number(body.correctness || 0))),
    maintainability: Math.max(1, Math.min(5, Number(body.maintainability || 0))),
    documentation: Math.max(1, Math.min(5, Number(body.documentation || 0))),
  };
  if (feedback.length < 30 || Object.values(ratings).some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: "Provide ratings and at least 30 characters of constructive feedback." }, { status: 400 });
  }

  const db = await getDb();
  const submission = await db.collection(collections.submissions).findOne({ _id: new ObjectId(submissionId) });
  if (!submission || !submission.githubVerified) return NextResponse.json({ error: "Verified submission not found." }, { status: 404 });
  if (submission.userId === user.id) return NextResponse.json({ error: "You cannot review your own submission." }, { status: 400 });

  const cohort = await db.collection(collections.cohorts).findOne({
    memberIds: { $all: [user.id, submission.userId] },
  });
  if (!cohort) return NextResponse.json({ error: "Peer review requires a shared cohort." }, { status: 403 });

  const overall = Number(((ratings.correctness + ratings.maintainability + ratings.documentation) / 3).toFixed(1));
  try {
    await db.collection(collections.peerReviews).insertOne({
      reviewerId: user.id,
      revieweeId: submission.userId,
      submissionId: submission._id,
      cohortId: cohort._id,
      ratings,
      overall,
      feedback,
      createdAt: new Date(),
    });
  } catch {
    return NextResponse.json({ error: "You have already reviewed this submission." }, { status: 409 });
  }
  return NextResponse.json({ saved: true, overall });
}
