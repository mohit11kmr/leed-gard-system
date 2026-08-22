import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const existing = await prisma.webhook.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== auth.ctx.userId) {
    return jsonError(404, "WEBHOOK_NOT_FOUND", "Webhook not found.");
  }

  await prisma.webhook.delete({ where: { id: params.id } });

  return withCors(NextResponse.json({ success: true }), req);
}
