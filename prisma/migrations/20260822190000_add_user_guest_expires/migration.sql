-- Add guestExpiresAt column to User table
ALTER TABLE "User" ADD COLUMN "guestExpiresAt" TIMESTAMPTZ;