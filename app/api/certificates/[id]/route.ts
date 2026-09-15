import { NextResponse } from "next/server";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return NextResponse.json({ valid: false }, { status: 503 });
  const { id } = await params;
  const db = await getDb();
  const certificate = await db.collection(collections.certificates).findOne({ certificateId: id });
  if (!certificate) return NextResponse.json({ valid: false }, { status: 404 });

  return NextResponse.json({
    valid: certificate.status === "valid",
    certificate: {
      certificateId: certificate.certificateId,
      learnerName: certificate.learnerName,
      courseTitle: certificate.courseTitle,
      issuedAt: certificate.issuedAt,
      readinessScore: certificate.readinessScore,
      verifiedProjects: certificate.verifiedProjects,
      status: certificate.status,
    },
  });
}
