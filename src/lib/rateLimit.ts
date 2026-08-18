import { redis } from "./redis";

const WINDOW_SECONDS = 60;
const DEFAULT_MAX_REQUESTS = 5;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
  limit: number;
}

export async function rateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;
  const redisKey = `rl:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, WINDOW_SECONDS + 1);
    const results = await pipeline.exec();

    const count = results?.[2]?.[1] as number;

    if (count > maxRequests) {
      const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldestTs = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
      const retryAfter = Math.max(1, WINDOW_SECONDS - (now - oldestTs));
      return { ok: false, retryAfterSeconds: retryAfter, remaining: 0, limit: maxRequests };
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