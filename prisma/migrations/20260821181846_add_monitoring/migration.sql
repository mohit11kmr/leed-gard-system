-- CreateEnum
CREATE TYPE "MonitorFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "monitoredSiteId" TEXT;

-- CreateTable
CREATE TABLE "MonitoredSite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "frequency" "MonitorFrequency" NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertEmail" TEXT,
    "alertWebhook" TEXT,
    "lastScanId" TEXT,
    "lastScore" INTEGER,
    "lastBroken" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "nextScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitoredSite_nextScanAt_idx" ON "MonitoredSite"("nextScanAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredSite_userId_url_key" ON "MonitoredSite"("userId", "url");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_monitoredSiteId_fkey" FOREIGN KEY ("monitoredSiteId") REFERENCES "MonitoredSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredSite" ADD CONSTRAINT "MonitoredSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
