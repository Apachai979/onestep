-- CreateTable
CREATE TABLE "Images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alt" TEXT,
    "description" TEXT,
    "src" TEXT NOT NULL,
    "neosetId" INTEGER,
    CONSTRAINT "Images_neosetId_fkey" FOREIGN KEY ("neosetId") REFERENCES "neosets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
