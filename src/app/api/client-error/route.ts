import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const errorSchema = z
  .object({
    message: z.string().min(1).max(2000),
    digest: z.string().max(200).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const parsed = errorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "Invalid error payload." } },
      { status: 400 },
    );
  logger.error("client application error", {
    ...parsed.data,
    correlationId: request.headers.get("x-correlation-id"),
  });
  return NextResponse.json({ success: true });
}
