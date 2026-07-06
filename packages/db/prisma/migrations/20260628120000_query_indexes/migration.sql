-- Query indexes for visit flow, webhooks and earnings

CREATE INDEX IF NOT EXISTS "service_requests_user_phone_idx" ON "service_requests"("user_phone");
CREATE INDEX IF NOT EXISTS "service_requests_status_idx" ON "service_requests"("status");

CREATE INDEX IF NOT EXISTS "job_offers_request_id_idx" ON "job_offers"("request_id");
CREATE INDEX IF NOT EXISTS "job_offers_professional_id_idx" ON "job_offers"("professional_id");
CREATE INDEX IF NOT EXISTS "job_offers_status_created_at_idx" ON "job_offers"("status", "created_at");

CREATE INDEX IF NOT EXISTS "payments_status_payment_type_idx" ON "payments"("status", "payment_type");
CREATE INDEX IF NOT EXISTS "payments_mp_payment_id_idx" ON "payments"("mp_payment_id");

CREATE INDEX IF NOT EXISTS "jobs_status_updated_at_idx" ON "jobs"("status", "updated_at");

CREATE INDEX IF NOT EXISTS "earnings_job_id_idx" ON "earnings"("job_id");
CREATE INDEX IF NOT EXISTS "earnings_professional_id_transferred_at_idx" ON "earnings"("professional_id", "transferred_at");
