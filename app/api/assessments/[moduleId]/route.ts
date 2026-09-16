import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/course";
import { getCourseContent } from "@/lib/content";
import { collections, getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

function canAccess(moduleId: number, user: Awaited<ReturnType<typeof getCurrentUser>>) {
  const freeLimit = Math.max(1, Number(process.env.FREE_MODULE_LIMIT || "1"));
  return (
    moduleId <= freeLimit ||
    user?.role === "admin" ||
    user?.role === "instructor" ||
    user?.plan === "masterclass" ||
    user?.entitlements.includes("academy")
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId: raw } = await params;
  const moduleId = Number(raw);
  const module = getModule(moduleId);
  if (!module) return NextResponse.json({ error: "Invalid module." }, { status: 404 });

  const user = await getCurrentUser();
  if (!canAccess(moduleId, user)) {
    return NextResponse.json({ error: "Premium access required." }, { status: 403 });
  }

  const content = await getCourseContent(moduleId);
  if (!content.quiz.length) {
    return NextResponse.json({ module, available: false, questions: [] });
  }

  return NextResponse.json({
    module,
    available: true,
    passingScore: 70,
    questions: content.quiz.map((item, index) => ({
      id: index,
      question: item.question,
      options: item.options,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a graded assessment." }, { status: 401 });

  const { moduleId: raw } = await params;
  const moduleId = Number(raw);
  const module = getModule(moduleId);
  if (!module) return NextResponse.json({ error: "Invalid module." }, { status: 404 });
  if (!canAccess(moduleId, user)) {
    return NextResponse.json({ error: "Premium access required." }, { status: 403 });
  }

  const content = await getCourseContent(moduleId);
  if (!content.quiz.length) {
    return NextResponse.json({ error: "This module does not have a graded assessment yet." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const answers = Array.isArray(body.answers) ? body.answers.map(String) : [];

  let correct = 0;
  const review = content.quiz.map((item, index) => {
    const selected = answers[index] || "";
    const isCorrect = selected === item.answer;
    if (isCorrect) correct += 1;
    return {
      index,
      correct: isCorrect,
      selected,
      answer: item.answer,
      explanation: item.explanation,
    };
  });

  const score = Math.round((correct / content.quiz.length) * 100);
  const passed = score >= 70;
  const db = await getDb();

  const attempt = {
    userId: user.id,
    moduleId,
    score,
    correct,
    total: content.quiz.length,
    passed,
    answers,
    contentVersion: content.version,
    createdAt: new Date(),
  };
  await db.collection(collections.assessmentAttempts).insertOne(attempt);

  if (passed) {
    await db.collection(collections.progress).updateOne(
      { userId: user.id, moduleId },
      {
        $set: {
          assessmentPassed: true,
          assessmentScore: score,
          assessmentPassedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date(), status: "in-progress" },
      },
      { upsert: true },
    );

    await createNotification({
      userId: user.id,
      title: "Assessment passed",
      body: "You scored " + score + "% in Module " + moduleId + ": " + module.title + ".",
      href: "/gradebook",
      type: "success",
    });
  }

  return NextResponse.json({ score, passed, correct, total: content.quiz.length, review });
}
