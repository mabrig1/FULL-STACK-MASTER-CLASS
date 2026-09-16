import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { collections, getDb, isDatabaseConfigured } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return new NextResponse("Credential service unavailable", { status: 503 });
  }

  const { id } = await params;
  const db = await getDb();
  const certificate = await db.collection(collections.certificates).findOne({
    certificateId: id,
    status: "valid",
  });

  if (!certificate) {
    return new NextResponse("Credential not found", { status: 404 });
  }

  const base = (process.env.APP_URL || "https://fullstack.mabrigkorie.org").replace(//$/, "");
  const verifyUrl = base + "/verify/" + encodeURIComponent(id);

  const svg = await QRCode.toString(verifyUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
