-- Add secretHash column to Webhook table
ALTER TABLE "Webhook" ADD COLUMN "secretHash" TEXT;