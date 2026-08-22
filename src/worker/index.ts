import { LogLevel } from "@prisma/client";
import { deliverMonitorAlert } from "@/lib/alerts";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createScanWorker, enqueueScan, registerMonitorSweeper, ScanJobData } from "@/lib/queue";
import { validatePublicUrl } from "@/scanner/fetchHtml";
import { track } from "@/lib/analytics";
import { ScanError } from "@/scanner/types";
import { deliverWebhook } from "@/lib/webhook";
import { performScan } from "@/scanner";

function nextScanAt(frequency: "DAILY" | "WEEKLY"): Date {
  const ms = frequency === "DAILY" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

async function writeScanLog(
  scanId: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.scanLog.create({
    data: { scanId, level, message, metadata: (metadata as never) ?? undefined },
  });
}

async function handleScanJob(data: ScanJobData) {
  const { scanId, url } = data;

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    logger.error("scan record not found", { scanId });
    return;
  }

  const user = scan.userId
    ? await prisma.user.findUnique({
        where: { id: scan.userId },
        include: { webhooks: { where: { isActive: true } } },
      })
    : null;

  const previousSiteState = scan.monitoredSiteId
    ? await prisma.monitoredSite.findUnique({
        where: { id: scan.monitoredSiteId },
        select: {
          lastScore: true,
          lastBroken: true,
          alertEmail: true,
          alertWebhook: true,
          isActive: true,
        },
      })
    : null;

  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });
  await writeScanLog(scanId, "INFO", "Scan started");

  try {
    const result = await performScan(url);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        result: result as never,
        score: result.score,
        totalLinks: result.scanStats.totalLinks,
        workingLinks: result.scanStats.workingLinks,
        brokenLinks: result.scanStats.brokenLinks,
        completedAt: new Date(),
      },
    });
    await writeScanLog(scanId, "INFO", "Scan completed", {
      score: result.score,
      totalLinks: result.scanStats.totalLinks,
    });
    void track("scan_completed", {
      userId: scan.userId,
      url,
      meta: { scanId, score: result.score, brokenLinks: result.scanStats.brokenLinks },
    });

    if (scan.monitoredSiteId && scan.userId && previousSiteState?.isActive) {
      const prevScore = previousSiteState.lastScore;
      const prevBroken = previousSiteState.lastBroken;
      await prisma.monitoredSite.update({
        where: { id: scan.monitoredSiteId },
        data: {
          lastScanId: scanId,
          lastScore: result.score,
          lastBroken: result.scanStats.brokenLinks,
          lastCheckedAt: new Date(),
          nextScanAt: nextScanAt("DAILY"),
        },
      });

      let reason: string | null = null;
      if (prevScore !== null && result.score < prevScore) {
        reason = `Health score dropped from ${prevScore} to ${result.score}`;
      } else if (prevBroken !== null && result.scanStats.brokenLinks > prevBroken) {
        reason = `Broken contact links increased from ${prevBroken} to ${result.scanStats.brokenLinks}`;
      } else if (prevScore === null && result.scanStats.brokenLinks > 0) {
        reason = `${result.scanStats.brokenLinks} broken contact link(s) found`;
      }
      if (reason) {
        await deliverMonitorAlert({
          siteId: scan.monitoredSiteId,
          userId: scan.userId,
          url,
          reason,
          score: result.score,
          previousScore: prevScore,
          brokenLinks: result.scanStats.brokenLinks,
          scanId,
        }).catch((err) =>
          logger.error("monitor alert delivery failed", {
            siteId: scan.monitoredSiteId,
            error: String(err),
          }),
        );
      }
    }

    const webhooks = user?.webhooks.filter((w) =>
      (w.events as string[]).includes("SCAN_COMPLETED"),
    );
    if (webhooks?.length) {
      await Promise.all(
        webhooks.map((w) =>
          deliverWebhook({
            webhookId: w.id,
            webhookUrl: w.url,
            secret: w.secret,
            event: "SCAN_COMPLETED",
            scanId,
            url,
            result,
          }),
        ),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scan error";
    logger.error("scan failed", { scanId, error: message });

    let status: "FAILED" | "BLOCKED" | "TIMEOUT" = "FAILED";
    if (err instanceof ScanError) {
      if (err.code === "SSRF_BLOCKED") status = "BLOCKED";
      else if (err.code === "FETCH_TIMEOUT") status = "TIMEOUT";
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: { status, error: message, completedAt: new Date() },
    });
    await writeScanLog(scanId, "ERROR", `Scan ${status.toLowerCase()}`, {
      error: message,
      code: err instanceof ScanError ? err.code : undefined,
    });
    void track("scan_failed", {
      userId: scan.userId,
      url,
      meta: { scanId, status },
    });

    if (scan.monitoredSiteId && scan.userId && previousSiteState?.isActive) {
      await prisma.monitoredSite.update({
        where: { id: scan.monitoredSiteId },
        data: {
          lastScanId: scanId,
          lastScore: null,
          lastBroken: null,
          lastCheckedAt: new Date(),
          nextScanAt: nextScanAt("DAILY"),
        },
      });
      if (previousSiteState.lastScore !== null) {
        await deliverMonitorAlert({
          siteId: scan.monitoredSiteId,
          userId: scan.userId,
          url,
          reason: `Website could not be scanned: ${message}`,
          score: null,
          previousScore: previousSiteState.lastScore,
          brokenLinks: null,
          scanId,
        }).catch((e) =>
          logger.error("monitor alert delivery failed", {
            siteId: scan.monitoredSiteId,
            error: String(e),
          }),
        );
      }
    }

    const webhooks = user?.webhooks.filter((w) => (w.events as string[]).includes("SCAN_FAILED"));
    if (webhooks?.length) {
      await Promise.all(
        webhooks.map((w) =>
          deliverWebhook({
            webhookId: w.id,
            webhookUrl: w.url,
            secret: w.secret,
            event: "SCAN_FAILED",
            scanId,
            url,
            error: message,
          }),
        ),
      );
    }
  }
}

export async function monitorSweep(): Promise<number> {
  const due = await prisma.monitoredSite.findMany({
    where: { isActive: true, nextScanAt: { lte: new Date() } },
    orderBy: { nextScanAt: "asc" },
    take: 50,
  });

  let enqueued = 0;
  for (const site of due) {
    try {
      const url = await validatePublicUrl(site.url);
      const scan = await prisma.scan.create({
        data: {
          userId: site.userId,
          url,
          status: "PENDING",
          monitoredSiteId: site.id,
        },
      });
      const jobId = await enqueueScan(scan.id, url);
      await prisma.scan.update({
        where: { id: scan.id },
        data: { queueJobId: jobId ?? null },
      });
      await prisma.monitoredSite.update({
        where: { id: site.id },
        data: { nextScanAt: nextScanAt(site.frequency) },
      });
      enqueued += 1;
    } catch (err) {
      logger.error("monitor sweep failed for site", {
        siteId: site.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (enqueued > 0) logger.info("monitor sweep enqueued scans", { count: enqueued });
  return enqueued;
}

export async function startWorker(): Promise<void> {
  await createScanWorker(handleScanJob, monitorSweep);
  await registerMonitorSweeper();
  logger.info("LeadGuard worker started", {
    concurrency: process.env.MAX_CONCURRENT_JOBS || 5,
  });
}

if (process.argv[1] && /worker[\\/](index|main)/.test(process.argv[1])) {
  startWorker().catch((err) => {
    logger.error("worker failed to start", { error: err });
    process.exit(1);
  });
}
