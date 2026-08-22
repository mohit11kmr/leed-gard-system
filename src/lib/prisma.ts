import { PrismaClient } from "@prisma/client";
import "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL || "";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl.includes("connection_limit=")
          ? databaseUrl
          : `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=10`,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
