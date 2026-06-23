-- CreateTable
CREATE TABLE "_ContactToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ContactToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ContactToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ContactToProject_AB_unique" ON "_ContactToProject"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactToProject_B_index" ON "_ContactToProject"("B");
