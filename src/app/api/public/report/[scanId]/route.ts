import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const scan = await prisma.scan.findUnique({
    where: { id: params.scanId },
  });

  if (!scan) {
    return jsonError(404, "NOT_FOUND", "Report not found.");
  }

  return withCors(
    NextResponse.json({
      success: true,
      data: {
        id: scan.id,
        url: scan.url,
        status: scan.status,
        score: scan.score,
        result: scan.result,
        error: scan.error,
        completedAt: scan.completedAt,
      },
    }),
    req
  );
}