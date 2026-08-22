import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enqueueScan } from "@/lib/queue";
import { rateLimit } from "@/lib/rateLimit";
import { validatePublicUrl } from "@/scanner/fetchHtml";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(`bulk:${auth.ctx.userId}`, 10);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }
  const urls = Array.isArray(body)
    ? body
    : body && typeof body === "object" && "urls" in body
      ? (body as { urls?: unknown }).urls
      : null;
  if (
    !Array.isArray(urls) ||
    urls.length === 0 ||
    urls.length > 10 ||
    urls.some((url) => typeof url !== "string")
  ) {
    return jsonError(400, "INVALID_URLS", "Provide an array of 1 to 10 URLs.");
  }

  const results = await Promise.all(
    urls.map(async (rawUrl) => {
      try {
        const url = await validatePublicUrl(rawUrl);
        const scan = await prisma.scan.create({
          data: { userId: auth.ctx.userId, url, status: "PENDING" },
        });
        const queueJobId = await enqueueScan(scan.id, url);
        await prisma.scan.update({ where: { id: scan.id }, data: { queueJobId } });
        return { url, scanId: scan.id, status: "PENDING" as const };
      } catch (error) {
        return {
          url: rawUrl,
          status: "REJECTED" as const,
          error: error instanceof Error ? error.message : "Invalid URL.",
        };
      }
    }),
  );
  return withCors(NextResponse.json({ success: true, scans: results }), req);
}
