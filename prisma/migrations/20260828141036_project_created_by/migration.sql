-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalAuctionId" TEXT,
    "internalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL,
    "auctionDate" DATETIME,
    "duplicateComment" TEXT,
    "duplicateOfId" TEXT,
    "lossReason" TEXT,
    "lossComment" TEXT,
    "distributorId" TEXT NOT NULL,
    "endCustomerId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("auctionDate", "createdAt", "discount", "distributorId", "duplicateComment", "duplicateOfId", "endCustomerId", "externalAuctionId", "id", "internalName", "lossComment", "lossReason", "managerId", "status", "totalAmount", "updatedAt", "updatedById") SELECT "auctionDate", "createdAt", "discount", "distributorId", "duplicateComment", "duplicateOfId", "endCustomerId", "externalAuctionId", "id", "internalName", "lossComment", "lossReason", "managerId", "status", "totalAmount", "updatedAt", "updatedById" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_externalAuctionId_endCustomerId_idx" ON "projects"("externalAuctionId", "endCustomerId");
CREATE INDEX "projects_distributorId_idx" ON "projects"("distributorId");
CREATE INDEX "projects_endCustomerId_idx" ON "projects"("endCustomerId");
CREATE INDEX "projects_managerId_idx" ON "projects"("managerId");
-- Автор старых проектов восстанавливается из журнала изменений: запись CREATE
-- пишется с authorId с самого появления журнала. Проекты старше журнала (и
-- заведённые импортом) остаются без автора — карточка покажет только дату.
UPDATE "projects" SET "createdById" = (
    SELECT cl."authorId" FROM "change_logs" cl
    WHERE cl."entityType" = 'Project'
      AND cl."entityId" = "projects"."id"
      AND cl."action" = 'CREATE'
    ORDER BY cl."createdAt" ASC
    LIMIT 1
) WHERE "createdById" IS NULL;

PRAGMA foreign_key_check("projects");
PRAGMA foreign_keys=ON;
