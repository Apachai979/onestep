/*
  Warnings:

  - You are about to drop the column `title` on the `neosets` table. All the data in the column will be lost.
  - Added the required column `name` to the `neosets` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_neosets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pathname" TEXT NOT NULL
);
INSERT INTO "new_neosets" ("description", "id", "pathname") SELECT "description", "id", "pathname" FROM "neosets";
DROP TABLE "neosets";
ALTER TABLE "new_neosets" RENAME TO "neosets";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
