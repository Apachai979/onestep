-- CreateTable
CREATE TABLE "auctions" (
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
    "supplierId" TEXT NOT NULL,
    "supplierContactId" TEXT,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auctions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auctions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_supplierContactId_fkey" FOREIGN KEY ("supplierContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auctions_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auctions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auctions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "result" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dealId" TEXT,
    "projectId" TEXT,
    "distributorId" TEXT,
    "endCustomerId" TEXT,
    "auctionId" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("allDay", "assigneeId", "closedAt", "createdAt", "createdById", "dealId", "description", "distributorId", "endAt", "endCustomerId", "id", "projectId", "result", "startAt", "status", "title", "type", "updatedAt") SELECT "allDay", "assigneeId", "closedAt", "createdAt", "createdById", "dealId", "description", "distributorId", "endAt", "endCustomerId", "id", "projectId", "result", "startAt", "status", "title", "type", "updatedAt" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "tasks_startAt_idx" ON "tasks"("startAt");
CREATE INDEX "tasks_dealId_idx" ON "tasks"("dealId");
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");
CREATE INDEX "tasks_distributorId_idx" ON "tasks"("distributorId");
CREATE INDEX "tasks_endCustomerId_idx" ON "tasks"("endCustomerId");
CREATE INDEX "tasks_auctionId_idx" ON "tasks"("auctionId");
PRAGMA foreign_key_check("tasks");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "auctions_projectId_idx" ON "auctions"("projectId");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "auctions_managerId_idx" ON "auctions"("managerId");

-- CreateIndex
CREATE INDEX "auction_items_auctionId_idx" ON "auction_items"("auctionId");

-- CreateIndex
CREATE INDEX "auction_items_productId_idx" ON "auction_items"("productId");
