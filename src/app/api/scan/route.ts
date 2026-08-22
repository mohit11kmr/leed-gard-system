import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enqueueScan } from "@/lib/queue";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rateLimit";
import { validatePublicUrl } from "@/scanner/fetchHtml";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const scans = await prisma.scan.findMany({
    where: { userId: auth.ctx.userId },
    select: {
      id: true,
      url: true,
      status: true,
      score: true,
      totalLinks: true,
      workingLinks: true,
      brokenLinks: true,
      error: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return withCors(NextResponse.json({ success: true, scans }), req);
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`user:${auth.ctx.userId}`);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Scan limit reached. Try again later." } },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), ...corsHeaders(req) },
      }
    );
  }

  let body: { url?: string; webhookUrl?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  if (!body.url) {
    return jsonError(400, "MISSING_URL", "A URL is required.");
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = await validatePublicUrl(body.url);
  } catch (err) {
    const e = err as Error & { code?: string };
    return jsonError(400, e.code || "INVALID_URL", e.message);
  }

  let webhookId: string | null = null;
  if (body.webhookUrl) {
    if (!/^https?:\/\//i.test(body.webhookUrl)) {
      return jsonError(400, "INVALID_WEBHOOK", "Provided webhookUrl is invalid.");
    }
    try {
      await validatePublicUrl(body.webhookUrl);
    } catch (err) {
      const e = err as Error & { code?: string };
      return jsonError(400, e.code || "INVALID_WEBHOOK", e.message);
    }
    try {
      await prisma.webhook.upsert({
        where: { userId_url: { userId: auth.ctx.userId, url: body.webhookUrl } },
        create: {
          userId: auth.ctx.userId,
          url: body.webhookUrl,
          events: ["SCAN_COMPLETED"],
        },
        update: {},
      });
      webhookId = "registered";
    } catch {
      return jsonError(400, "INVALID_WEBHOOK", "Provided webhookUrl is invalid.");
    }
  }

  const scan = await prisma.scan.create({
    data: {
      userId: auth.ctx.userId,
      url: normalizedUrl,
      status: "PENDING",
    },
  });

  let jobId: string | undefined;
  try {
    jobId = await enqueueScan(scan.id, normalizedUrl);
    await prisma.scan.update({
      where: { id: scan.id },
      data: { queueJobId: jobId ?? null },
    });
    void track("scan_started", {
      userId: auth.ctx.userId,
      url: normalizedUrl,
      meta: { scanId: scan.id },
    });
  } catch {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "FAILED", error: "Failed to enqueue scan. Queue unavailable." },
    });
    return jsonError(503, "QUEUE_UNAVAILABLE", "Scan queue is temporarily unavailable. Please try again.");
  }

  return withCors(
    NextResponse.json(
      { success: true, scanId: scan.id, status: "PENDING" },
      { status: 202 }
    ),
    req
  );
}