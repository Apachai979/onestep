-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedDate" DATETIME,
    "shippedAt" DATETIME,
    "shippedById" TEXT,
    "deliveryAddress" TEXT,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "recipientContactId" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "docNumber" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shipments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipments_shippedById_fkey" FOREIGN KEY ("shippedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shipments" ("carrier", "createdAt", "createdById", "dealId", "deliveryAddress", "docNumber", "id", "note", "number", "plannedDate", "recipientContactId", "recipientEmail", "recipientName", "recipientPhone", "shippedAt", "status", "trackingNumber", "updatedAt", "updatedById") SELECT "carrier", "createdAt", "createdById", "dealId", "deliveryAddress", "docNumber", "id", "note", "number", "plannedDate", "recipientContactId", "recipientEmail", "recipientName", "recipientPhone", "shippedAt", "status", "trackingNumber", "updatedAt", "updatedById" FROM "shipments";
DROP TABLE "shipments";
ALTER TABLE "new_shipments" RENAME TO "shipments";
CREATE UNIQUE INDEX "shipments_number_key" ON "shipments"("number");
CREATE INDEX "shipments_dealId_idx" ON "shipments"("dealId");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
CREATE INDEX "shipments_plannedDate_idx" ON "shipments"("plannedDate");
-- Старые отгрузки остаются без shippedById намеренно: кто нажал «Отгрузить»,
-- нигде не записывалось (updatedById перетирает любая последующая правка), и
-- приписать документ не тому, кто его провёл, хуже прочерка в карточке.

PRAGMA foreign_key_check("shipments");
PRAGMA foreign_keys=ON;
