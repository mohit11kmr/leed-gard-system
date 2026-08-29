-- Add secretEncrypted column to Webhook table
ALTER TABLE "Webhook" ADD COLUMN "secretEncrypted" TEXT;