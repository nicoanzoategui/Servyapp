-- Agente 8 — Finanzas (+ dependencias mínimas para sync y proyecciones)
-- Ejecutar contra Postgres antes de usar Prisma generate / agente.

-- ---------------------------------------------------------------------------
-- agent_logs (master spec) — si no existe
-- ---------------------------------------------------------------------------
create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  agent text not null,
  event text not null,
  level text default 'info' check (level in ('info','warn','error')),
  entity_type text,
  entity_id uuid,
  details jsonb,
  duration_ms integer,
  tokens_used integer
);

-- ---------------------------------------------------------------------------
-- price_quotes mínimo — para generar finance_transactions desde cotizaciones aceptadas
-- ---------------------------------------------------------------------------
create table if not exists public.price_quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid,
  category text not null default 'general',
  job_type text not null default 'standard',
  zone text not null default 'amba',
  price_chosen numeric,
  servy_commission numeric default 0.12,
  provider_net numeric,
  provider_id uuid,
  accepted_at timestamptz
);

create index if not exists price_quotes_accepted_at_idx on public.price_quotes (accepted_at)
  where accepted_at is not null;

-- ---------------------------------------------------------------------------
-- demand_forecasts / expansion_opportunities (mínimo para Agente 6 / proyecciones)
-- ---------------------------------------------------------------------------
create table if not exists public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  forecast_for_week date not null,
  category text not null,
  zone text not null,
  predicted_requests integer,
  confidence numeric,
  available_providers integer,
  coverage_gap integer,
  recommendation text,
  gemini_reasoning text
);

create table if not exists public.expansion_opportunities (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz default now(),
  zone text not null,
  category text not null,
  uncovered_requests_30d integer,
  estimated_revenue_ars numeric,
  priority text,
  status text default 'detected'
);

-- ============================================================
-- AGENTE 8: FINANZAS
-- ============================================================

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid,
  provider_id uuid,
  category text not null,
  zone text not null,
  job_type text not null,
  gross_amount_ars numeric not null,
  servy_commission_rate numeric not null,
  servy_revenue_ars numeric not null,
  provider_net_ars numeric not null,
  mp_fee_ars numeric default 0,
  net_revenue_ars numeric not null,
  payment_status text default 'pending'
    check (payment_status in ('pending','completed','refunded','disputed')),
  mp_payment_id text,
  simulated boolean default true,
  period_month text not null,
  period_week text not null
);

create table if not exists public.finance_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  period_type text not null check (period_type in ('daily','weekly','monthly')),
  period_key text not null,
  gross_revenue_ars numeric default 0,
  servy_revenue_ars numeric default 0,
  mp_fees_ars numeric default 0,
  net_revenue_ars numeric default 0,
  total_jobs integer default 0,
  completed_jobs integer default 0,
  cancelled_jobs integer default 0,
  avg_ticket_ars numeric,
  avg_commission_rate numeric,
  revenue_per_job_ars numeric,
  by_category jsonb default '{}',
  by_zone jsonb default '{}',
  active_providers integer default 0,
  revenue_per_active_provider_ars numeric,
  simulated boolean default true
);

create unique index if not exists finance_snapshots_period_uidx
  on public.finance_snapshots (period_type, period_key);

create table if not exists public.finance_projections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  projection_for_month text not null,
  scenario_base_ars numeric,
  scenario_optimist_ars numeric,
  scenario_pessimist_ars numeric,
  assumed_job_growth_rate numeric,
  assumed_avg_ticket_ars numeric,
  assumed_commission_rate numeric,
  assumed_mp_fee_rate numeric default 0.0299,
  gemini_analysis text,
  confidence numeric,
  key_risks jsonb default '[]',
  key_opportunities jsonb default '[]'
);

create table if not exists public.finance_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  alert_type text not null,
  severity text not null check (severity in ('info','warn','critical')),
  title text not null,
  description text not null,
  metric_value numeric,
  threshold_value numeric,
  period_key text,
  resolved boolean default false,
  resolved_at timestamptz
);

create table if not exists public.mp_reconciliation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  period_date date not null,
  mp_reported_amount_ars numeric,
  internal_expected_ars numeric,
  difference_ars numeric,
  difference_pct numeric,
  mp_transaction_count integer,
  internal_transaction_count integer,
  status text default 'pending'
    check (status in ('pending','matched','discrepancy','investigating')),
  notes text,
  simulated boolean default true
);

-- Plantillas de umbrales (resolved=true); idempotente
insert into public.finance_alerts (alert_type, severity, title, description, threshold_value, resolved)
select 'commission_below_threshold', 'warn',
 'Comisión promedio baja', 'La comisión promedio cayó por debajo del 10%', 0.10, true
where not exists (select 1 from public.finance_alerts where alert_type = 'commission_below_threshold' and resolved = true and title = 'Comisión promedio baja');

insert into public.finance_alerts (alert_type, severity, title, description, threshold_value, resolved)
select 'revenue_drop', 'critical',
 'Caída de ingresos', 'Los ingresos de la semana cayeron más del 20% vs la anterior', 0.20, true
where not exists (select 1 from public.finance_alerts where alert_type = 'revenue_drop' and resolved = true and title = 'Caída de ingresos');

insert into public.finance_alerts (alert_type, severity, title, description, threshold_value, resolved)
select 'high_cancellation_rate', 'warn',
 'Alta tasa de cancelación', 'Más del 15% de los jobs se cancelaron esta semana', 0.15, true
where not exists (select 1 from public.finance_alerts where alert_type = 'high_cancellation_rate' and resolved = true and title = 'Alta tasa de cancelación');

insert into public.finance_alerts (alert_type, severity, title, description, threshold_value, resolved)
select 'mp_fee_spike', 'info',
 'Spike en comisiones MP', 'Las comisiones de Mercado Pago subieron más del 0.5%', 0.005, true
where not exists (select 1 from public.finance_alerts where alert_type = 'mp_fee_spike' and resolved = true and title = 'Spike en comisiones MP');
