-- Add reset token fields to User table
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiresAt" TIMESTAMPTZ;