/*
  Warnings:

  - You are about to drop the column `contactPerson` on the `counterparties` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counterpartyId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" DATETIME,
    "position" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contacts_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "counterparties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("address", "bankAccount", "bankCorrAccount", "bankName", "bik", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "phone", "region", "totalRevenue", "type", "updatedAt") SELECT "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "name", "note", "ogrn", "phone", "region", "totalRevenue", "type", "updatedAt" FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");
CREATE INDEX "counterparties_region_idx" ON "counterparties"("region");
PRAGMA foreign_key_check("counterparties");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "contacts_counterpartyId_idx" ON "contacts"("counterpartyId");
