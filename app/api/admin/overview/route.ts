import { NextResponse } from "next/server";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";
import { collections, getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!canManageAcademy(user)) return NextResponse.json({ error: "Instructor access required." }, { status: 403 });
  const db = await getDb();

  const [learners, submissions, verified, cohorts, payments, recentSubmissions] = await Promise.all([
    db.collection(collections.users).countDocuments({ role: "student" }),
    db.collection(collections.submissions).countDocuments(),
    db.collection(collections.submissions).countDocuments({ githubVerified: true }),
    db.collection(collections.cohorts).countDocuments(),
    db.collection(collections.payments).find({ status: "success" }).toArray(),
    db.collection(collections.submissions).find().sort({ createdAt: -1 }).limit(10).toArray(),
  ]);

  const revenueNgn = payments.reduce((sum, item) => sum + Number(item.amountNgn || 0), 0);
  return NextResponse.json({
    metrics: { learners, submissions, verified, cohorts, revenueNgn },
    recentSubmissions: recentSubmissions.map((item) => ({
      id: item._id.toString(),
      moduleId: item.moduleId,
      githubUrl: item.githubUrl,
      verified: Boolean(item.githubVerified),
      score: item.grade?.score ?? null,
      createdAt: item.createdAt,
    })),
  });
}
