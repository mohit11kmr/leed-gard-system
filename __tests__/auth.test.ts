/**
 * @jest-environment node
 */
import {
  encryptSecret,
  decryptSecret,
  hashPassword,
  verifyPassword,
  signHmac,
  generateWebhookSecret,
} from "../src/lib/auth";

describe("auth utilities", () => {
  describe("encryptSecret / decryptSecret", () => {
    it("encrypts and decrypts a secret correctly", () => {
      const secret = "test-webhook-secret-123";
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("produces different ciphertext for same plaintext (IV randomization)", () => {
      const secret = "test-secret";
      const enc1 = encryptSecret(secret);
      const enc2 = encryptSecret(secret);
      expect(enc1).not.toBe(enc2);
      expect(decryptSecret(enc1)).toBe(secret);
      expect(decryptSecret(enc2)).toBe(secret);
    });

    it("throws on invalid encrypted format", () => {
      expect(() => decryptSecret("invalid")).toThrow();
      expect(() => decryptSecret("a:b")).toThrow();
      expect(() => decryptSecret("a:b:c:d")).toThrow();
    });

    it("throws on corrupted ciphertext", () => {
      const secret = "test-secret";
      const encrypted = encryptSecret(secret);
      // Corrupt the ciphertext
      const parts = encrypted.split(":");
      const corrupted = `${parts[0]}:${parts[1]}:corrupted`;
      expect(() => decryptSecret(corrupted)).toThrow();
    });
  });

  describe("hashPassword / verifyPassword", () => {
    it("hashes and verifies password correctly", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it("rejects wrong password", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      const valid = await verifyPassword("wrong-password", hash);
      expect(valid).toBe(false);
    });

    it("produces different hashes for same password", async () => {
      const password = "test-password";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("signHmac", () => {
    it("produces consistent HMAC for same payload and secret", () => {
      const payload = { test: "data", number: 123 };
      const secret = "hmac-secret-key";
      const hmac1 = signHmac(payload, secret);
      const hmac2 = signHmac(payload, secret);
      expect(hmac1).toBe(hmac2);
      expect(hmac1.length).toBe(64); // SHA256 hex = 64 chars
    });

    it("produces different HMAC for different secrets", () => {
      const payload = { test: "data" };
      const hmac1 = signHmac(payload, "secret1");
      const hmac2 = signHmac(payload, "secret2");
      expect(hmac1).not.toBe(hmac2);
    });

    it("produces different HMAC for different payloads", () => {
      const secret = "hmac-secret";
      const hmac1 = signHmac({ a: 1 }, secret);
      const hmac2 = signHmac({ a: 2 }, secret);
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe("generateWebhookSecret", () => {
    it("generates a hex string of correct length", () => {
      const secret = generateWebhookSecret();
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique secrets", () => {
      const secrets = new Set();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateWebhookSecret());
      }
      expect(secrets.size).toBe(100);
    });
  });
});
