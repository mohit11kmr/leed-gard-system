import sanitizeHtml from "sanitize-html";
import { z } from "zod";

export const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }));

export const scanInputSchema = z
  .object({
    url: urlSchema,
    webhookUrl: urlSchema.optional(),
  })
  .strict();

export const bulkScanInputSchema = z
  .object({
    urls: z.array(urlSchema).min(1).max(10),
  })
  .strict();

export const monitorInputSchema = z
  .object({
    url: urlSchema,
    frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
    alertEmail: z.string().trim().email().optional(),
    alertPhone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/)
      .optional(),
  })
  .strict();

export const webhookInputSchema = z
  .object({
    url: urlSchema,
    secret: z.string().max(256).optional(),
    events: z
      .array(z.enum(["SCAN_COMPLETED", "SCAN_FAILED"]))
      .min(1)
      .optional(),
  })
  .strict();
