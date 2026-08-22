import { NextRequest, NextResponse } from "next/server";
import { isValidAnalyticsEvent, track } from "@/lib/analytics";
import { corsHeaders, handleOptions, withCors } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimit(`event:${ip}`, 30);
  if (!limited.ok) {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many events." } },
        { status: 429 }
      ),
      req
    );
  }

  let body: { event?: string; url?: string; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Invalid JSON body." } },
        { status: 400 }
      ),
      req
    );
  }

  if (!body.event || !isValidAnalyticsEvent(body.event)) {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "INVALID_EVENT", message: "Unknown event name." } },
        { status: 400 }
      ),
      req
    );
  }

  await track(body.event, { url: body.url ?? null, meta: body.meta });
  return withCors(NextResponse.json({ success: true }), req);
}
