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
    "source" TEXT,
    "companyKind" TEXT,
    "activityArea" TEXT,
    "note" TEXT,
    "managerId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "counterparties_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("activityArea", "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "companyKind", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "source", "totalRevenue", "type", "updatedAt", "updatedById") SELECT "activityArea", "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "companyKind", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "source", "totalRevenue", "type", "updatedAt", "updatedById" FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");
CREATE INDEX "counterparties_region_idx" ON "counterparties"("region");
CREATE UNIQUE INDEX "counterparties_inn_kpp_key" ON "counterparties"("inn", "kpp");
PRAGMA foreign_key_check("counterparties");
PRAGMA foreign_keys=ON;
