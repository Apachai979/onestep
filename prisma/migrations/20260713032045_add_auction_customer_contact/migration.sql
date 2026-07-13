-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_auctions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseNumber" TEXT,
    "auctionUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "nmck" DECIMAL NOT NULL DEFAULT 0,
    "bidsDeadlineAt" DATETIME,
    "auctionAt" DATETIME,
    "resultsAt" DATETIME,
    "participantsCount" INTEGER,
    "bidsCount" INTEGER,
    "winner" TEXT,
    "lossComment" TEXT,
    "protocolAttachmentId" TEXT,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerContactId" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplierContactId" TEXT,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auctions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auctions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auctions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_supplierContactId_fkey" FOREIGN KEY ("supplierContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auctions_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auctions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_auctions" ("auctionAt", "auctionUrl", "bidsCount", "bidsDeadlineAt", "createdAt", "createdById", "customerId", "id", "lossComment", "managerId", "nmck", "participantsCount", "projectId", "protocolAttachmentId", "purchaseNumber", "resultsAt", "status", "supplierContactId", "supplierId", "updatedAt", "updatedById", "winner") SELECT "auctionAt", "auctionUrl", "bidsCount", "bidsDeadlineAt", "createdAt", "createdById", "customerId", "id", "lossComment", "managerId", "nmck", "participantsCount", "projectId", "protocolAttachmentId", "purchaseNumber", "resultsAt", "status", "supplierContactId", "supplierId", "updatedAt", "updatedById", "winner" FROM "auctions";
DROP TABLE "auctions";
ALTER TABLE "new_auctions" RENAME TO "auctions";
CREATE INDEX "auctions_projectId_idx" ON "auctions"("projectId");
CREATE INDEX "auctions_status_idx" ON "auctions"("status");
CREATE INDEX "auctions_managerId_idx" ON "auctions"("managerId");
PRAGMA foreign_key_check("auctions");
PRAGMA foreign_keys=ON;
