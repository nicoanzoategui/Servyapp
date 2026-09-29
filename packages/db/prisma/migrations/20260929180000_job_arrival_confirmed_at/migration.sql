-- Check-in de llegada del técnico (separado del QR de cierre de trabajo).

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "arrival_confirmed_at" TIMESTAMP(3);
