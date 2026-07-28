-- CreateTable: ReportDefinition
CREATE TABLE "ReportDefinition" (
    "id"          SERIAL PRIMARY KEY,
    "orgId"       INTEGER NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "prompt"      TEXT,
    "definition"  TEXT NOT NULL,
    "schedule"    TEXT,
    "recipients"  TEXT,
    "isBuiltIn"   BOOLEAN NOT NULL DEFAULT false,
    "createdBy"   INTEGER,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: ReportRun
CREATE TABLE "ReportRun" (
    "id"          SERIAL PRIMARY KEY,
    "reportId"    INTEGER NOT NULL,
    "orgId"       INTEGER NOT NULL,
    "windowKey"   TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "result"      TEXT,
    "error"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3)
);

-- ForeignKeys
ALTER TABLE "ReportDefinition"
    ADD CONSTRAINT "ReportDefinition_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportDefinition"
    ADD CONSTRAINT "ReportDefinition_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportRun"
    ADD CONSTRAINT "ReportRun_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "ReportDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportRun"
    ADD CONSTRAINT "ReportRun_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint for idempotency
CREATE UNIQUE INDEX "ReportRun_reportId_orgId_windowKey_key"
    ON "ReportRun"("reportId", "orgId", "windowKey");

-- Indexes
CREATE INDEX "ReportDefinition_orgId_idx" ON "ReportDefinition"("orgId");
CREATE INDEX "ReportRun_orgId_idx" ON "ReportRun"("orgId");
CREATE INDEX "ReportRun_reportId_idx" ON "ReportRun"("reportId");

-- Auto-update updatedAt trigger for ReportDefinition
CREATE OR REPLACE FUNCTION update_report_definition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ReportDefinition_updatedAt"
    BEFORE UPDATE ON "ReportDefinition"
    FOR EACH ROW EXECUTE FUNCTION update_report_definition_updated_at();

-- Seed: built-in "Resumen del CRM" report (org 1 default; scheduler will populate for all orgs on first run)
INSERT INTO "ReportDefinition" (
    "orgId", "name", "description", "prompt", "definition",
    "schedule", "isBuiltIn", "createdAt", "updatedAt"
)
SELECT
    id,
    'Resumen del CRM',
    'Dashboard general: pipeline, negocios, contactos y tareas',
    NULL,
    '{"widgets":[
        {"id":"w1","type":"number_card","title":"Negocios ganados este mes","query":{"entity":"deal","aggregate":"count","filters":[{"field":"stage","op":"eq","value":"won"},{"field":"actualClose","op":"gte","value":"{{startOf:month}}"}]}},
        {"id":"w2","type":"bar_chart","title":"Pipeline por etapa","query":{"entity":"deal","aggregate":"count","groupBy":"stage","filters":[{"field":"stage","op":"notIn","value":"won,lost"}]}},
        {"id":"w3","type":"number_card","title":"Contactos esta semana","query":{"entity":"contact","aggregate":"count","filters":[{"field":"createdAt","op":"gte","value":"{{startOf:week}}"}]}},
        {"id":"w4","type":"number_card","title":"Tareas pendientes","query":{"entity":"task","aggregate":"count","filters":[{"field":"status","op":"neq","value":"completed"}]}},
        {"id":"w5","type":"bar_chart","title":"Actividad reciente","query":{"entity":"activity","aggregate":"count","groupBy":"type","filters":[{"field":"createdAt","op":"gte","value":"{{startOf:week}}"}]}},
        {"id":"w6","type":"number_card","title":"Conversaciones activas","query":{"entity":"conversation","aggregate":"count","filters":[{"field":"status","op":"eq","value":"open"}]}}
    ]}',
    '{"frequency":"daily","hour":8,"timezone":"America/Mexico_City"}',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization"
ON CONFLICT DO NOTHING;
