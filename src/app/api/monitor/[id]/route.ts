import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  let body: { isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }
  if (typeof body.isActive !== "boolean") {
    return jsonError(400, "VALIDATION_ERROR", "isActive (boolean) is required.");
  }

  const existing = await prisma.monitoredSite.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== auth.ctx.userId) {
    return jsonError(404, "SITE_NOT_FOUND", "Monitored site not found.");
  }

  const site = await prisma.monitoredSite.update({
    where: { id: params.id },
    data: { isActive: body.isActive },
    select: { id: true, isActive: true },
  });

  return withCors(NextResponse.json({ success: true, site }), req);
}

export async function DELETE(
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

  await prisma.monitoredSite.delete({ where: { id: params.id } });

  return withCors(NextResponse.json({ success: true }), req);
}
