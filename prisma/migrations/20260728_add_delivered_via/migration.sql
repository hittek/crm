-- Add deliveredVia to ReportRun
ALTER TABLE "ReportRun" ADD COLUMN IF NOT EXISTS "deliveredVia" TEXT;
