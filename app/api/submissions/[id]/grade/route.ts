import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { callAI, parseJsonObject } from "@/lib/ai";
import { getCurrentUser, canManageAcademy } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { getModule } from "@/lib/course";
import { fetchRepoEvidence } from "@/lib/github";

type AIGrade = {
  adjustment?: number;
  strengths?: string[];
  risks?: string[];
  nextActions?: string[];
  summary?: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const db = await getDb();
  const submission = await db.collection(collections.submissions).findOne({ _id: new ObjectId(id) });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (submission.userId !== user.id && !canManageAcademy(user)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const module = getModule(Number(submission.moduleId));
  if (!module) return NextResponse.json({ error: "Module no longer exists." }, { status: 400 });

  let evidence;
  try {
    evidence = await fetchRepoEvidence(String(submission.githubUrl));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Repository could not be inspected." },
      { status: 400 },
    );
  }

  const recentMs = evidence.lastCommitAt ? Date.now() - new Date(evidence.lastCommitAt).getTime() : Infinity;
  const recent = recentMs < 120 * 24 * 60 * 60 * 1000;

  const rubric = {
    ownershipVerification: submission.githubVerified ? 20 : 0,
    documentation: evidence.readme.length >= 700 ? 15 : evidence.readme.length >= 250 ? 10 : 4,
    engineeringSignals: Math.min(25, (evidence.packageJson ? 10 : 0) + (evidence.hasBuildScript ? 10 : 0) + (evidence.language ? 5 : 0)),
    testing: evidence.hasTestScript ? 15 : 3,
    deployment: submission.demoUrl || evidence.homepage ? 15 : 2,
    recency: recent ? 10 : 3,
  };
  const baseScore = Object.values(rubric).reduce((sum, value) => sum + value, 0);

  let aiGrade: AIGrade | null = null;
  try {
    const response = await callAI([
      {
        role: "system",
        content:
          "You are the independent Full Stack Master Class project assessor. Review the supplied project evidence against the module challenge. " +
          "Return JSON only with adjustment from -8 to 8, strengths array, risks array, nextActions array and summary. " +
          "Do not claim to have executed code. Penalize vague documentation or evidence that does not address the challenge.",
      },
      {
        role: "user",
        content:
          "Module: " + module.title +
          "\nChallenge: " + module.challenge +
          "\nRepository: " + evidence.fullName +
          "\nLanguage: " + evidence.language +
          "\nREADME excerpt:\n" + evidence.readme.slice(0, 5000) +
          "\nLearner notes:\n" + String(submission.notes || "").slice(0, 2000),
      },
    ]);
    aiGrade = parseJsonObject<AIGrade>(response);
  } catch {
    aiGrade = null;
  }

  const adjustment = Math.max(-8, Math.min(8, Number(aiGrade?.adjustment || 0)));
  const score = Math.max(0, Math.min(100, Math.round(baseScore + adjustment)));
  const grade = {
    score,
    baseScore,
    adjustment,
    rubric,
    strengths: aiGrade?.strengths || [
      submission.githubVerified ? "Repository ownership is verified." : "Repository is accessible for review.",
    ],
    risks: aiGrade?.risks || [
      ...(evidence.hasTestScript ? [] : ["No meaningful automated test script was detected."]),
      ...(submission.demoUrl || evidence.homepage ? [] : ["No public deployment evidence was provided."]),
    ],
    nextActions: aiGrade?.nextActions || [
      "Strengthen README reproduction steps.",
      "Add a meaningful automated test.",
      "Publish a live deployment when appropriate.",
    ],
    summary: aiGrade?.summary || "Automated evidence-based assessment completed.",
    gradedAt: new Date(),
  };

  await db.collection(collections.submissions).updateOne(
    { _id: submission._id },
    { $set: { grade, status: "graded", updatedAt: new Date() } },
  );

  return NextResponse.json({ grade });
}
