import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  type: "access";
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

// Encryption key for webhook secrets (should be set in production)
// Derived from JWT_SECRET for simplicity, but ideally a separate key
function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(JWT_SECRET).digest();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): string {
  return `lg_${crypto.randomBytes(24).toString("base64url")}`;
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function signHmac(payload: object, secret: string): string {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted secret format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
