-- Visit fee flow: priority, visit_fee, quotation types, payment types

ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "visit_fee" DOUBLE PRECISION;

ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "quotation_type" TEXT NOT NULL DEFAULT 'visit';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_type" TEXT NOT NULL DEFAULT 'visit';

-- Allow visit + repair quotations per job offer
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_job_offer_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_job_offer_id_quotation_type_key"
  ON "quotations"("job_offer_id", "quotation_type");
