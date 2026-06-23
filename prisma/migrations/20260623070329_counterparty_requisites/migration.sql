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
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankCorrAccount" TEXT,
    "bik" TEXT,
    "totalRevenue" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "counterparties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("address", "contactPerson", "createdAt", "createdById", "email", "id", "inn", "name", "note", "phone", "region", "type", "updatedAt") SELECT "address", "contactPerson", "createdAt", "createdById", "email", "id", "inn", "name", "note", "phone", "region", "type", "updatedAt" FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");
CREATE INDEX "counterparties_region_idx" ON "counterparties"("region");
PRAGMA foreign_key_check("counterparties");
PRAGMA foreign_keys=ON;
