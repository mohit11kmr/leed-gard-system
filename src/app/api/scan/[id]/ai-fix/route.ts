import { NextRequest, NextResponse } from "next/server";
import { authenticate, withCors, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isOpenAiConfigured } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  if (!isOpenAiConfigured()) {
    return jsonError(503, "AI_NOT_CONFIGURED", "AI feature requires API key.");
  }

  const scanId = new URL(req.url).pathname.split("/").pop() ?? "";
  const scan = await prisma.scan.findFirst({
    where: { id: scanId, userId: auth.ctx.userId },
    select: { aiRemediation: true },
  });
  if (!scan) return jsonError(404, "NOT_FOUND", "Scan not found.");

  // Generation happens in the worker right after scan completion; if it has not
  // landed yet, tell the client to retry rather than blocking this request.
  if (!scan.aiRemediation) {
    return withCors(NextResponse.json({ success: true, unavailable: true }), req);
  }

  return withCors(NextResponse.json({ success: true, remediation: scan.aiRemediation }), req);
}
