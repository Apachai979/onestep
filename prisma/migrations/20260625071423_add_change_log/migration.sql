-- CreateTable
CREATE TABLE "change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "change_logs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_counterparties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "okpo" TEXT,
    "okved" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankCorrAccount" TEXT,
    "bik" TEXT,
    "totalRevenue" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "counterparties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("address", "bankAccount", "bankCorrAccount", "bankName", "bik", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "totalRevenue", "type", "updatedAt") SELECT "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "totalRevenue", "type", "updatedAt" FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");
CREATE INDEX "counterparties_region_idx" ON "counterparties"("region");
PRAGMA foreign_key_check("counterparties");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "change_logs_entityType_entityId_idx" ON "change_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "change_logs_createdAt_idx" ON "change_logs"("createdAt");
