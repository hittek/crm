/*
  Warnings:

  - Added the required column `organizationId` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `SavedView` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Organization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "favicon" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "locale" TEXT NOT NULL DEFAULT 'es-MX',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "outcome" TEXT,
    "duration" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "organizationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "contactId" INTEGER,
    "dealId" INTEGER,
    CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("contactId", "content", "createdAt", "createdBy", "dealId", "duration", "id", "isPrivate", "metadata", "outcome", "subject", "type", "updatedAt") SELECT "contactId", "content", "createdAt", "createdBy", "dealId", "duration", "id", "isPrivate", "metadata", "outcome", "subject", "type", "updatedAt" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "entityName" TEXT,
    "details" TEXT,
    "userId" INTEGER,
    "userName" TEXT,
    "organizationId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "entity", "entityId", "entityName", "id", "ipAddress", "userAgent", "userId", "userName") SELECT "action", "createdAt", "details", "entity", "entityId", "entityName", "id", "ipAddress", "userAgent", "userId", "userName" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "company" TEXT,
    "role" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT,
    "notes" TEXT,
    "avatar" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'org',
    "visibleTo" TEXT,
    "ownerId" INTEGER,
    "organizationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("address", "avatar", "city", "company", "country", "createdAt", "createdBy", "email", "firstName", "id", "isPrivate", "lastName", "linkedin", "mobile", "notes", "ownerId", "phone", "postalCode", "role", "source", "state", "status", "tags", "twitter", "updatedAt", "updatedBy", "visibility", "visibleTo", "website") SELECT "address", "avatar", "city", "company", "country", "createdAt", "createdBy", "email", "firstName", "id", "isPrivate", "lastName", "linkedin", "mobile", "notes", "ownerId", "phone", "postalCode", "role", "source", "state", "status", "tags", "twitter", "updatedAt", "updatedBy", "visibility", "visibleTo", "website" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
CREATE UNIQUE INDEX "Contact_email_organizationId_key" ON "Contact"("email", "organizationId");
CREATE TABLE "new_Deal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expectedClose" DATETIME,
    "actualClose" DATETIME,
    "description" TEXT,
    "lostReason" TEXT,
    "owner" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'org',
    "visibleTo" TEXT,
    "ownerId" INTEGER,
    "organizationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "contactId" INTEGER,
    CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deal" ("actualClose", "contactId", "createdAt", "createdBy", "currency", "description", "expectedClose", "id", "lostReason", "owner", "ownerId", "priority", "probability", "stage", "tags", "title", "updatedAt", "updatedBy", "value", "visibility", "visibleTo") SELECT "actualClose", "contactId", "createdAt", "createdBy", "currency", "description", "expectedClose", "id", "lostReason", "owner", "ownerId", "priority", "probability", "stage", "tags", "title", "updatedAt", "updatedBy", "value", "visibility", "visibleTo" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");
CREATE TABLE "new_SavedView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "columns" TEXT,
    "sortBy" TEXT,
    "sortOrder" TEXT NOT NULL DEFAULT 'asc',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedView" ("columns", "createdAt", "createdBy", "entity", "filters", "id", "isDefault", "isShared", "name", "sortBy", "sortOrder", "updatedAt") SELECT "columns", "createdAt", "createdBy", "entity", "filters", "id", "isDefault", "isShared", "name", "sortBy", "sortOrder", "updatedAt" FROM "SavedView";
DROP TABLE "SavedView";
ALTER TABLE "new_SavedView" RENAME TO "SavedView";
CREATE INDEX "SavedView_organizationId_idx" ON "SavedView"("organizationId");
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATETIME,
    "dueTime" TEXT,
    "reminderDate" DATETIME,
    "completedAt" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'task',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRule" TEXT,
    "owner" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'org',
    "assignedToId" INTEGER,
    "ownerId" INTEGER,
    "organizationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "contactId" INTEGER,
    "dealId" INTEGER,
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assignedToId", "completedAt", "contactId", "createdAt", "createdBy", "dealId", "description", "dueDate", "dueTime", "id", "isRecurring", "owner", "ownerId", "priority", "recurringRule", "reminderDate", "status", "title", "type", "updatedAt", "updatedBy", "visibility") SELECT "assignedToId", "completedAt", "contactId", "createdAt", "createdBy", "dealId", "description", "dueDate", "dueTime", "id", "isRecurring", "owner", "ownerId", "priority", "recurringRule", "reminderDate", "status", "title", "type", "updatedAt", "updatedBy", "visibility" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "locale" TEXT NOT NULL DEFAULT 'es-MX',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferences" TEXT,
    "lastLoginAt" DATETIME,
    "organizationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "id", "isActive", "locale", "name", "preferences", "role", "timezone", "updatedAt") SELECT "avatar", "createdAt", "email", "id", "isActive", "locale", "name", "preferences", "role", "timezone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX "User_email_organizationId_key" ON "User"("email", "organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
