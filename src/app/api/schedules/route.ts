import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, withCors, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import {
  createScheduledScan,
  deleteScheduledScan,
  setScheduleEnabled,
  SCHEDULE_PRESETS,
} from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const schedules = await prisma.scheduledScan.findMany({
    where: { userId: auth.ctx.userId },
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ success: true, schedules }), req);
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const limited = await rateLimit(`schedule:${auth.ctx.userId}`, 10);
  if (!limited.ok) {
    return jsonError(429, "RATE_LIMITED", "Too many schedule changes. Try again shortly.");
  }

  let body: { url?: string; preset?: string; cron?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  if (!body.url) return jsonError(400, "VALIDATION_ERROR", "url is required.");
  if (body.preset && !(body.preset in SCHEDULE_PRESETS)) {
    return jsonError(400, "INVALID_PRESET", "Preset must be DAILY or WEEKLY.");
  }
  if (!body.preset && !body.cron) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Provide preset (DAILY/WEEKLY) or a cron expression.",
    );
  }

  try {
    const created = await createScheduledScan({
      userId: auth.ctx.userId,
      url: body.url,
      preset: body.preset as keyof typeof SCHEDULE_PRESETS | undefined,
      cron: body.cron,
    });
    return withCors(NextResponse.json({ success: true, schedule: created }, { status: 201 }), req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create schedule.";
    const code = message.includes("cron")
      ? "INVALID_CRON"
      : message.includes("exists")
        ? "DUPLICATE"
        : "INVALID_URL";
    return jsonError(400, code, message);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  let body: { id?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }
  if (!body.id || typeof body.enabled !== "boolean") {
    return jsonError(400, "VALIDATION_ERROR", "id and enabled are required.");
  }

  const updated = await setScheduleEnabled(auth.ctx.userId, body.id, body.enabled);
  if (!updated) return jsonError(404, "NOT_FOUND", "Schedule not found.");
  return withCors(NextResponse.json({ success: true, schedule: updated }), req);
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError(400, "VALIDATION_ERROR", "id query param required.");

  const deleted = await deleteScheduledScan(auth.ctx.userId, id);
  if (!deleted) return jsonError(404, "NOT_FOUND", "Schedule not found.");
  return withCors(NextResponse.json({ success: true }), req);
}
