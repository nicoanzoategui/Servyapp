-- Align agent tables with Prisma cuid() IDs (text) + recruitment + experiments (Fase 5–6)
-- Apply: psql "$DATABASE_URL" -f apps/api/src/db/migrations/20260205130000_agents_text_ids_recruitment_experiments.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'price_quotes'
          AND column_name = 'job_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE price_quotes ALTER COLUMN job_id TYPE text USING job_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'price_quotes'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE price_quotes ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_schedules'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE provider_schedules ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_sessions'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE provider_sessions ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews'
          AND column_name = 'job_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE quality_reviews ALTER COLUMN job_id TYPE text USING job_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'quality_reviews'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE quality_reviews ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_ratings'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE provider_ratings ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_health'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE provider_health ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'retention_messages'
          AND column_name = 'provider_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE retention_messages ALTER COLUMN provider_id TYPE text USING provider_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'fraud_alerts'
          AND column_name = 'entity_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE fraud_alerts ALTER COLUMN entity_id TYPE text USING entity_id::text;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agent_logs'
          AND column_name = 'entity_id' AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE agent_logs ALTER COLUMN entity_id TYPE text USING entity_id::text;
    END IF;
END $$;

-- Recruitment (Fase 5)
CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    source text NOT NULL CHECK (source IN ('facebook_scrape', 'manual', 'referral')),
    source_url text,
    source_group text,
    name text,
    phone text,
    facebook_id text,
    zone text,
    category text,
    raw_post text,
    score integer CHECK (score IS NULL OR (score >= 1 AND score <= 10)),
    score_reasons jsonb,
    gemini_analysis jsonb,
    status text NOT NULL DEFAULT 'detected' CHECK (
        status IN (
            'detected', 'qualified', 'disqualified', 'in_campaign',
            'contacted', 'registered', 'active', 'rejected'
        )
    ),
    campaign_id uuid,
    registered_at timestamptz,
    first_job_at timestamptz,
    notes text
);

CREATE TABLE IF NOT EXISTS facebook_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_url text NOT NULL UNIQUE,
    group_name text NOT NULL,
    category text NOT NULL,
    zone text NOT NULL,
    is_active boolean DEFAULT true,
    last_scraped_at timestamptz,
    candidates_found integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recruitment_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category text NOT NULL,
    zone text NOT NULL,
    candidate_count integer,
    suggested_budget_daily_ars numeric,
    suggested_duration_days integer,
    approved_budget_daily_ars numeric,
    approved_at timestamptz,
    meta_campaign_id text,
    meta_adset_id text,
    meta_ad_id text,
    ad_headline text,
    ad_body text,
    ad_cta text,
    ad_image_url text,
    status text DEFAULT 'draft' CHECK (
        status IN ('draft', 'pending_approval', 'active', 'paused', 'completed')
    ),
    spend_total_ars numeric DEFAULT 0,
    reach integer DEFAULT 0,
    link_clicks integer DEFAULT 0,
    registrations integer DEFAULT 0,
    cost_per_registration_ars numeric,
    active_providers_from_campaign integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta_custom_audiences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    category text NOT NULL,
    zone text NOT NULL,
    meta_audience_id text,
    candidate_count integer,
    last_updated_at timestamptz
);

-- Experiments (Fase 6)
CREATE TABLE IF NOT EXISTS experiments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    hypothesis text,
    pricing_variant jsonb,
    start_at timestamptz,
    end_at timestamptz,
    results_summary jsonb
);

CREATE TABLE IF NOT EXISTS experiment_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    experiment_id uuid REFERENCES experiments (id) ON DELETE SET NULL,
    phone text NOT NULL,
    name text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'enrolled', 'declined'))
);

CREATE TABLE IF NOT EXISTS seasonal_calendar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_name text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    notes text,
    demand_bias numeric DEFAULT 1.0
);

INSERT INTO seasonal_calendar (season_name, starts_on, ends_on, notes, demand_bias)
SELECT * FROM (VALUES
    ('Verano (AC)', '2025-12-01'::date, '2026-02-28'::date, 'Mayor demanda de aires y electricidad', 1.15::numeric),
    ('Invierno (calefacción/gas)', '2025-06-01'::date, '2025-08-31'::date, 'Pico gas y calefacción', 1.1::numeric),
    ('Primavera (mantenimiento)', '2025-09-01'::date, '2025-11-30'::date, 'Mantenimiento general', 1.05::numeric)
) AS v(season_name, starts_on, ends_on, notes, demand_bias)
WHERE NOT EXISTS (SELECT 1 FROM seasonal_calendar LIMIT 1);
