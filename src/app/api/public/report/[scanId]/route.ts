import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cacheScanResult, getCachedScanResult } from "@/lib/scanCache";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  const cached = await getCachedScanResult(scanId).catch(() => null);
  if (cached) return withCors(NextResponse.json(cached), req);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
  });

  if (!scan) {
    return jsonError(404, "NOT_FOUND", "Report not found.");
  }

  const response = {
    success: true,
    data: {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score: scan.score,
      result: scan.result,
      error: scan.error,
      completedAt: scan.completedAt,
      screenshotPath: scan.screenshotPath,
    },
  };
  if (scan.status === "COMPLETED") await cacheScanResult(scanId, response).catch(() => undefined);
  return withCors(NextResponse.json(response), req);
}
