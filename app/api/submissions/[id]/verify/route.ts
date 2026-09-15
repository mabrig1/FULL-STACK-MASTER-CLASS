import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { fetchRepoEvidence } from "@/lib/github";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const db = await getDb();
  const submission = await db.collection(collections.submissions).findOne({
    _id: new ObjectId(id),
    userId: user.id,
  });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  try {
    const evidence = await fetchRepoEvidence(String(submission.githubUrl));
    const verified = evidence.readme.includes(String(submission.verificationToken));
    await db.collection(collections.submissions).updateOne(
      { _id: submission._id },
      {
        $set: {
          githubVerified: verified,
          status: verified ? "verified" : "awaiting-verification",
          repositoryEvidence: {
            fullName: evidence.fullName,
            language: evidence.language,
            defaultBranch: evidence.defaultBranch,
            updatedAt: evidence.updatedAt,
            pushedAt: evidence.pushedAt,
            homepage: evidence.homepage,
            hasTestScript: evidence.hasTestScript,
            hasBuildScript: evidence.hasBuildScript,
            lastCommitAt: evidence.lastCommitAt,
            readmeLength: evidence.readme.length,
          },
          verifiedAt: verified ? new Date() : null,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      verified,
      repository: evidence.fullName,
      message: verified
        ? "Repository ownership evidence verified."
        : "Verification token was not found in the repository README.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify repository." },
      { status: 400 },
    );
  }
}
