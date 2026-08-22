import Redis from "ioredis";
import "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedis(): Redis {
  const retryStrategy = (times: number): number | null => {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  };
  const url = process.env.REDIS_URL;
  const client = url
    ? new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy,
      })
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy,
      });
  client.on("error", (error) => console.error("Redis connection error", error.message));
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
