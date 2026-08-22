import { redis } from "./redis";

const RESULT_TTL_SECONDS = 60 * 60;

export async function getCachedScanResult(id: string): Promise<unknown | null> {
  const cached = await redis.get(`scan:result:${id}`);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheScanResult(id: string, response: unknown): Promise<void> {
  await redis.set(`scan:result:${id}`, JSON.stringify(response), "EX", RESULT_TTL_SECONDS);
}
