import Redis from "ioredis";
import "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  const client = url
    ? new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
  client.on("error", () => {
    /* handled by BullMQ / callers */
  });
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
