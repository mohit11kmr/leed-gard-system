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
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export async function enqueueScan(scanId: string, url: string): Promise<string> {
  const job = await scanQueue.add("scan", { scanId, url });
  return job.id ?? scanId;
}

export const MONITOR_SWEEP_JOB = "monitor-sweep";

export async function registerMonitorSweeper(): Promise<void> {
  const pattern = process.env.MONITOR_SWEEP_CRON || "*/15 * * * *";
  await scanQueue.add(
    MONITOR_SWEEP_JOB,
    {} as ScanJobData,
    {
      jobId: "monitor-sweeper",
      repeat: { pattern },
    }
  );
}

export async function createScanWorker(
  handler: (data: ScanJobData) => Promise<void>,
  onSweep?: () => Promise<number>
) {
  const worker = new Worker<ScanJobData>(QUEUE_NAME, async (job) => {
    if (job.name === MONITOR_SWEEP_JOB) {
      if (onSweep) await onSweep();
      return;
    }
    await handler(job.data);
  }, {
    connection: redis,
    concurrency: parseInt(process.env.MAX_CONCURRENT_JOBS || "5", 10),
    limiter: { max: 10, duration: 1000 },
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed: ${err.message}`);
  });
  return worker;
}