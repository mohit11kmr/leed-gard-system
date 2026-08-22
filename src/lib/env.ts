import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().min(1).optional(),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});

if (env.SMTP_HOST && (!env.SMTP_USER || !env.SMTP_PASS)) {
  throw new Error("SMTP_USER and SMTP_PASS are required when SMTP_HOST is configured.");
}
