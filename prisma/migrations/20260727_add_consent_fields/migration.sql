-- Add LFPDPPP consent audit fields to User
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS "privacyConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentIp" TEXT;
