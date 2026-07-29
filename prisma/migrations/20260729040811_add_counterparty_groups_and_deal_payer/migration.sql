-- CreateTable
CREATE TABLE "counterparty_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "discount" DECIMAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEGOTIATION',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL,
    "note" TEXT,
    "deliveryAddress" TEXT,
    "lossReason" TEXT,
    "lossComment" TEXT,
    "isAuction" BOOLEAN NOT NULL DEFAULT false,
    "purchaseNumber" TEXT,
    "auctionUrl" TEXT,
    "nmck" DECIMAL NOT NULL DEFAULT 0,
    "bidsDeadlineAt" DATETIME,
    "auctionAt" DATETIME,
    "resultsAt" DATETIME,
    "participantsCount" INTEGER,
    "bidsCount" INTEGER,
    "winner" TEXT,
    "counterpartyId" TEXT NOT NULL,
    "contactId" TEXT,
    "payerId" TEXT,
    "auctionCustomerId" TEXT,
    "auctionCustomerContactId" TEXT,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "sourceProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deals_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_auctionCustomerId_fkey" FOREIGN KEY ("auctionCustomerId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_auctionCustomerContactId_fkey" FOREIGN KEY ("auctionCustomerContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_deals" ("auctionAt", "auctionCustomerContactId", "auctionCustomerId", "auctionUrl", "bidsCount", "bidsDeadlineAt", "contactId", "counterpartyId", "createdAt", "createdById", "deliveryAddress", "discount", "id", "isAuction", "lossComment", "lossReason", "managerId", "nmck", "note", "participantsCount", "purchaseNumber", "resultsAt", "sourceProjectId", "status", "title", "totalAmount", "updatedAt", "updatedById", "winner") SELECT "auctionAt", "auctionCustomerContactId", "auctionCustomerId", "auctionUrl", "bidsCount", "bidsDeadlineAt", "contactId", "counterpartyId", "createdAt", "createdById", "deliveryAddress", "discount", "id", "isAuction", "lossComment", "lossReason", "managerId", "nmck", "note", "participantsCount", "purchaseNumber", "resultsAt", "sourceProjectId", "status", "title", "totalAmount", "updatedAt", "updatedById", "winner" FROM "deals";
DROP TABLE "deals";
ALTER TABLE "new_deals" RENAME TO "deals";
CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_counterpartyId_idx" ON "deals"("counterpartyId");
CREATE INDEX "deals_managerId_idx" ON "deals"("managerId");
CREATE INDEX "deals_sourceProjectId_idx" ON "deals"("sourceProjectId");
CREATE INDEX "deals_isAuction_idx" ON "deals"("isAuction");
CREATE INDEX "deals_payerId_idx" ON "deals"("payerId");
CREATE TABLE "new_counterparties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT,
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
    "website" TEXT,
    "address" TEXT,
    "source" TEXT,
    "companyKind" TEXT,
    "activityArea" TEXT,
    "note" TEXT,
    "groupId" TEXT,
    "isGroupPrimary" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "counterparties_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "counterparty_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "counterparties_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("activityArea", "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "city", "companyKind", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "managerId", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "source", "totalRevenue", "type", "updatedAt", "updatedById", "website") SELECT "activityArea", "address", "bankAccount", "bankCorrAccount", "bankName", "bik", "city", "companyKind", "createdAt", "createdById", "discount", "email", "id", "inn", "kpp", "managerId", "name", "note", "ogrn", "okpo", "okved", "phone", "region", "source", "totalRevenue", "type", "updatedAt", "updatedById", "website" FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");
CREATE INDEX "counterparties_region_idx" ON "counterparties"("region");
CREATE INDEX "counterparties_groupId_idx" ON "counterparties"("groupId");
CREATE UNIQUE INDEX "counterparties_inn_kpp_key" ON "counterparties"("inn", "kpp");
PRAGMA foreign_key_check("deals");
PRAGMA foreign_key_check("counterparties");
PRAGMA foreign_keys=ON;
