import { logger } from "./logger";
import { prisma } from "./prisma";

export const ANALYTICS_EVENTS = [
  "scan_started",
  "scan_completed",
  "scan_failed",
  "report_shared",
  "report_download_clicked",
  "watchdog_started",
  "pricing_viewed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export async function track(
  event: AnalyticsEventName,
  opts: { userId?: string | null; url?: string | null; meta?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        userId: opts.userId ?? null,
        url: opts.url?.slice(0, 500) ?? null,
        meta: (opts.meta ?? undefined) as never,
      },
    });
    logger.info(`analytics:${event}`, { userId: opts.userId ?? null, url: opts.url ?? null });
  } catch (err) {
    logger.error("analytics track failed", {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function isValidAnalyticsEvent(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}
