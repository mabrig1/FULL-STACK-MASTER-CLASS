import { courseModules, getModule } from "@/lib/course";
import { collections, getDb } from "@/lib/db";

export type MasteryStatus = "not-started" | "developing" | "competent" | "mastered";

export type ModuleMastery = {
  moduleId: number;
  title: string;
  score: number;
  status: MasteryStatus;
  completed: boolean;
  assessmentBest: number;
  projectBest: number;
  practiceBest: number;
  verifiedProject: boolean;
  prerequisites: number[];
  prerequisiteReady: boolean;
  lastEvidenceAt: Date | null;
};

const explicitPrerequisites: Record<number, number[]> = {
  1: [],
  6: [1],
  7: [6],
  8: [6],
  9: [6],
  10: [6],
  11: [6, 10],
  12: [11],
  13: [11],
  14: [6],
  15: [14],
  16: [15],
  17: [16],
  18: [17],
  19: [17],
  20: [16, 18],
  21: [20],
  22: [20, 21],
  23: [16, 22],
  24: [23],
  25: [16],
  26: [16, 25],
  27: [16, 20],
  28: [21, 27],
  29: [13, 16, 21],
  30: [7, 16],
  31: [7, 30],
  32: [13, 16],
  33: [32],
  34: [30, 32],
  35: [32],
  36: [10, 16],
  37: [36],
  38: [36, 18],
  39: [37, 38],
  40: [37, 39],
  41: [38, 40],
  42: [40],
  43: [13, 16],
  44: [13, 16, 20, 27],
  45: [44, 21],
  46: [44],
  47: [13, 16, 18],
  48: [47],
  49: [47],
  50: [32, 49],
  51: [13, 32],
  52: [9, 13],
  53: [30, 52],
  54: [9, 32],
  55: [30, 54],
  56: [9, 54],
  57: [54],
  58: [57],
  59: [57, 58],
  60: [44, 57],
  61: [27, 44, 58],
  62: [32, 61],
  63: [9, 62],
  64: [9, 63],
};

export function prerequisitesFor(moduleId: number) {
  if (explicitPrerequisites[moduleId]) return explicitPrerequisites[moduleId];
  return moduleId > 1 ? [moduleId - 1] : [];
}

function statusFor(score: number): MasteryStatus {
  if (score >= 80) return "mastered";
  if (score >= 60) return "competent";
  if (score > 0) return "developing";
  return "not-started";
}

function maxScore(rows: any[], field = "score") {
  return rows.reduce((max, row) => Math.max(max, Number(row?.[field] || 0)), 0);
}

function latestDate(...dates: Array<Date | string | null | undefined>) {
  const values = dates
    .filter(Boolean)
    .map((value) => new Date(value as any))
    .filter((value) => !Number.isNaN(value.getTime()));
  if (!values.length) return null;
  return new Date(Math.max(...values.map((value) => value.getTime())));
}

export async function computeMasteryGraph(userId: string) {
  const db = await getDb();
  const [progress, assessments, submissions, practice] = await Promise.all([
    db.collection(collections.progress).find({ userId }).toArray(),
    db.collection(collections.assessmentAttempts).find({ userId }).toArray(),
    db.collection(collections.submissions).find({ userId }).toArray(),
    db.collection(collections.practiceSessions).find({ userId, status: "completed" }).toArray(),
  ]);

  const progressMap = new Map(progress.map((row) => [Number(row.moduleId), row]));
  const assessmentMap = new Map<number, any[]>();
  const submissionMap = new Map<number, any[]>();
  const practiceMap = new Map<number, any[]>();

  for (const row of assessments) {
    const moduleId = Number(row.moduleId);
    assessmentMap.set(moduleId, [...(assessmentMap.get(moduleId) || []), row]);
  }
  for (const row of submissions) {
    const moduleId = Number(row.moduleId);
    submissionMap.set(moduleId, [...(submissionMap.get(moduleId) || []), row]);
  }
  for (const row of practice) {
    const moduleId = Number(row.moduleId);
    practiceMap.set(moduleId, [...(practiceMap.get(moduleId) || []), row]);
  }

  const provisional = courseModules.map((module): ModuleMastery => {
    const p = progressMap.get(module.id);
    const a = assessmentMap.get(module.id) || [];
    const s = submissionMap.get(module.id) || [];
    const pr = practiceMap.get(module.id) || [];

    const completed = p?.status === "completed";
    const assessmentBest = maxScore(a);
    const projectBest = s.reduce((max, row) => Math.max(max, Number(row.grade?.score || 0)), 0);
    const practiceBest = maxScore(pr);
    const verifiedProject = s.some((row) => row.githubVerified);

    const score = Math.round(
      (completed ? 20 : 0) +
      assessmentBest * 0.3 +
      projectBest * 0.25 +
      (verifiedProject ? 10 : 0) +
      practiceBest * 0.15,
    );

    const lastEvidenceAt = latestDate(
      p?.updatedAt,
      ...a.map((row) => row.createdAt),
      ...s.map((row) => row.updatedAt || row.createdAt),
      ...pr.map((row) => row.completedAt || row.createdAt),
    );

    return {
      moduleId: module.id,
      title: module.title,
      score: Math.max(0, Math.min(100, score)),
      status: statusFor(score),
      completed,
      assessmentBest,
      projectBest,
      practiceBest,
      verifiedProject,
      prerequisites: prerequisitesFor(module.id),
      prerequisiteReady: false,
      lastEvidenceAt,
    };
  });

  const masteryById = new Map(provisional.map((item) => [item.moduleId, item]));
  for (const item of provisional) {
    item.prerequisiteReady = item.prerequisites.every(
      (id) => (masteryById.get(id)?.score || 0) >= 60,
    );
  }

  return provisional;
}

export async function computeAdaptiveState(userId: string) {
  const db = await getDb();
  const mastery = await computeMasteryGraph(userId);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [recentAssessments, recentMemories, duePractice] = await Promise.all([
    db.collection(collections.assessmentAttempts)
      .find({ userId, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection(collections.memories)
      .find({ userId, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
    db.collection(collections.practiceSessions)
      .find({ userId, status: "completed", nextReviewAt: { $lte: now } })
      .sort({ nextReviewAt: 1 })
      .limit(20)
      .toArray(),
  ]);

  const failures = recentAssessments.filter((row) => !row.passed).length;
  const avgRecent = recentAssessments.length
    ? recentAssessments.reduce((sum, row) => sum + Number(row.score || 0), 0) / recentAssessments.length
    : 100;

  const repeatedByModule = new Map<number, number>();
  for (const row of recentAssessments.filter((row) => !row.passed)) {
    const id = Number(row.moduleId);
    repeatedByModule.set(id, (repeatedByModule.get(id) || 0) + 1);
  }
  const repeatedFailures = Math.max(0, ...Array.from(repeatedByModule.values()), 0);

  const loadScore = Math.min(
    100,
    failures * 14 +
      Math.max(0, 70 - avgRecent) * 0.8 +
      Math.max(0, recentMemories.length - 12) * 1.5 +
      repeatedFailures * 10,
  );
  const loadLevel = loadScore >= 65 ? "high" : loadScore >= 35 ? "medium" : "low";

  const dueModuleIds = Array.from(new Set(duePractice.map((row) => Number(row.moduleId))));
  const weakMastery = mastery
    .filter((item) => item.score > 0 && item.score < 60)
    .sort((a, b) => a.score - b.score || a.moduleId - b.moduleId);

  let recommendation:
    | { type: "review" | "practice" | "advance" | "recover"; moduleId: number; title: string; reason: string }
    | null = null;

  if (loadLevel === "high" && weakMastery[0]) {
    recommendation = {
      type: "recover",
      moduleId: weakMastery[0].moduleId,
      title: weakMastery[0].title,
      reason: "Recent retries and low scores suggest overload. Consolidate one weak concept before adding new material.",
    };
  } else if (dueModuleIds.length) {
    const item = mastery.find((row) => row.moduleId === dueModuleIds[0]);
    if (item) {
      recommendation = {
        type: "review",
        moduleId: item.moduleId,
        title: item.title,
        reason: "A previous practice session is due for spaced review.",
      };
    }
  } else if (weakMastery[0]) {
    recommendation = {
      type: "practice",
      moduleId: weakMastery[0].moduleId,
      title: weakMastery[0].title,
      reason: "Evidence exists, but mastery is below the competency threshold.",
    };
  } else {
    const next = mastery.find((item) => !item.completed && item.prerequisiteReady) || mastery.find((item) => !item.completed);
    if (next) {
      recommendation = {
        type: "advance",
        moduleId: next.moduleId,
        title: next.title,
        reason: next.prerequisiteReady
          ? "Prerequisite mastery is sufficient for this next step."
          : "This is the earliest unfinished module; strengthen prerequisites as needed.",
      };
    }
  }

  return {
    mastery,
    recommendation,
    reviewQueue: dueModuleIds.map((moduleId) => {
      const module = getModule(moduleId);
      return { moduleId, title: module?.title || "Module " + moduleId };
    }),
    cognitiveLoad: {
      score: Math.round(loadScore),
      level: loadLevel,
      signals: {
        failedAssessments7d: failures,
        averageAssessment7d: Math.round(avgRecent),
        mentorInteractions7d: recentMemories.length,
        maxRepeatedFailures: repeatedFailures,
      },
      intervention:
        loadLevel === "high"
          ? "Reduce task breadth, use one worked example, then verify one small success."
          : loadLevel === "medium"
            ? "Keep tasks short and add a quick retrieval-practice check before advancing."
            : "Normal progression is appropriate.",
    },
  };
}
