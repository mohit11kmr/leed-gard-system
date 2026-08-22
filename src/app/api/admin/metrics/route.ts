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

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [users, scansToday, completed24, failed24, recentDone, monitors, activeMonitors, dangerScans, recentScans] =
    await Promise.all([
      prisma.user.count(),
      prisma.scan.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.scan.count({ where: { status: "COMPLETED", createdAt: { gte: dayAgo } } }),
      prisma.scan.count({ where: { status: "FAILED", createdAt: { gte: dayAgo } } }),
      prisma.scan.findMany({
        where: { status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.monitoredSite.count(),
      prisma.monitoredSite.count({ where: { isActive: true } }),
      prisma.scan.count({
        where: {
          status: "COMPLETED",
          createdAt: { gte: dayAgo },
          result: { path: ["security", "status"], equals: "DANGER" },
        },
      }),
      prisma.scan.findMany({
        where: { status: "COMPLETED", createdAt: { gte: dayAgo } },
        select: { url: true, result: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

  const total24 = completed24 + failed24;
  const durations = recentDone.map((s) => s.completedAt!.getTime() - s.startedAt!.getTime());
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const uniqueDomainsToday = new Set(
    recentScans.map((s) => {
      try {
        return new URL(s.url).hostname.replace(/^www\./, "");
      } catch {
        return s.url;
      }
    })
  ).size;

  const ruleCounts = new Map<string, number>();
  for (const s of recentScans) {
    const res = s.result as {
      phoneLinks?: { status?: string }[];
      emailLinks?: { status?: string }[];
      security?: { findings?: { ruleId?: string; type?: string }[] };
    } | null;
    for (const link of res?.phoneLinks ?? []) {
      if (link.status && !["WORKING", "DETECTED", "VALID"].includes(link.status)) {
        ruleCounts.set(`LEAD-PHONE-${link.status}`, (ruleCounts.get(`LEAD-PHONE-${link.status}`) ?? 0) + 1);
      }
    }
    for (const link of res?.emailLinks ?? []) {
      if (link.status && !["WORKING", "DETECTED", "VALID"].includes(link.status)) {
        ruleCounts.set(`LEAD-EMAIL-${link.status}`, (ruleCounts.get(`LEAD-EMAIL-${link.status}`) ?? 0) + 1);
      }
    }
    for (const f of res?.security?.findings ?? []) {
      const key = f.ruleId ?? `CYBER-${f.type}`;
      ruleCounts.set(key, (ruleCounts.get(key) ?? 0) + 1);
    }
  }
  const topBrokenRules = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ruleId, hits]) => ({ ruleId, hits }));

  const eventGroups = await prisma.analyticsEvent.groupBy({
    by: ["event"],
    where: { createdAt: { gte: dayAgo } },
    _count: { _all: true },
  });
  const events24h = Object.fromEntries(
    eventGroups.map((g) => [g.event, g._count._all])
  );

  return withCors(
    NextResponse.json({
      success: true,
      metrics: {
        users,
        scansToday,
        uniqueDomainsToday,
        successRate24h: total24 > 0 ? Math.round((completed24 / total24) * 100) : null,
        avgDurationMs,
        criticalFindingRate24h:
          completed24 > 0 ? Math.round((dangerScans / completed24) * 100) : null,
        monitors,
        activeMonitors,
        topBrokenRules,
        events24h,
      },
    }),
    req
  );
}
