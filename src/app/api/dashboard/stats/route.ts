import { NextRequest, NextResponse } from "next/server";
import { authenticate, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

interface DayBucket {
  date: string;
  brokenLinks: number;
  criticalFindings: number;
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recent = await prisma.scan.findMany({
    where: { userId: auth.ctx.userId, status: "COMPLETED", createdAt: { gte: since7 } },
    select: {
      url: true,
      score: true,
      brokenLinks: true,
      createdAt: true,
      result: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const byDay = new Map<string, DayBucket>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      brokenLinks: 0,
      criticalFindings: 0,
    });
  }
  for (const s of recent) {
    if (s.createdAt < since7) continue;
    const key = s.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.brokenLinks += s.brokenLinks ?? 0;
    const res = s.result as {
      security?: { findings?: { severity?: string }[] };
      seoFindings?: { severity?: string }[];
    } | null;
    for (const f of res?.security?.findings ?? []) {
      if (f.severity === "danger") bucket.criticalFindings += 1;
    }
    for (const f of res?.seoFindings ?? []) {
      if (f.severity === "CRITICAL") bucket.criticalFindings += 1;
    }
  }

  const monthScans = await prisma.scan.findMany({
    where: { userId: auth.ctx.userId, status: "COMPLETED", createdAt: { gte: since30 } },
    select: {
      url: true,
      score: true,
      brokenLinks: true,
      createdAt: true,
      result: true,
    },
  });

  const severityCounts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  const urlRisk = new Map<string, { url: string; scores: number[]; issues: number }>();
  for (const s of monthScans) {
    const res = s.result as {
      security?: { findings?: { severity?: string }[] };
      seoFindings?: { severity?: string }[];
    } | null;
    let issues = 0;
    for (const f of res?.security?.findings ?? []) {
      const sev = f.severity === "danger" ? "CRITICAL" : "HIGH";
      severityCounts[sev] += 1;
      issues += 1;
    }
    for (const f of res?.seoFindings ?? []) {
      if (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(f.severity ?? "")) {
        severityCounts[f.severity!] += 1;
        issues += 1;
      }
    }
    issues += s.brokenLinks ?? 0;
    const entry = urlRisk.get(s.url) ?? { url: s.url, scores: [], issues: 0 };
    entry.scores.push(s.score ?? 100);
    entry.issues += issues;
    urlRisk.set(s.url, entry);
  }

  const riskiestUrls = [...urlRisk.values()]
    .map((e) => ({
      url: e.url,
      avgScore: Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length),
      issueCount: e.issues,
      scanCount: e.scores.length,
    }))
    .sort((a, b) => a.avgScore - b.avgScore || b.issueCount - a.issueCount)
    .slice(0, 3);

  return withCors(
    NextResponse.json({
      success: true,
      stats: {
        daily: [...byDay.values()],
        severity: Object.entries(severityCounts).map(([name, value]) => ({ name, value })),
        riskiestUrls,
      },
    }),
    req,
  );
}
