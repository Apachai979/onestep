-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalAuctionId" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "auctionDate" DATETIME,
    "duplicateComment" TEXT,
    "distributorId" TEXT NOT NULL,
    "endCustomerId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_externalAuctionId_endCustomerId_idx" ON "projects"("externalAuctionId", "endCustomerId");

-- CreateIndex
CREATE INDEX "projects_distributorId_idx" ON "projects"("distributorId");

-- CreateIndex
CREATE INDEX "projects_endCustomerId_idx" ON "projects"("endCustomerId");

-- CreateIndex
CREATE INDEX "projects_managerId_idx" ON "projects"("managerId");

-- CreateIndex
CREATE INDEX "project_items_projectId_idx" ON "project_items"("projectId");
