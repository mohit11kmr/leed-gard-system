import { LogLevel } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createScanWorker, ScanJobData } from "@/lib/queue";
import { deliverWebhook } from "@/lib/webhook";
import { performScan } from "@/scanner";

async function writeScanLog(
  scanId: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
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

  const user = await prisma.user.findUnique({
    where: { id: scan.userId },
    include: { webhooks: { where: { isActive: true } } },
  });

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

    const webhooks = user?.webhooks.filter((w) =>
      (w.events as string[]).includes("SCAN_COMPLETED")
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
          })
        )
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scan error";
    logger.error("scan failed", { scanId, error: message });

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "FAILED", error: message, completedAt: new Date() },
    });
    await writeScanLog(scanId, "ERROR", "Scan failed", { error: message });

    const webhooks = user?.webhooks.filter((w) =>
      (w.events as string[]).includes("SCAN_FAILED")
    );
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
          })
        )
      );
    }
  }
}

export async function startWorker(): Promise<void> {
  await createScanWorker(handleScanJob);
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