import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const checks = {
    redis: false,
    database: false,
    queue: false,
  };

  // Check Redis
  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG";
  } catch {
    checks.redis = false;
  }

  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Check Queue (try to get queue info)
  try {
    const { scanQueue } = await import("@/lib/queue");
    await scanQueue.getJobCounts();
    checks.queue = true;
  } catch {
    checks.queue = false;
  }

  const healthy = checks.redis && checks.database && checks.queue;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
