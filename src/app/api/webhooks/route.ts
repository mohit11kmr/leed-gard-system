import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validatePublicUrl } from "@/scanner/fetchHtml";

const VALID_EVENTS = ["SCAN_COMPLETED", "SCAN_FAILED"] as const;

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function parseEvents(raw: unknown): string[] | null {
  if (raw === undefined) return [...VALID_EVENTS];
  if (!Array.isArray(raw)) return null;
  const events = raw.filter((e): e is string => typeof e === "string");
  if (events.length === 0 || !events.every((e) => (VALID_EVENTS as readonly string[]).includes(e))) {
    return null;
  }
  return events;
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  let body: { url?: string; secret?: string; events?: string[] };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  const url = (body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return jsonError(400, "INVALID_WEBHOOK_URL", "Webhook URL must start with http(s)://");
  }
  try {
    await validatePublicUrl(url);
  } catch (err) {
    const e = err as Error & { code?: string };
    return jsonError(400, e.code || "INVALID_WEBHOOK_URL", e.message);
  }
  const events = parseEvents(body.events);
  if (!events) {
    return jsonError(400, "INVALID_EVENTS", "events must be a non-empty subset of SCAN_COMPLETED, SCAN_FAILED");
  }

  const existing = await prisma.webhook.findUnique({
    where: { userId_url: { userId: auth.ctx.userId, url } },
  });
  if (existing) {
    return jsonError(409, "WEBHOOK_EXISTS", "A webhook with this URL already exists.");
  }

  const webhook = await prisma.webhook.create({
    data: {
      userId: auth.ctx.userId,
      url,
      secret: body.secret || null,
      events: events as never[],
    },
    select: { id: true, url: true, isActive: true, events: true, createdAt: true },
  });

  return withCors(
    NextResponse.json({ success: true, webhook }, { status: 201 }),
    req
  );
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const webhooks = await prisma.webhook.findMany({
    where: { userId: auth.ctx.userId },
    select: {
      id: true,
      url: true,
      isActive: true,
      events: true,
      lastTriggered: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return withCors(
    NextResponse.json({ success: true, webhooks }),
    req
  );
}