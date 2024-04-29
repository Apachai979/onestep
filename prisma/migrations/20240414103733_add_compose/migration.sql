/*
  Warnings:

  - You are about to drop the `Code` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Code";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "neosetId" INTEGER,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "consist" TEXT NOT NULL,
    CONSTRAINT "codes_neosetId_fkey" FOREIGN KEY ("neosetId") REFERENCES "neosets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
