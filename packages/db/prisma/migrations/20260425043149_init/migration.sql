-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "ProfessionalDocumentKind" AS ENUM ('dni_front', 'dni_back', 'certification');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "last_name" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "dni" TEXT,
    "categories" TEXT[],
    "zones" TEXT[],
    "schedule_json" JSONB,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT true,
    "cbu_alias" TEXT,
    "mp_alias" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "after_hours_available" BOOLEAN NOT NULL DEFAULT false,
    "payout_institution" TEXT,
    "payout_account_type" TEXT,
    "tax_id" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ProfessionalStatus" NOT NULL DEFAULT 'pending',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 1,
    "profile_operational_complete" BOOLEAN NOT NULL DEFAULT false,
    "profile_ready_whatsapp_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_documents" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "kind" "ProfessionalDocumentKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "user_phone" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "service_type" TEXT NOT NULL DEFAULT 'diagnostic',
    "phase" TEXT NOT NULL DEFAULT 'visit_pending',
    "visit_price" DECIMAL(10,2),
    "repair_price" DECIMAL(10,2),
    "visit_payment_id" TEXT,
    "repair_payment_id" TEXT,
    "visit_status" TEXT NOT NULL DEFAULT 'pending',
    "repair_status" TEXT,
    "photos" TEXT[],
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_slot" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "scheduled_time" TEXT,
    "is_flexible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "schedule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "job_offer_id" TEXT NOT NULL,
    "items_json" JSONB NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "estimated_duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "mp_payment_id" TEXT,
    "mp_preference_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "rating" INTEGER,
    "review" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "payment_released_at" TIMESTAMP(3),
    "phase" TEXT NOT NULL DEFAULT 'visit_pending',
    "qr_token" TEXT NOT NULL,
    "qr_scanned_at" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "gross_amount" DOUBLE PRECISION NOT NULL,
    "commission_pct" DOUBLE PRECISION NOT NULL,
    "net_amount" DOUBLE PRECISION NOT NULL,
    "transferred_at" TIMESTAMP(3),

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "data_json" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "professional_sessions" (
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "data_json" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_sessions_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "professional_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forecast_for_week" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "predicted_requests" INTEGER,
    "confidence" DECIMAL(12,6),
    "available_providers" INTEGER,
    "coverage_gap" INTEGER,
    "recommendation" TEXT,
    "gemini_reasoning" TEXT,

    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expansion_opportunities" (
    "id" UUID NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uncovered_requests_30d" INTEGER,
    "estimated_revenue_ars" DECIMAL(20,4),
    "priority" TEXT,
    "status" TEXT DEFAULT 'detected',

    CONSTRAINT "expansion_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_alerts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric_value" DECIMAL(20,6),
    "threshold_value" DECIMAL(20,6),
    "period_key" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "finance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_projections" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projection_for_month" TEXT NOT NULL,
    "scenario_base_ars" DECIMAL(20,4),
    "scenario_optimist_ars" DECIMAL(20,4),
    "scenario_pessimist_ars" DECIMAL(20,4),
    "assumed_job_growth_rate" DECIMAL(12,6),
    "assumed_avg_ticket_ars" DECIMAL(20,4),
    "assumed_commission_rate" DECIMAL(12,6),
    "assumed_mp_fee_rate" DECIMAL(12,6) DEFAULT 0.0299,
    "gemini_analysis" TEXT,
    "confidence" DECIMAL(12,6),
    "key_risks" JSONB NOT NULL DEFAULT '[]',
    "key_opportunities" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "finance_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_snapshots" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_type" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "gross_revenue_ars" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "servy_revenue_ars" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "mp_fees_ars" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "net_revenue_ars" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "cancelled_jobs" INTEGER NOT NULL DEFAULT 0,
    "avg_ticket_ars" DECIMAL(20,4),
    "avg_commission_rate" DECIMAL(12,6),
    "revenue_per_job_ars" DECIMAL(20,4),
    "by_category" JSONB NOT NULL DEFAULT '{}',
    "by_zone" JSONB NOT NULL DEFAULT '{}',
    "active_providers" INTEGER NOT NULL DEFAULT 0,
    "revenue_per_active_provider_ars" DECIMAL(20,4),
    "simulated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "finance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_reconciliation" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_date" DATE NOT NULL,
    "mp_reported_amount_ars" DECIMAL(20,4),
    "internal_expected_ars" DECIMAL(20,4),
    "difference_ars" DECIMAL(20,4),
    "difference_pct" DECIMAL(12,6),
    "mp_transaction_count" INTEGER,
    "internal_transaction_count" INTEGER,
    "status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mp_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_schedules" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "work_days" TEXT[],
    "shift_start" TEXT,
    "shift_end" TEXT,
    "shift2_start" TEXT,
    "shift2_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "provider_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "service_category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "next_service_date" TIMESTAMP(3) NOT NULL,
    "last_payment_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "payment_method_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_phone_key" ON "professionals"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_email_key" ON "professionals"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professional_documents_storage_key_key" ON "professional_documents"("storage_key");

-- CreateIndex
CREATE INDEX "professional_documents_professional_id_idx" ON "professional_documents"("professional_id");

-- CreateIndex
CREATE INDEX "professional_documents_professional_id_kind_idx" ON "professional_documents"("professional_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_visit_payment_id_key" ON "service_requests"("visit_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_repair_payment_id_key" ON "service_requests"("repair_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_job_offer_id_key" ON "quotations"("job_offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_quotation_id_key" ON "payments"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_quotation_id_key" ON "jobs"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_qr_token_key" ON "jobs"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_tokens_token_key" ON "password_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "finance_snapshots_period_type_period_key_key" ON "finance_snapshots"("period_type", "period_key");

-- CreateIndex
CREATE INDEX "provider_schedules_provider_id_idx" ON "provider_schedules"("provider_id");

-- CreateIndex
CREATE INDEX "Subscription_user_id_idx" ON "Subscription"("user_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_next_service_date_idx" ON "Subscription"("next_service_date");

-- AddForeignKey
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_phone_fkey" FOREIGN KEY ("user_phone") REFERENCES "users"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_job_offer_id_fkey" FOREIGN KEY ("job_offer_id") REFERENCES "job_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
