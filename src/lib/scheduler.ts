import { isValidCron } from "./cron";
import { prisma } from "./prisma";
import { SCHEDULED_SCAN_JOB, scanQueue, ScanJobData } from "./queue";
import { validatePublicUrl } from "@/scanner/fetchHtml";

export const SCHEDULE_PRESETS = {
  DAILY: "0 9 * * *",
  WEEKLY: "0 9 * * 1",
} as const;

export { isValidCron, GUEST_CLEANUP_JOB };

function jobIdFor(id: string): string {
  return `sched-${id}`;
}

const GUEST_CLEANUP_JOB = "guest-cleanup";

export async function registerScheduleJob(id: string, cron: string): Promise<void> {
  // BullMQ v5 job schedulers keep a stable id (sched-<scheduleId>), which makes
  // enable/disable/delete removals reliable — getRepeatableJobs() no longer
  // exposes the custom jobId in v5.
  await scanQueue.upsertJobScheduler(
    jobIdFor(id),
    { pattern: cron },
    {
      name: SCHEDULED_SCAN_JOB,
      data: { scheduledScanId: id } as unknown as { scanId: string; url: string },
      opts: { removeOnComplete: { count: 50 } },
    },
  );
}

export async function unregisterScheduleJob(id: string, cron?: string): Promise<void> {
  try {
    await scanQueue.removeJobScheduler(jobIdFor(id));
  } catch (err) {
    console.error("[scheduler] unregister failed:", err instanceof Error ? err.message : err);
  }
}

export async function registerAllSchedules(): Promise<number> {
  const schedules = await prisma.scheduledScan.findMany({ where: { enabled: true } });
  for (const s of schedules) {
    await registerScheduleJob(s.id, s.schedule);
  }
  return schedules.length;
}

export async function registerGuestCleanup(): Promise<void> {
  // Run daily at 3 AM
  await scanQueue.upsertJobScheduler(
    GUEST_CLEANUP_JOB,
    { pattern: "0 3 * * *" },
    {
      name: GUEST_CLEANUP_JOB,
      data: {} as ScanJobData,
      opts: { removeOnComplete: { count: 30 } },
    },
  );
}

export async function cleanupExpiredGuests(): Promise<number> {
  const now = new Date();
  const result = await prisma.user.deleteMany({
    where: {
      guestExpiresAt: { not: null, lt: now },
      email: { endsWith: "@leadguard.local" },
    },
  });
  return result.count;
}

export interface CreateScheduleInput {
  userId: string;
  url: string;
  preset?: keyof typeof SCHEDULE_PRESETS;
  cron?: string;
}

export async function createScheduledScan(input: CreateScheduleInput) {
  const normalizedUrl = await validatePublicUrl(input.url);
  const schedule = input.preset ? SCHEDULE_PRESETS[input.preset] : (input.cron ?? "").trim();

  if (!isValidCron(schedule)) {
    throw new Error("Invalid cron expression.");
  }

  const existing = await prisma.scheduledScan.findFirst({
    where: { userId: input.userId, url: normalizedUrl },
  });
  if (existing) {
    throw new Error("A schedule for this URL already exists.");
  }

  const created = await prisma.scheduledScan.create({
    data: {
      userId: input.userId,
      url: normalizedUrl,
      schedule,
      enabled: true,
    },
  });
  await registerScheduleJob(created.id, schedule);
  return created;
}

export async function setScheduleEnabled(userId: string, id: string, enabled: boolean) {
  const row = await prisma.scheduledScan.findFirst({ where: { id, userId } });
  if (!row) return null;
  const updated = await prisma.scheduledScan.update({
    where: { id },
    data: { enabled },
  });
  if (enabled) {
    await registerScheduleJob(updated.id, updated.schedule);
  } else {
    await unregisterScheduleJob(updated.id);
  }
  return updated;
}

export async function deleteScheduledScan(userId: string, id: string) {
  const row = await prisma.scheduledScan.findFirst({ where: { id, userId } });
  if (!row) return null;
  await unregisterScheduleJob(row.id);
  await prisma.scheduledScan.delete({ where: { id } });
  return row;
}
