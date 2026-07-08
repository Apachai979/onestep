-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counterpartyId" TEXT,
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
INSERT INTO "new_contacts" ("birthDate", "counterpartyId", "createdAt", "email", "firstName", "id", "isPrimary", "lastName", "phone", "position", "updatedAt") SELECT "birthDate", "counterpartyId", "createdAt", "email", "firstName", "id", "isPrimary", "lastName", "phone", "position", "updatedAt" FROM "contacts";
DROP TABLE "contacts";
ALTER TABLE "new_contacts" RENAME TO "contacts";
CREATE INDEX "contacts_counterpartyId_idx" ON "contacts"("counterpartyId");
PRAGMA foreign_key_check("contacts");
PRAGMA foreign_keys=ON;
