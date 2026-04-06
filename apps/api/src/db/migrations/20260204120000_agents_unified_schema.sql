-- Servy agents — unified schema (Fase 1)
-- Apply manually: psql "$DATABASE_URL" -f apps/api/src/db/migrations/20260204120000_agents_unified_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid).

-- ============================================================
-- AGENTE 1: PRICING
-- ============================================================

CREATE TABLE IF NOT EXISTS material_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scraped_at timestamptz DEFAULT now(),
    category text NOT NULL,
    item_name text NOT NULL,
    item_url text,
    source text NOT NULL DEFAULT 'mercadolibre',
    price_ars numeric NOT NULL,
    unit text,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS pricing_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    updated_at timestamptz DEFAULT now(),
    labor_base jsonb NOT NULL,
    zone_multipliers jsonb NOT NULL,
    time_multipliers jsonb NOT NULL,
    demand_thresholds jsonb NOT NULL,
    servy_commission numeric NOT NULL DEFAULT 0.12,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS price_quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    job_id uuid,
    category text NOT NULL,
    job_type text NOT NULL,
    zone text NOT NULL,
    zone_multiplier numeric,
    time_multiplier numeric,
    demand_multiplier numeric,
    demand_level text,
    material_cost numeric,
    labor_base numeric,
    price_calculated numeric,
    range_min numeric,
    range_max numeric,
    range_recommended numeric,
    price_chosen numeric,
    provider_id uuid,
    servy_commission numeric,
    provider_net numeric,
    accepted_at timestamptz,
    expired_at timestamptz
);

-- ============================================================
-- AGENTE 2: DISPONIBILIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    work_days integer[] NOT NULL,
    shift_start time NOT NULL,
    shift_end time NOT NULL,
    shift2_start time,
    shift2_end time,
    timezone text DEFAULT 'America/Argentina/Buenos_Aires',
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS provider_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL,
    date date NOT NULL,
    checkin_asked_at timestamptz,
    checkin_response text CHECK (
        checkin_response IS NULL
        OR checkin_response IN ('available', 'unavailable', 'later', 'no_response')
    ),
    session_start timestamptz,
    session_end timestamptz,
    duration_minutes integer,
    had_location boolean DEFAULT false,
    jobs_completed integer DEFAULT 0,
    checkout_trigger text CHECK (
        checkout_trigger IS NULL
        OR checkout_trigger IN ('provider_message', 'auto_timeout', 'admin')
    )
);

-- ============================================================
-- AGENTE 3: CALIDAD POST-TRABAJO
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    job_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    user_phone text NOT NULL,
    asked_at timestamptz,
    responded_at timestamptz,
    raw_response text,
    stars integer CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5)),
    sentiment text CHECK (
        sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')
    ),
    is_complaint boolean DEFAULT false,
    complaint_category text,
    complaint_summary text,
    escalated boolean DEFAULT false,
    escalated_at timestamptz,
    resolved boolean DEFAULT false,
    resolved_at timestamptz,
    resolution_notes text,
    gemini_analysis jsonb
);

CREATE TABLE IF NOT EXISTS provider_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL UNIQUE,
    updated_at timestamptz DEFAULT now(),
    total_reviews integer DEFAULT 0,
    average_stars numeric DEFAULT 0,
    nps_score numeric,
    complaint_rate numeric DEFAULT 0,
    last_review_at timestamptz
);

-- ============================================================
-- AGENTE 4: RETENCIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_health (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL UNIQUE,
    updated_at timestamptz DEFAULT now(),
    last_active_at timestamptz,
    last_job_at timestamptz,
    days_inactive integer DEFAULT 0,
    rating_30d numeric,
    rating_delta numeric DEFAULT 0,
    jobs_30d integer DEFAULT 0,
    risk_level text DEFAULT 'healthy' CHECK (
        risk_level IN ('healthy', 'watch', 'at_risk', 'churned')
    ),
    risk_reasons jsonb DEFAULT '[]',
    last_retention_message_at timestamptz,
    retention_message_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS retention_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    provider_id uuid NOT NULL,
    risk_level text NOT NULL,
    message_sent text NOT NULL,
    channel text DEFAULT 'whatsapp',
    responded boolean DEFAULT false,
    responded_at timestamptz,
    reactivated boolean DEFAULT false
);

-- ============================================================
-- AGENTE 5: ANTI-FRAUDE
-- ============================================================

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    entity_type text NOT NULL CHECK (entity_type IN ('provider', 'user', 'job')),
    entity_id uuid NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    description text NOT NULL,
    evidence jsonb NOT NULL,
    status text DEFAULT 'pending' CHECK (
        status IN ('pending', 'reviewed', 'dismissed', 'actioned')
    ),
    reviewed_by text,
    reviewed_at timestamptz,
    action_taken text
);

CREATE TABLE IF NOT EXISTS fraud_patterns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    updated_at timestamptz DEFAULT now(),
    pattern_name text NOT NULL UNIQUE,
    description text,
    threshold jsonb NOT NULL,
    is_active boolean DEFAULT true
);

-- ============================================================
-- AGENTE 6: FORECAST + EXPANSIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    forecast_for_week date NOT NULL,
    category text NOT NULL,
    zone text NOT NULL,
    predicted_requests integer,
    confidence numeric,
    available_providers integer,
    coverage_gap integer,
    recommendation text,
    gemini_reasoning text
);

CREATE TABLE IF NOT EXISTS expansion_opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_at timestamptz DEFAULT now(),
    zone text NOT NULL,
    category text NOT NULL,
    uncovered_requests_30d integer,
    estimated_revenue_ars numeric,
    priority text CHECK (
        priority IS NULL OR priority IN ('low', 'medium', 'high')
    ),
    status text DEFAULT 'detected' CHECK (
        status IN ('detected', 'campaigning', 'covered', 'dismissed')
    ),
    campaign_launched_at timestamptz
);

-- ============================================================
-- LOGS UNIFICADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    agent text NOT NULL,
    event text NOT NULL,
    level text DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
    entity_type text,
    entity_id uuid,
    details jsonb,
    duration_ms integer,
    tokens_used integer
);

-- ============================================================
-- SEED: pricing_config (solo si la tabla está vacía)
-- ============================================================

INSERT INTO pricing_config (labor_base, zone_multipliers, time_multipliers, demand_thresholds)
SELECT
    '{"plomeria_simple":8000,"plomeria_media":15000,"plomeria_compleja":25000,"electricidad_simple":7000,"electricidad_media":14000,"cerrajeria_simple":6000,"cerrajeria_media":12000,"gas_simple":10000,"gas_media":18000,"aires_simple":12000,"aires_media":20000}'::jsonb,
    '{"caba_premium":1.35,"caba_resto":1.20,"gba_norte":1.25,"gba_oeste_sur":1.00,"gba_lejano":0.95}'::jsonb,
    '{"weekday_day":1.00,"weekday_evening":1.20,"saturday_morning":1.15,"saturday_afternoon":1.30,"sunday":1.40,"night":1.60,"holiday":1.50}'::jsonb,
    '{"low":{"max":2,"multiplier":1.00},"medium":{"max":5,"multiplier":1.10},"high":{"max":10,"multiplier":1.20},"peak":{"max":999,"multiplier":1.35}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pricing_config LIMIT 1);

-- ============================================================
-- SEED: fraud_patterns
-- ============================================================

INSERT INTO fraud_patterns (pattern_name, description, threshold)
VALUES
    (
        'price_always_max',
        'Proveedor siempre cobra el máximo del rango',
        '{"consecutive_max": 5, "window_days": 30}'::jsonb
    ),
    (
        'impossible_time',
        'Trabajo completado en tiempo imposible según distancia',
        '{"min_minutes_per_km": 2}'::jsonb
    ),
    (
        'repeat_user_same_service',
        'Usuario pide el mismo servicio 3+ veces en 7 días',
        '{"max_same_service": 3, "window_days": 7}'::jsonb
    ),
    (
        'rating_drop',
        'Proveedor baja 1.5 puntos de rating en 14 días',
        '{"drop": 1.5, "window_days": 14}'::jsonb
    ),
    (
        'payment_anomaly',
        'Trabajo pagado pero sin registro de completado en bot',
        '{"hours_after_payment": 24}'::jsonb
    )
ON CONFLICT (pattern_name) DO NOTHING;
