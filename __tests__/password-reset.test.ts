/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, generateWebhookSecret } from "@/lib/auth";

// Mock the email module
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  appBaseUrl: () => "http://localhost:3000",
}));

// Mock rate limiter
jest.mock("@/lib/rateLimit", () => ({
  rateLimit: jest
    .fn()
    .mockResolvedValue({ ok: true, retryAfterSeconds: 0, remaining: 5, limit: 5 }),
  rateLimitKeyFor: jest.fn().mockResolvedValue("test-ip"),
}));

// Mock next/server
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    headers: new Headers(),
    json: jest.fn(),
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({ data, init })),
  },
}));

describe("Password Reset Flow", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: await hashPassword("current-password-123"),
        name: "Test User",
        apiKey: `lg_${generateWebhookSecret()}`,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it("hashes and verifies passwords correctly", async () => {
    const password = "new-password-456";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("generates unique reset tokens", () => {
    const tokens = new Set();
    for (let i = 0; i < 10; i++) {
      tokens.add(generateWebhookSecret());
    }
    expect(tokens.size).toBe(10);
  });

  describe("Reset token validation", () => {
    it("valid token verification works", async () => {
      const token = generateWebhookSecret();
      const hash = await hashPassword(token);
      const valid = await verifyPassword(token, hash);
      expect(valid).toBe(true);
    });

    it("invalid token fails verification", async () => {
      const token = generateWebhookSecret();
      const hash = await hashPassword(token);
      const valid = await verifyPassword("wrong-token", hash);
      expect(valid).toBe(false);
    });

    it("different tokens produce different hashes", async () => {
      const token1 = generateWebhookSecret();
      const token2 = generateWebhookSecret();
      const hash1 = await hashPassword(token1);
      const hash2 = await hashPassword(token2);
      expect(hash1).not.toBe(hash2);
    });
  });
});
