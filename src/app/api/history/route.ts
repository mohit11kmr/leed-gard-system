import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || "20")),
  );
  const where = { userId: auth.ctx.userId };
  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        url: true,
        status: true,
        result: true,
        score: true,
        error: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.scan.count({ where }),
  ]);
  return withCors(
    NextResponse.json({
      success: true,
      scans,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    }),
    req,
  );
}
