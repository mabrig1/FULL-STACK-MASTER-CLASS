import { collections, getDb } from "@/lib/db";
import { courseModules } from "@/lib/course";

export async function computeJobReadiness(userId: string) {
  const db = await getDb();
  const [completed, verifiedProjects, gradedProjects, deployedProjects, peerReviews] = await Promise.all([
    db.collection(collections.progress).countDocuments({ userId, status: "completed" }),
    db.collection(collections.submissions).countDocuments({ userId, githubVerified: true }),
    db.collection(collections.submissions).find({ userId, "grade.score": { $exists: true } }).toArray(),
    db.collection(collections.submissions).countDocuments({ userId, demoUrl: { $nin: ["", null] } }),
    db.collection(collections.peerReviews).find({ revieweeId: userId }).toArray(),
  ]);

  const averageGrade = gradedProjects.length
    ? gradedProjects.reduce((sum, item) => sum + Number(item.grade?.score || 0), 0) / gradedProjects.length
    : 0;
  const averagePeer = peerReviews.length
    ? peerReviews.reduce((sum, item) => sum + Number(item.overall || 0), 0) / peerReviews.length
    : 0;

  const curriculum = Math.min(25, (completed / courseModules.length) * 25);
  const projects = Math.min(30, verifiedProjects * 6);
  const codeQuality = Math.min(20, (averageGrade / 100) * 20);
  const deployment = Math.min(15, deployedProjects * 5);
  const peer = Math.min(10, (averagePeer / 5) * 10);

  const total = Math.round(curriculum + projects + codeQuality + deployment + peer);
  const gaps: string[] = [];
  if (completed < courseModules.length * 0.8) gaps.push("Complete more of the mastery graph.");
  if (verifiedProjects < 3) gaps.push("Verify at least three GitHub projects.");
  if (averageGrade < 70) gaps.push("Raise automated project grades above 70.");
  if (deployedProjects < 2) gaps.push("Deploy at least two projects publicly.");
  if (peerReviews.length < 2) gaps.push("Collect more structured peer feedback.");

  return {
    total,
    breakdown: {
      curriculum: Math.round(curriculum),
      verifiedProjects: Math.round(projects),
      codeQuality: Math.round(codeQuality),
      deployment: Math.round(deployment),
      peerReview: Math.round(peer),
    },
    evidence: {
      completedModules: completed,
      totalModules: courseModules.length,
      verifiedProjects,
      gradedProjects: gradedProjects.length,
      deployedProjects,
      peerReviews: peerReviews.length,
      averageGrade: Math.round(averageGrade),
      averagePeer: Number(averagePeer.toFixed(1)),
    },
    gaps,
  };
}
