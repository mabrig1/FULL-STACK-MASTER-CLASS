import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { callAI, getAIStatus, parseJsonObject } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/course";
import { getCourseContent } from "@/lib/content";
import { collections, getDb } from "@/lib/db";
import { computeMasteryGraph } from "@/lib/mastery";
import { createNotification } from "@/lib/notifications";
import { consumeAIQuota } from "@/lib/usage";
import { recordAgentTrace } from "@/lib/agent-observability";

type GeneratedQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  skillTag?: string;
  difficulty?: "foundation" | "applied" | "challenge";
};

function sanitizeQuestions(value: unknown): GeneratedQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 6)
    .map((item: any) => ({
      question: String(item?.question || "").slice(0, 1000),
      options: Array.isArray(item?.options) ? item.options.slice(0, 6).map(String) : [],
      answer: String(item?.answer || "").slice(0, 1000),
      explanation: String(item?.explanation || "").slice(0, 2500),
      skillTag: String(item?.skillTag || "").slice(0, 100),
      difficulty: ["foundation", "applied", "challenge"].includes(String(item?.difficulty))
        ? item.difficulty
        : "applied",
    }))
    .filter((item) => item.question && item.options.length >= 2 && item.answer);
}

function fallbackQuestions(content: Awaited<ReturnType<typeof getCourseContent>>) {
  if (content.quiz.length) {
    return content.quiz.slice(0, 5).map((item) => ({
      question: item.question,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation,
      skillTag: "course-assessment",
      difficulty: "applied" as const,
    }));
  }

  return [
    {
      question: "Which learning action gives the strongest evidence of mastery in this module?",
      options: [
        "Reading the lesson twice",
        "Building and verifying the module challenge",
        "Copying an example without testing it",
        "Memorizing the module title",
      ],
      answer: "Building and verifying the module challenge",
      explanation: "The course is proof-first: mastery should be demonstrated through observable behaviour and evidence.",
      skillTag: "proof-first-engineering",
      difficulty: "foundation" as const,
    },
    {
      question: "What should you do first when your implementation behaves differently from the expected result?",
      options: [
        "Rewrite everything",
        "Change frameworks",
        "Reproduce the smallest failing case and inspect the evidence",
        "Add more features",
      ],
      answer: "Reproduce the smallest failing case and inspect the evidence",
      explanation: "Evidence-driven debugging reduces uncertainty before code changes.",
      skillTag: "debugging",
      difficulty: "applied" as const,
    },
  ];
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "generate");

  if (action === "submit") {
    const sessionId = String(body.sessionId || "");
    if (!ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: "Invalid practice session." }, { status: 400 });
    }

    const db = await getDb();
    const session = await db.collection(collections.practiceSessions).findOne({
      _id: new ObjectId(sessionId),
      userId: user.id,
      status: "active",
    });
    if (!session) return NextResponse.json({ error: "Practice session not found or already submitted." }, { status: 404 });

    const answers = Array.isArray(body.answers) ? body.answers.map(String) : [];
    const questions = Array.isArray(session.questions) ? session.questions : [];
    let correct = 0;
    const review = questions.map((item: any, index: number) => {
      const selected = answers[index] || "";
      const ok = selected === String(item.answer || "");
      if (ok) correct += 1;
      return {
        index,
        correct: ok,
        selected,
        answer: String(item.answer || ""),
        explanation: String(item.explanation || ""),
        skillTag: String(item.skillTag || ""),
      };
    });

    const total = questions.length || 1;
    const score = Math.round((correct / total) * 100);
    const intervalDays = score >= 85 ? 7 : score >= 70 ? 3 : 1;
    const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    await db.collection(collections.practiceSessions).updateOne(
      { _id: session._id },
      {
        $set: {
          answers,
          score,
          correct,
          total: questions.length,
          status: "completed",
          completedAt: new Date(),
          nextReviewAt,
        },
      },
    );

    for (const item of review) {
      const skillTag =
        item.skillTag.trim() ||
        "module-" + session.moduleId + "-concept-" + String(item.index + 1);
      const existing = await db.collection(collections.conceptMastery).findOne({
        userId: user.id,
        moduleId: Number(session.moduleId),
        skillTag,
      });
      const previous = Number(existing?.mastery || 0);
      const attemptScore = item.correct ? 100 : 0;
      const mastery = existing
        ? Math.round(previous * 0.7 + attemptScore * 0.3)
        : attemptScore;

      await db.collection(collections.conceptMastery).updateOne(
        {
          userId: user.id,
          moduleId: Number(session.moduleId),
          skillTag,
        },
        {
          $set: {
            mastery,
            lastCorrect: item.correct,
            lastPracticedAt: new Date(),
            nextReviewAt,
            updatedAt: new Date(),
          },
          $inc: {
            attempts: 1,
            correct: item.correct ? 1 : 0,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    await recordAgentTrace({
      userId: user.id,
      kind: "practice",
      mode: "submit",
      input: "Module " + session.moduleId + " adaptive practice submission",
      output: "Score " + score + "%; " + correct + "/" + questions.length + " correct.",
      status: "completed",
      latencyMs: Date.now() - startedAt,
      retrievedModules: [Number(session.moduleId)],
      metadata: {
        score,
        correct,
        total: questions.length,
        intervalDays,
        weakConcepts: review.filter((item) => !item.correct).map((item) => item.skillTag),
      },
    }).catch(() => undefined);

    if (score >= 85) {
      await createNotification({
        userId: user.id,
        title: "Adaptive practice mastered",
        body: "You scored " + score + "% in Module " + session.moduleId + ". Your next review is scheduled in 7 days.",
        href: "/adaptive",
        type: "mastery",
      });
    }

    return NextResponse.json({
      score,
      correct,
      total: questions.length,
      review,
      nextReviewAt,
      intervalDays,
      weakConcepts: review
        .filter((item) => !item.correct)
        .map((item) => item.skillTag || "module-" + session.moduleId + "-concept-" + String(item.index + 1)),
    });
  }

  const quota = await consumeAIQuota({
    subject: "user:" + user.id,
    user,
    feature: "practice",
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Daily adaptive-practice allowance reached.", quota }, { status: 429 });
  }

  const requestedModuleId = Number(body.moduleId || 0);
  const mastery = await computeMasteryGraph(user.id);
  const target =
    (requestedModuleId > 0 && mastery.find((item) => item.moduleId === requestedModuleId)) ||
    mastery.filter((item) => item.score > 0 && item.score < 70).sort((a, b) => a.score - b.score)[0] ||
    mastery.find((item) => !item.completed && item.prerequisiteReady) ||
    mastery[0];

  if (!target || !getModule(target.moduleId)) {
    return NextResponse.json({ error: "No practice target is available." }, { status: 400 });
  }

  const content = await getCourseContent(target.moduleId);
  const difficulty =
    target.score < 40 ? "foundation" : target.score < 70 ? "applied" : "challenge";

  let questions: GeneratedQuestion[] = [];
  let liveGenerated = false;
  try {
    const raw = await callAI([
      {
        role: "system",
        content:
          "You are an adaptive coding educator. Generate exactly 5 multiple-choice questions grounded only in the supplied lesson. " +
          "The questions should require reasoning and application, not trivia. Return JSON only as " +
          '{questions:[{question:string,options:string[],answer:string,explanation:string,skillTag:string,difficulty:"foundation"|"applied"|"challenge"}]}. ' +
          "Each answer must exactly match one option. Do not include markdown.",
      },
      {
        role: "user",
        content:
          "Module: " + target.title +
          "\nCurrent mastery score: " + target.score + "/100" +
          "\nRequested difficulty: " + difficulty +
          "\nSummary: " + content.summary +
          "\nObjectives:\n- " + content.objectives.join("\n- ") +
          "\nLesson sections:\n" +
          content.sections.map((section) => section.title + ": " + section.body).join("\n").slice(0, 10000),
      },
    ], { temperature: 0.35, maxTokens: 1800 });
    const parsed = parseJsonObject<{ questions?: GeneratedQuestion[] }>(raw);
    questions = sanitizeQuestions(parsed?.questions);
    liveGenerated = questions.length >= 2;
  } catch {
    questions = [];
  }

  if (questions.length < 2) questions = fallbackQuestions(content);

  const db = await getDb();
  const result = await db.collection(collections.practiceSessions).insertOne({
    userId: user.id,
    moduleId: target.moduleId,
    masteryBefore: target.score,
    difficulty,
    questions,
    status: "active",
    createdAt: new Date(),
  });

  const aiStatus = getAIStatus();
  await recordAgentTrace({
    userId: user.id,
    kind: "practice",
    mode: difficulty,
    input: "Generate adaptive practice for Module " + target.moduleId + ": " + target.title,
    output: "Generated " + questions.length + " questions at " + difficulty + " difficulty.",
    status: liveGenerated ? "live" : "fallback",
    latencyMs: Date.now() - startedAt,
    provider: aiStatus.provider,
    model: aiStatus.model,
    retrievedModules: [target.moduleId],
    metadata: {
      masteryBefore: target.score,
      questionCount: questions.length,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    sessionId: result.insertedId.toString(),
    moduleId: target.moduleId,
    moduleTitle: target.title,
    masteryBefore: target.score,
    difficulty,
    questions: questions.map((item, index) => ({
      id: index,
      question: item.question,
      options: item.options,
      skillTag: item.skillTag || "",
      difficulty: item.difficulty || difficulty,
    })),
    quota,
  });
}
