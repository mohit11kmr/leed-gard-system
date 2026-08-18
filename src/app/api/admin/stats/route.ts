import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, jsonError, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  if (auth.ctx.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Admin access required.");
  }

  const [totalUsers, totalScans, completedScans, failedScans, recentScans, last24hScans] =
    await Promise.all([
      prisma.user.count(),
      prisma.scan.count(),
      prisma.scan.count({ where: { status: "COMPLETED" } }),
      prisma.scan.count({ where: { status: "FAILED" } }),
      prisma.scan.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, url: true, status: true, score: true, createdAt: true },
      }),
      prisma.scan.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

  return withCors(
    NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalScans,
        completedScans,
        failedScans,
        scansLast24h: last24hScans,
        successRate: totalScans === 0 ? 100 : Math.round((completedScans / totalScans) * 100),
        recentScans,
      },
    }),
    req
  );
}