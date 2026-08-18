import { signHmac } from "./auth";
import { logger } from "./logger";
import { prisma } from "./prisma";

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

interface WebhookPayload {
  event: "SCAN_COMPLETED" | "SCAN_FAILED";
  scanId: string;
  url: string;
  result?: unknown;
  error?: string | null;
  timestamp: string;
}

async function sendOnce(
  webhookUrl: string,
  secret: string | null,
  payload: WebhookPayload
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "LeadGuard-Scanner/0.1",
  };
  if (secret) {
    headers["X-LeadGuard-Signature"] = signHmac(payload, secret);
    headers["X-LeadGuard-Event"] = payload.event;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Webhook responded with HTTP ${res.status}`);
  }
}

export async function deliverWebhook(params: {
  webhookId: string;
  webhookUrl: string;
  secret: string | null;
  event: WebhookPayload["event"];
  scanId: string;
  url: string;
  result?: unknown;
  error?: string | null;
}): Promise<boolean> {
  const payload: WebhookPayload = {
    event: params.event,
    scanId: params.scanId,
    url: params.url,
    result: params.result,
    error: params.error,
    timestamp: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await sendOnce(params.webhookUrl, params.secret, payload);
      await prisma.webhook.update({
        where: { id: params.webhookId },
        data: { lastTriggered: new Date() },
      });
      logger.info("webhook delivered", {
        webhookId: params.webhookId,
        event: payload.event,
        scanId: params.scanId,
      });
      return true;
    } catch (err) {
      logger.warn("webhook delivery failed", {
        webhookId: params.webhookId,
        attempt: attempt + 1,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
      }
    }
  }

  logger.error("webhook delivery exhausted retries", {
    webhookId: params.webhookId,
    event: payload.event,
    scanId: params.scanId,
  });
  return false;
}