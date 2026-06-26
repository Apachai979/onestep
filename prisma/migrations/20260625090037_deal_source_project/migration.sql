-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "counterpartyId" TEXT NOT NULL,
    "contactId" TEXT,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "sourceProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deals_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_deals" ("contactId", "counterpartyId", "createdAt", "createdById", "id", "managerId", "note", "status", "title", "totalAmount", "updatedAt", "updatedById") SELECT "contactId", "counterpartyId", "createdAt", "createdById", "id", "managerId", "note", "status", "title", "totalAmount", "updatedAt", "updatedById" FROM "deals";
DROP TABLE "deals";
ALTER TABLE "new_deals" RENAME TO "deals";
CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_counterpartyId_idx" ON "deals"("counterpartyId");
CREATE INDEX "deals_managerId_idx" ON "deals"("managerId");
CREATE INDEX "deals_sourceProjectId_idx" ON "deals"("sourceProjectId");
PRAGMA foreign_key_check("deals");
PRAGMA foreign_keys=ON;
