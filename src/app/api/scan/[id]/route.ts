import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cacheScanResult, getCachedScanResult } from "@/lib/scanCache";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const scan = await prisma.scan.findFirst({
    where: { id, userId: auth.ctx.userId },
  });

  if (!scan) {
    return jsonError(404, "NOT_FOUND", "Scan not found.");
  }

  const cached = await getCachedScanResult(id).catch(() => null);
  if (cached) return withCors(NextResponse.json(cached), req);

  const response = {
    success: true,
    data: {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score: scan.score,
      result: scan.result,
      error: scan.error,
      createdAt: scan.createdAt,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
    },
  };
  if (scan.status === "COMPLETED") await cacheScanResult(id, response).catch(() => undefined);
  return withCors(NextResponse.json(response), req);
}
