import { redis } from "./redis";

const WINDOW_MS = 60_000; // 60 seconds in milliseconds
const DEFAULT_MAX_REQUESTS = 5;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
  limit: number;
}

export async function rateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const redisKey = `rl:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, Math.ceil(WINDOW_MS / 1000) + 1);
    const results = await pipeline.exec();

    const count = results?.[2]?.[1] as number;

    if (count > maxRequests) {
      const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldestTs = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
      const retryAfterMs = Math.max(1, WINDOW_MS - (now - oldestTs));
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return { ok: false, retryAfterSeconds, remaining: 0, limit: maxRequests };
    }

    return { ok: true, retryAfterSeconds: 0, remaining: maxRequests - count, limit: maxRequests };
  } catch {
    return { ok: true, retryAfterSeconds: 0, remaining: maxRequests, limit: maxRequests };
  }
}

export async function rateLimitKeyFor(req: Request): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}
