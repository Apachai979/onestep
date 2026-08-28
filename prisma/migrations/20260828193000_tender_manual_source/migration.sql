-- Откуда закупка попала в CRM: AUTOSEARCH — из автопоиска, MANUAL — заведена
-- вручную по номеру. Курсор синхронизации считается только по AUTOSEARCH.
ALTER TABLE "tenders" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'AUTOSEARCH';
