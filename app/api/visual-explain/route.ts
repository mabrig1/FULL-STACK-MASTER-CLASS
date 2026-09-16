import { NextResponse } from "next/server";
import { callAI, parseJsonObject } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/course";
import { getCourseContent } from "@/lib/content";
import { requestFingerprint } from "@/lib/security";
import { consumeAIQuota } from "@/lib/usage";

type VisualNode = {
  id: string;
  label: string;
  detail: string;
};

type VisualEdge = {
  from: string;
  to: string;
  label: string;
};

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

function fallbackVisual(content: Awaited<ReturnType<typeof getCourseContent>>) {
  const nodes = content.objectives.slice(0, 6).map((objective, index) => ({
    id: "n" + (index + 1),
    label: "Concept " + (index + 1),
    detail: objective,
  }));
  return {
    title: "Lesson concept map",
    summary: content.summary,
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      from: nodes[index].id,
      to: node.id,
      label: "builds toward",
    })),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const moduleId = Number(body.moduleId);
  const focus = String(body.focus || "").trim().slice(0, 800);
  const module = getModule(moduleId);
  if (!module) return NextResponse.json({ error: "Invalid module." }, { status: 404 });

  const user = await getCurrentUser();
  if (!canAccess(moduleId, user)) {
    return NextResponse.json({ error: "Premium access required." }, { status: 403 });
  }

  const quota = await consumeAIQuota({
    subject: user ? "user:" + user.id : "anon:" + requestFingerprint(request),
    user,
    feature: "mentor",
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: "Daily AI mentor allowance reached.", quota }, { status: 429 });
  }

  const content = await getCourseContent(moduleId);
  let visual = null as ReturnType<typeof fallbackVisual> | null;

  try {
    const raw = await callAI([
      {
        role: "system",
        content:
          "You are a visual teaching agent for software engineering. Return JSON only with " +
          "{title:string,summary:string,nodes:[{id:string,label:string,detail:string}],edges:[{from:string,to:string,label:string}]}. " +
          "Use 4-7 nodes. Make relationships pedagogically useful, concise and grounded only in the supplied lesson. " +
          "Prefer flow, prerequisite, cause/effect or system-boundary relationships. No markdown.",
      },
      {
        role: "user",
        content:
          "Module: " + module.title +
          "\nLearner focus: " + (focus || "Explain the core mental model") +
          "\nSummary: " + content.summary +
          "\nObjectives:\n- " + content.objectives.join("\n- ") +
          "\nSections:\n" +
          content.sections.map((section) => section.title + ": " + section.body).join("\n").slice(0, 10000),
      },
    ], { temperature: 0.25, maxTokens: 1500 });

    const parsed = parseJsonObject<any>(raw);
    const nodes = Array.isArray(parsed?.nodes)
      ? parsed.nodes.slice(0, 7).map((node: any, index: number) => ({
          id: String(node?.id || "n" + (index + 1)).slice(0, 40),
          label: String(node?.label || "Concept").slice(0, 120),
          detail: String(node?.detail || "").slice(0, 700),
        }))
      : [];
    const ids = new Set(nodes.map((node: VisualNode) => node.id));
    const edges = Array.isArray(parsed?.edges)
      ? parsed.edges
          .slice(0, 10)
          .map((edge: any) => ({
            from: String(edge?.from || ""),
            to: String(edge?.to || ""),
            label: String(edge?.label || "relates to").slice(0, 100),
          }))
          .filter((edge: VisualEdge) => ids.has(edge.from) && ids.has(edge.to))
      : [];

    if (nodes.length >= 3) {
      visual = {
        title: String(parsed?.title || module.title + " concept map").slice(0, 180),
        summary: String(parsed?.summary || content.summary).slice(0, 1500),
        nodes,
        edges,
      };
    }
  } catch {
    visual = null;
  }

  if (!visual) visual = fallbackVisual(content);

  return NextResponse.json({
    moduleId,
    moduleTitle: module.title,
    visual,
    quota,
  });
}
