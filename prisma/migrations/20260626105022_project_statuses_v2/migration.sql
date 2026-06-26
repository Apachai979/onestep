-- Map old "COMPLETED" status to "WON" (won projects).
UPDATE "projects" SET "status" = 'WON' WHERE "status" = 'COMPLETED';
