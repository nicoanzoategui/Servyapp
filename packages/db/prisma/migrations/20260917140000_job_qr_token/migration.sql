-- qr_token ya existe en prod como NOT NULL sin DEFAULT de Postgres
-- (Prisma @default(cuid()) es client-side). Esta migración alinea DB + filas viejas.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'qr_token'
    ) THEN
        ALTER TABLE "jobs" ADD COLUMN "qr_token" TEXT;
    END IF;
END $$;

UPDATE "jobs"
SET "qr_token" = replace(gen_random_uuid()::text, '-', '')
WHERE "qr_token" IS NULL OR btrim("qr_token") = '';

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_qr_token_key" ON "jobs"("qr_token");

ALTER TABLE "jobs" ALTER COLUMN "qr_token" SET NOT NULL;
