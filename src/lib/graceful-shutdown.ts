import type { Worker } from "bullmq";
import { prisma } from "./prisma";
import { redis } from "./redis";

let installed = false;

export function installGracefulShutdown(worker: Worker): void {
  if (installed) return;
  installed = true;

  const shutdown = async (signal: string) => {
    const forceExit = setTimeout(() => process.exit(1), 30_000);
    forceExit.unref();
    try {
      console.info(`[shutdown] received ${signal}; draining worker`);
      await worker.close();
      await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
      process.exit(0);
    } catch (error) {
      console.error("[shutdown] graceful shutdown failed", error);
      process.exit(1);
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
