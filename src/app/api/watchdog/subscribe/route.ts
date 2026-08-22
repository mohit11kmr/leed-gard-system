import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/analytics";
import { corsHeaders, handleOptions, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRIAL_HOURS = 24;

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimit(`watchdog:${ip}`, 5);
  if (!limited.ok) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      ),
      req,
    );
  }

  let body: { scanId?: string; contactType?: string; contactValue?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Invalid JSON body." } },
        { status: 400 },
      ),
      req,
    );
  }

  const { scanId, contactValue } = body;
  const allowedTypes = ["WHATSAPP", "EMAIL", "TELEGRAM"];
  const contactType = allowedTypes.includes(body.contactType ?? "") ? body.contactType! : "EMAIL";

  if (!scanId || !contactValue) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "scanId and contactValue are required." },
        },
        { status: 400 },
      ),
      req,
    );
  }

  if (contactType === "EMAIL" && !EMAIL_REGEX.test(contactValue)) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMAIL", message: "Please enter a valid email address." },
        },
        { status: 400 },
      ),
      req,
    );
  }

  if (contactType === "WHATSAPP") {
    const digits = contactValue.replace(/\D/g, "");
    if (
      !/^[6-9]\d{9}$/.test(
        digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(-10),
      )
    ) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_PHONE",
              message: "Please enter a valid 10-digit Indian mobile number.",
            },
          },
          { status: 400 },
        ),
        req,
      );
    }
  }

  if (contactType === "TELEGRAM") {
    if (!/^-?\d{5,16}$/.test(contactValue.trim())) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_TELEGRAM",
              message: "Please enter a valid numeric Telegram chat ID.",
            },
          },
          { status: 400 },
        ),
        req,
      );
    }
  }

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scan not found." } },
        { status: 404 },
      ),
      req,
    );
  }
  if (!scan.userId) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "UNOWNED_SCAN", message: "This scan cannot be monitored." },
        },
        { status: 400 },
      ),
      req,
    );
  }

  const existing = await prisma.monitoredSite.findFirst({
    where: { userId: scan.userId, url: scan.url, isActive: true },
  });
  if (existing) {
    return withCors(
      NextResponse.json({
        success: true,
        data: {
          siteId: existing.id,
          nextScanAt: existing.nextScanAt,
          message: "This site is already protected.",
        },
      }),
      req,
    );
  }

  const nextScanAt = new Date(Date.now() + TRIAL_HOURS * 60 * 60 * 1000);
  const site = await prisma.monitoredSite.create({
    data: {
      userId: scan.userId,
      url: scan.url,
      frequency: "DAILY",
      isActive: true,
      alertEmail: contactType === "EMAIL" ? contactValue : null,
      alertWebhook:
        contactType === "WHATSAPP"
          ? `whatsapp://${contactValue.replace(/\D/g, "")}`
          : contactType === "TELEGRAM"
            ? `telegram://${contactValue.trim()}`
            : null,
      lastScanId: scan.id,
      lastScore: scan.score,
      lastBroken: scan.brokenLinks,
      nextScanAt,
    },
  });

  await track("watchdog_started", {
    userId: scan.userId,
    url: scan.url,
    meta: { contactType },
  });

  return withCors(
    NextResponse.json({
      success: true,
      data: {
        siteId: site.id,
        nextScanAt: site.nextScanAt,
        message:
          contactType === "TELEGRAM"
            ? "Free daily protection activated. Telegram alerts enabled."
            : "Free daily protection activated for this page.",
      },
    }),
    req,
  );
}
