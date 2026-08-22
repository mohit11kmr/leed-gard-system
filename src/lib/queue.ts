import { Queue, Worker } from "bullmq";
import { redis } from "./redis";

export const QUEUE_NAME = process.env.QUEUE_NAME || "scan-queue";

export interface ScanJobData {
  scanId: string;
  url: string;
}

export interface ScanJobResult {
  ok: true;
}

export const scanQueue = new Queue<ScanJobData, ScanJobResult>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export async function enqueueScan(scanId: string, url: string): Promise<string> {
  const job = await scanQueue.add("scan", { scanId, url });
  return job.id ?? scanId;
}

export const MONITOR_SWEEP_JOB = "monitor-sweep";
export const CLEANUP_STALLED_JOB = "cleanup-stalled";

export async function registerMonitorSweeper(): Promise<void> {
  const pattern = process.env.MONITOR_SWEEP_CRON || "*/15 * * * *";
  await scanQueue.add(MONITOR_SWEEP_JOB, {} as ScanJobData, {
    jobId: "monitor-sweeper",
    repeat: { pattern },
  });
  await scanQueue.add(CLEANUP_STALLED_JOB, {} as ScanJobData, {
    jobId: "cleanup-stalled-daily",
    repeat: { pattern: "0 3 * * *" },
  });
}

export async function removeStaleJobs(): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const state of ["waiting", "delayed", "failed"] as const) {
    const jobs = await scanQueue.getJobs([state], 0, -1);
    for (const job of jobs) {
      if (job.timestamp < cutoff && (await job.remove())) removed += 1;
    }
  }
  return removed;
}
export async function createScanWorker(
  handler: (data: ScanJobData) => Promise<void>,
  onSweep?: () => Promise<number>,
) {
  const worker = new Worker<ScanJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === MONITOR_SWEEP_JOB) {
        if (onSweep) await onSweep();
        return;
      }
      if (job.name === CLEANUP_STALLED_JOB) {
        const removed = await removeStaleJobs();
        console.info(`[worker] removed ${removed} stale jobs`);
        return;
      }
      await handler(job.data);
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.MAX_CONCURRENT_JOBS || "5", 10),
      limiter: { max: 10, duration: 1000 },
    },
  );
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed: ${err.message}`);
  });
  return worker;
}
