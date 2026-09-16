import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";
import { computeJobReadiness } from "@/lib/readiness";
import { isEmailConfigured } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const requestedUserId = String(body.userId || requester.id);

  if (requestedUserId !== requester.id && !canManageAcademy(requester)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  if (!ObjectId.isValid(requestedUserId)) {
    return NextResponse.json({ error: "Invalid learner." }, { status: 400 });
  }

  const db = await getDb();
  const learner = await db.collection(collections.users).findOne({
    _id: new ObjectId(requestedUserId),
  });
  if (!learner) return NextResponse.json({ error: "Learner not found." }, { status: 404 });

  const [completed, verifiedProjects, passedAssessments] = await Promise.all([
    db.collection(collections.progress).countDocuments({
      userId: requestedUserId,
      status: "completed",
    }),
    db.collection(collections.submissions).countDocuments({
      userId: requestedUserId,
      githubVerified: true,
    }),
    db.collection(collections.assessmentAttempts).countDocuments({
      userId: requestedUserId,
      passed: true,
    }),
  ]);

  const readiness = await computeJobReadiness(requestedUserId);
  const emailVerified = Boolean(learner.emailVerifiedAt);
  const emailVerificationRequired = isEmailConfigured();

  const eligible =
    completed >= courseModules.length &&
    verifiedProjects >= 3 &&
    passedAssessments >= 1 &&
    readiness.total >= 70 &&
    (!emailVerificationRequired || emailVerified);

  if (!eligible && !canManageAcademy(requester)) {
    return NextResponse.json(
      {
        error: "Certificate criteria not met.",
        criteria: {
          modules: completed + "/" + courseModules.length,
          verifiedProjects,
          passedAssessments,
          readiness: readiness.total,
          emailVerified,
        },
      },
      { status: 400 },
    );
  }

  const existing = await db.collection(collections.certificates).findOne({
    userId: requestedUserId,
    courseId: "full-stack-master-class",
    status: "valid",
  });
  if (existing) {
    return NextResponse.json({
      certificateId: existing.certificateId,
      alreadyIssued: true,
      verifyUrl:
        (process.env.APP_URL || "https://fullstack.mabrigkorie.org") +
        "/verify/" +
        existing.certificateId,
    });
  }

  const certificateId =
    "FSMC-" + new Date().getFullYear() + "-" + randomBytes(5).toString("hex").toUpperCase();

  await db.collection(collections.certificates).insertOne({
    certificateId,
    userId: requestedUserId,
    learnerName: learner.name,
    courseId: "full-stack-master-class",
    courseTitle: "Full Stack Master Class",
    readinessScore: readiness.total,
    completedModules: completed,
    verifiedProjects,
    passedAssessments,
    emailVerified,
    issuedAt: new Date(),
    issuedBy: requester.id,
    status: "valid",
  });

  const verifyUrl =
    (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(/\/$/, "") +
    "/verify/" +
    certificateId;

  await createNotification({
    userId: requestedUserId,
    title: "Certificate issued",
    body: "Your Full Stack Master Class credential is ready and publicly verifiable.",
    href: "/verify/" + certificateId,
    type: "credential",
  });

  return NextResponse.json({ certificateId, verifyUrl });
}
