/*
  Warnings:

  - You are about to drop the column `consist` on the `codes` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Consist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "napkin" TEXT,
    "ball" TEXT,
    "pintsetMedium" TEXT,
    "pintsetThin" TEXT,
    "scalpelRemoveFiber" TEXT,
    "scalpelEleven" TEXT,
    "clamp" TEXT,
    "needleHolder" TEXT,
    "container" TEXT,
    "bandage" TEXT,
    "plasterTrip" TEXT,
    "plaster" TEXT,
    "plasterPostOperative" TEXT,
    "plasterFixCatheter" TEXT,
    "cover" TEXT,
    "coverAperture" TEXT,
    "coverAdhesive" TEXT,
    CONSTRAINT "Consist_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "neosetId" INTEGER,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    CONSTRAINT "codes_neosetId_fkey" FOREIGN KEY ("neosetId") REFERENCES "neosets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_codes" ("id", "neosetId", "title", "transcript") SELECT "id", "neosetId", "title", "transcript" FROM "codes";
DROP TABLE "codes";
ALTER TABLE "new_codes" RENAME TO "codes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
