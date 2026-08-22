import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { validatePublicUrl } from "@/scanner/fetchHtml";

const VALID_FREQUENCIES = ["DAILY", "WEEKLY"] as const;
type Frequency = (typeof VALID_FREQUENCIES)[number];

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const sites = await prisma.monitoredSite.findMany({
    where: { userId: auth.ctx.userId },
    select: {
      id: true,
      url: true,
      frequency: true,
      isActive: true,
      lastScore: true,
      lastBroken: true,
      lastCheckedAt: true,
      nextScanAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ success: true, sites }), req);
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`user:${auth.ctx.userId}`);
  if (!limit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), ...corsHeaders(req) },
      },
    );
  }

  let body: { url?: string; frequency?: string; alertEmail?: string; alertPhone?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  const rawUrl = (body.url || "").trim();
  if (!rawUrl) return jsonError(400, "MISSING_URL", "A URL is required.");

  let normalizedUrl: string;
  try {
    normalizedUrl = await validatePublicUrl(rawUrl);
  } catch (err) {
    const e = err as Error & { code?: string };
    return jsonError(400, e.code || "INVALID_URL", e.message);
  }

  const frequency = (body.frequency || "DAILY").toUpperCase() as Frequency;
  if (!(VALID_FREQUENCIES as readonly string[]).includes(frequency)) {
    return jsonError(400, "INVALID_FREQUENCY", "frequency must be DAILY or WEEKLY.");
  }

  const alertEmail = body.alertEmail?.trim().toLowerCase() || null;
  if (alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(alertEmail)) {
    return jsonError(400, "INVALID_EMAIL", "alertEmail must be a valid email.");
  }
  const alertPhone = body.alertPhone?.trim() || null;
  if (alertPhone && !/^\+[1-9]\d{7,14}$/.test(alertPhone)) {
    return jsonError(400, "INVALID_PHONE", "alertPhone must be in international E.164 format.");
  }

  const site = await prisma.monitoredSite.upsert({
    where: { userId_url: { userId: auth.ctx.userId, url: normalizedUrl } },
    create: {
      userId: auth.ctx.userId,
      url: normalizedUrl,
      frequency,
      alertEmail,
      alertPhone,
      nextScanAt: new Date(),
    },
    update: {
      frequency,
      alertEmail,
      alertPhone,
      isActive: true,
      nextScanAt: new Date(),
    },
    select: {
      id: true,
      url: true,
      frequency: true,
      isActive: true,
      lastScore: true,
      lastBroken: true,
      lastCheckedAt: true,
      nextScanAt: true,
      createdAt: true,
    },
  });

  return withCors(NextResponse.json({ success: true, site }, { status: 201 }), req);
}
