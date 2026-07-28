-- Rename orgId → organizationId for all models that used the short form.
-- Models affected: KnowledgeBase, KnowledgeBaseDocument, KnowledgeBaseChunk,
--   Chatbot, Conversation, ChannelConfig, Provider, Product, Quote,
--   ReportDefinition, ReportRun

-- KnowledgeBase
ALTER TABLE "KnowledgeBase" RENAME COLUMN "orgId" TO "organizationId";

-- KnowledgeBaseDocument
ALTER TABLE "KnowledgeBaseDocument" RENAME COLUMN "orgId" TO "organizationId";

-- KnowledgeBaseChunk
ALTER TABLE "KnowledgeBaseChunk" RENAME COLUMN "orgId" TO "organizationId";

-- Chatbot
ALTER TABLE "Chatbot" RENAME COLUMN "orgId" TO "organizationId";

-- Conversation
ALTER TABLE "Conversation" RENAME COLUMN "orgId" TO "organizationId";

-- ChannelConfig
ALTER TABLE "ChannelConfig" RENAME COLUMN "orgId" TO "organizationId";

-- Provider
ALTER TABLE "Provider" RENAME COLUMN "orgId" TO "organizationId";

-- Product
ALTER TABLE "Product" RENAME COLUMN "orgId" TO "organizationId";

-- Quote
ALTER TABLE "Quote" RENAME COLUMN "orgId" TO "organizationId";

-- ReportDefinition
ALTER TABLE "ReportDefinition" RENAME COLUMN "orgId" TO "organizationId";

-- ReportRun
ALTER TABLE "ReportRun" RENAME COLUMN "orgId" TO "organizationId";

-- Update unique constraint on ReportRun (references the renamed column)
ALTER INDEX IF EXISTS "ReportRun_reportId_orgId_windowKey_key"
    RENAME TO "ReportRun_reportId_organizationId_windowKey_key";

-- Update indexes that reference the old column name
DROP INDEX IF EXISTS "ReportDefinition_orgId_idx";
CREATE INDEX "ReportDefinition_organizationId_idx" ON "ReportDefinition"("organizationId");

DROP INDEX IF EXISTS "ReportRun_orgId_idx";
CREATE INDEX "ReportRun_organizationId_idx" ON "ReportRun"("organizationId");
