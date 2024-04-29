/*
  Warnings:

  - You are about to drop the column `adhesivestrip` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `bandage` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `clip` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `coating` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `container` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `gauzeball` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `gauzepad` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `needleholder` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `pintset` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `pintsetCount` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `plasterfixed` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `plastermain` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `plasterwith` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `scalpel` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `scalpelsharptip` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `tweezers` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `withaperture` on the `Compose` table. All the data in the column will be lost.
  - You are about to drop the column `withaperturemain` on the `Compose` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Compose" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "gauzeballCount" INTEGER,
    "adhesivestripCount" INTEGER,
    "bandageCount" INTEGER,
    "clipCount" INTEGER,
    "coatingCount" INTEGER,
    "containerCount" INTEGER,
    "gauzepadCount" INTEGER,
    "needleholderCount" INTEGER,
    "plasterfixedCount" INTEGER,
    "plastermainCount" INTEGER,
    "plasterwithCount" INTEGER,
    "scalpelCount" INTEGER,
    "scalpelsharptipCount" INTEGER,
    "tweezersCount" INTEGER,
    "withapertureCount" INTEGER,
    "withaperturemainCount" INTEGER,
    CONSTRAINT "Compose_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Code" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Compose" ("adhesivestripCount", "bandageCount", "clipCount", "coatingCount", "codeId", "containerCount", "gauzeballCount", "gauzepadCount", "id", "needleholderCount", "plasterfixedCount", "plastermainCount", "plasterwithCount", "scalpelCount", "scalpelsharptipCount", "tweezersCount", "withapertureCount", "withaperturemainCount") SELECT "adhesivestripCount", "bandageCount", "clipCount", "coatingCount", "codeId", "containerCount", "gauzeballCount", "gauzepadCount", "id", "needleholderCount", "plasterfixedCount", "plastermainCount", "plasterwithCount", "scalpelCount", "scalpelsharptipCount", "tweezersCount", "withapertureCount", "withaperturemainCount" FROM "Compose";
DROP TABLE "Compose";
ALTER TABLE "new_Compose" RENAME TO "Compose";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
