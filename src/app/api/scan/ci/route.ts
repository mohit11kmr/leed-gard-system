import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { corsHeaders, handleOptions, withCors, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { enqueueScan } from "@/lib/queue";
import { validatePublicUrl } from "@/scanner/fetchHtml";
import { track } from "@/lib/analytics";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function resolveCiToken(
  req: NextRequest,
): Promise<{ userId: string; tokenId: string } | null> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token.startsWith("lgci_")) return null;

  const hash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;

  await prisma.apiToken.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return { userId: row.userId, tokenId: row.id };
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const resolved = await resolveCiToken(req);
  if (!resolved) {
    return jsonError(401, "UNAUTHORIZED", "Provide a valid Bearer CI token (lgci_…).");
  }

  // Generous CI limit — bypasses the interactive user rate limit.
  const limited = await rateLimit(`ci:${resolved.tokenId}`, 120);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `CI rate limit reached. Retry after ${limited.retryAfterSeconds}s.`,
    );
  }

  let body: { url?: string; webhookUrl?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }
  if (!body.url) return jsonError(400, "VALIDATION_ERROR", "url is required.");

  try {
    const normalizedUrl = await validatePublicUrl(body.url);
    const scan = await prisma.scan.create({
      data: { userId: resolved.userId, url: normalizedUrl, status: "PENDING" },
    });
    const jobId = await enqueueScan(scan.id, normalizedUrl);
    await prisma.scan.update({
      where: { id: scan.id },
      data: { queueJobId: jobId ?? null },
    });
    void track("scan_started", {
      userId: resolved.userId,
      url: normalizedUrl,
      meta: { scanId: scan.id, source: "ci" },
    });

    return withCors(
      NextResponse.json(
        {
          success: true,
          scanId: scan.id,
          status: scan.status,
          poll: `/api/scan/ci?scanId=${scan.id}`,
        },
        { status: 202 },
      ),
      req,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid URL.";
    const code =
      message.includes("SSRF") || message.includes("internal") ? "BLOCKED" : "INVALID_URL";
    return jsonError(code === "BLOCKED" ? 403 : 400, code, message);
  }
}

export async function GET(req: NextRequest) {
  const resolved = await resolveCiToken(req);
  if (!resolved) {
    return jsonError(401, "UNAUTHORIZED", "Provide a valid Bearer CI token (lgci_…).");
  }

  const scanId = new URL(req.url).searchParams.get("scanId");
  if (!scanId) return jsonError(400, "VALIDATION_ERROR", "scanId query param required.");

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, userId: resolved.userId },
    select: {
      id: true,
      url: true,
      status: true,
      score: true,
      brokenLinks: true,
      totalLinks: true,
      result: true,
      aiRemediation: true,
      screenshotPath: true,
      completedAt: true,
    },
  });
  if (!scan) return jsonError(404, "NOT_FOUND", "Scan not found.");

  return withCors(NextResponse.json({ success: true, scan }), req);
}
