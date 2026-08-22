import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const existing = await prisma.monitoredSite.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== auth.ctx.userId) {
    return jsonError(404, "SITE_NOT_FOUND", "Monitored site not found.");
  }

  const site = await prisma.monitoredSite.update({
    where: { id: params.id },
    data: { nextScanAt: new Date(), isActive: true },
    select: { id: true, nextScanAt: true },
  });

  return withCors(
    NextResponse.json({
      success: true,
      site,
      message: "Re-scan queued — it will run within a few minutes.",
    }),
    req
  );
}
