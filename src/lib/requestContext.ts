import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage<{ correlationId: string }>();

export function correlationIdFrom(request: Request): string {
  return request.headers.get("x-correlation-id") || crypto.randomUUID();
}
