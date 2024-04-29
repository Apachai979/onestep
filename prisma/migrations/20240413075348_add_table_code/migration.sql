-- CreateTable
CREATE TABLE "Code" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "neosetId" INTEGER,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    CONSTRAINT "Code_neosetId_fkey" FOREIGN KEY ("neosetId") REFERENCES "neosets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
