/**
 * @jest-environment node
 */
// Set required env vars before importing modules that depend on them
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/leadguard?schema=public";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-that-is-at-least-32-chars-long";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  writable: true,
  configurable: true,
});

import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rateLimit";

describe("Rate Limit Precision", () => {
  const testKey = `ratelimit-test-${Date.now()}`;

  beforeAll(async () => {
    // Clean up any existing test keys
    await redis.del(`rl:${testKey}`);
  });

  afterAll(async () => {
    await redis.del(`rl:${testKey}`);
  });

  it("allows requests within limit", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(testKey, 5);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks requests exceeding limit", async () => {
    // Should be blocked now (6th request)
    const result = await rateLimit(testKey, 5);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks requests with millisecond precision", async () => {
    const precisionKey = `ratelimit-precision-${Date.now()}`;

    // Make 3 rapid requests
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(precisionKey, 3);
      expect(result.ok).toBe(true);
    }

    // 4th request should be blocked
    const result = await rateLimit(precisionKey, 3);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);

    // Cleanup
    await redis.del(`rl:${precisionKey}`);
  });

  it("resets after window expires", async () => {
    const expiryKey = `ratelimit-expiry-${Date.now()}`;

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await rateLimit(expiryKey, 3);
    }

    // Should be blocked
    let result = await rateLimit(expiryKey, 3);
    expect(result.ok).toBe(false);

    // Manually expire the key by deleting it
    await redis.del(`rl:${expiryKey}`);

    // Should allow again
    result = await rateLimit(expiryKey, 3);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("different keys have independent limits", async () => {
    const key1 = `ratelimit-independent-1-${Date.now()}`;
    const key2 = `ratelimit-independent-2-${Date.now()}`;

    // Exhaust key1
    for (let i = 0; i < 3; i++) {
      await rateLimit(key1, 3);
    }
    let result = await rateLimit(key1, 3);
    expect(result.ok).toBe(false);

    // key2 should still work
    result = await rateLimit(key2, 3);
    expect(result.ok).toBe(true);

    // Cleanup
    await redis.del(`rl:${key1}`);
    await redis.del(`rl:${key2}`);
  });
});
