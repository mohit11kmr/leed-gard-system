import { logger } from "./logger";
import { prisma } from "./prisma";
import { appBaseUrl, sendEmail } from "./email";

export interface MonitorAlert {
  siteId: string;
  userId: string;
  url: string;
  reason: string;
  score: number | null;
  previousScore: number | null;
  brokenLinks: number | null;
  scanId?: string | null;
}

function alertSubject(alert: MonitorAlert): string {
  return `⚠ LeadGuard: problem detected on ${alert.url}`;
}

function alertBody(alert: MonitorAlert): string {
  const base = appBaseUrl();
  const reportLink = alert.scanId ? `${base}/report/${alert.scanId}` : base;
  const lines = [
    `Monitoring alert for ${alert.url}`,
    "",
    `Reason: ${alert.reason}`,
    alert.score !== null ? `Current health score: ${alert.score}/100` : "Scan failed this time.",
    alert.previousScore !== null ? `Previous health score: ${alert.previousScore}/100` : "",
    alert.brokenLinks !== null ? `Broken contact links: ${alert.brokenLinks}` : "",
    "",
    "Fix it before customers notice — open your report:",
    reportLink,
    "",
    "— LeadGuard Scanner",
  ].filter(Boolean);
  return lines.join("\n");
}

function alertTelegramText(alert: MonitorAlert): string {
  const base = appBaseUrl();
  const reportLink = alert.scanId ? `${base}/report/${alert.scanId}` : base;
  const score =
    alert.score !== null
      ? `Score: ${alert.score}/100${alert.previousScore !== null ? ` (was ${alert.previousScore})` : ""}`
      : "Scan failed.";
  return [
    `⚠️ Problem detected on ${alert.url}`,
    `Reason: ${alert.reason}`,
    score,
    alert.brokenLinks !== null ? `Broken contact links: ${alert.brokenLinks}` : "",
    `Report: ${reportLink}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not configured; skipping Telegram alert", { chatId });
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Telegram API responded HTTP ${res.status}`);
  return true;
}

async function sendWebhook(
  webhookUrl: string,
  secret: string | null,
  alert: MonitorAlert
): Promise<boolean> {
  const payload = {
    event: "MONITOR_ALERT",
    url: alert.url,
    reason: alert.reason,
    score: alert.score,
    previousScore: alert.previousScore,
    brokenLinks: alert.brokenLinks,
    timestamp: new Date().toISOString(),
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "LeadGuard-Scanner/0.1",
  };
  if (secret) {
    const { signHmac } = await import("./auth");
    headers["X-LeadGuard-Signature"] = signHmac(payload, secret);
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Alert webhook responded HTTP ${res.status}`);
  return true;
}

export async function deliverMonitorAlert(alert: MonitorAlert): Promise<void> {
  const site = await prisma.monitoredSite.findUnique({ where: { id: alert.siteId } });
  if (!site || !site.isActive) return;

  const tasks: Promise<unknown>[] = [];

  const email = site.alertEmail || null;
  if (email) {
    tasks.push(
      sendEmail({ to: email, subject: alertSubject(alert), text: alertBody(alert) })
        .then((sent) => {
          if (sent)
            logger.info("monitor alert email sent", { siteId: alert.siteId, url: alert.url });
        })
        .catch((err) =>
          logger.error("monitor email alert failed", {
            siteId: alert.siteId,
            error: err instanceof Error ? err.message : String(err),
          })
        )
    );
  } else {
    logger.warn("no alert email configured; skipping email alert", { siteId: alert.siteId });
  }

  if (site.alertWebhook) {
    if (site.alertWebhook.startsWith("telegram://")) {
      const chatId = site.alertWebhook.slice("telegram://".length);
      tasks.push(
        sendTelegramMessage(chatId, alertTelegramText(alert))
          .then((sent) => {
            if (sent)
              logger.info("monitor alert telegram sent", { siteId: alert.siteId, url: alert.url });
          })
          .catch((err) =>
            logger.error("monitor telegram alert failed", {
              siteId: alert.siteId,
              error: err instanceof Error ? err.message : String(err),
            })
          )
      );
    } else {
      tasks.push(
        sendWebhook(site.alertWebhook, null, alert).catch((err) =>
          logger.error("monitor webhook alert failed", { siteId: alert.siteId, error: String(err) })
        )
      );
    }
  }

  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (process.env.TELEGRAM_BOT_TOKEN && ownerChatId) {
    tasks.push(
      sendTelegramMessage(ownerChatId, alertTelegramText(alert)).catch((err) =>
        logger.error("owner telegram notification failed", { error: String(err) })
      )
    );
  }

  await Promise.all(tasks);
}
