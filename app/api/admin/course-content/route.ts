import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";
import { getModule } from "@/lib/course";
import { defaultCourseContent } from "@/lib/content";
import { writeAuditEvent } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const moduleId = Number(new URL(request.url).searchParams.get("moduleId") || "1");
  const module = getModule(moduleId);
  if (!module) return NextResponse.json({ error: "Invalid module." }, { status: 400 });

  const db = await getDb();
  const row = await db.collection(collections.courseContent).findOne({ moduleId });
  return NextResponse.json({
    module,
    content: row || defaultCourseContent(moduleId),
    source: row ? "database" : "default",
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) {
    return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const moduleId = Number(body.moduleId);
  if (!getModule(moduleId)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 });
  }

  const content = body.content;
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Lesson content is required." }, { status: 400 });
  }

  const normalized = {
    moduleId,
    summary: String(content.summary || "").slice(0, 8000),
    objectives: Array.isArray(content.objectives) ? content.objectives.slice(0, 20).map(String) : [],
    sections: Array.isArray(content.sections)
      ? content.sections.slice(0, 30).map((item: any) => ({
          title: String(item.title || "").slice(0, 200),
          body: String(item.body || "").slice(0, 12000),
        }))
      : [],
    lab: {
      title: String(content.lab?.title || "").slice(0, 300),
      steps: Array.isArray(content.lab?.steps) ? content.lab.steps.slice(0, 30).map(String) : [],
      deliverable: String(content.lab?.deliverable || "").slice(0, 5000),
    },
    quiz: Array.isArray(content.quiz)
      ? content.quiz.slice(0, 20).map((item: any) => ({
          question: String(item.question || "").slice(0, 1000),
          options: Array.isArray(item.options) ? item.options.slice(0, 8).map(String) : [],
          answer: String(item.answer || "").slice(0, 1000),
          explanation: String(item.explanation || "").slice(0, 3000),
        }))
      : [],
    reflection: String(content.reflection || "").slice(0, 5000),
  };

  if (!normalized.summary || normalized.objectives.length < 1 || normalized.sections.length < 1) {
    return NextResponse.json(
      { error: "Provide a summary, at least one objective and at least one lesson section." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = await db.collection(collections.courseContent).findOne({ moduleId });
  const version = Number(existing?.version || 0) + 1;

  await db.collection(collections.courseContent).updateOne(
    { moduleId },
    {
      $set: {
        ...normalized,
        version,
        updatedAt: new Date(),
        updatedBy: user!.id,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  await writeAuditEvent({
    event: "course.content_updated",
    actorId: user!.id,
    actorEmail: user!.email,
    request,
    metadata: { moduleId, version },
  });

  return NextResponse.json({ saved: true, moduleId, version });
}
