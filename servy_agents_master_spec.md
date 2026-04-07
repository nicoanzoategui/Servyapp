# Servy — Master Agents Spec v1.0
> Los 7 agentes operativos del core de Servy.
> El agente de contenido tiene su propio spec separado.
> Este documento es el input completo para el agente de desarrollo.
> Leerlo entero antes de escribir una sola línea de código.

---

## CONTEXTO DEL PROYECTO

Monorepo Turborepo con 4 apps: `admin`, `api`, `landing`, `pro-portal`.
Stack: Node.js / TypeScript, Postgres, Redis, Twilio, Mercado Pago, R2.
El bot de WhatsApp ya existe en `apps/api`. Los agentes se integran como módulos,
no reemplazan nada existente.

**Todos los agentes viven en:** `apps/api/src/agents/`
**Todos reportan a:** `apps/admin` (dashboard unificado)
**Todos usan:** Gemini 2.0 Flash (Google AI SDK) — free tier

---

## VARIABLES DE ENTORNO ADICIONALES REQUERIDAS

```
GOOGLE_AI_API_KEY=
MERCADOLIBRE_API_URL=https://api.mercadolibre.com
APIFY_API_TOKEN=
META_AD_ACCOUNT_ID=       # act_XXXXXXXXXX — requiere cuenta de anunciante activa
META_SYSTEM_USER_TOKEN=   # permisos ads_management + ads_read — requiere cuenta activa
```

> ⚠️ META_AD_ACCOUNT_ID y META_SYSTEM_USER_TOKEN son opcionales hasta tener
> cuenta de anunciante activa en Meta Business Manager. Los agentes de pricing,
> disponibilidad, calidad, retención, fraude y forecast funcionan sin ellos.
> Los agentes de campañas (recruitment + content ads) quedan en modo draft
> hasta que estas variables estén presentes.

---

## SCHEMA UNIFICADO — NUEVAS TABLAS

Todas las migraciones van en `apps/api/src/db/migrations/`.

```sql
-- ============================================================
-- AGENTE 1: PRICING
-- ============================================================

create table material_prices (
  id uuid primary key default gen_random_uuid(),
  scraped_at timestamptz default now(),
  category text not null,
  item_name text not null,
  item_url text,
  source text not null default 'mercadolibre',
  price_ars numeric not null,
  unit text,
  is_active boolean default true
);

create table pricing_config (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz default now(),
  labor_base jsonb not null,
  zone_multipliers jsonb not null,
  time_multipliers jsonb not null,
  demand_thresholds jsonb not null,
  servy_commission numeric not null default 0.12,
  is_active boolean default true
);

create table price_quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid,
  category text not null,
  job_type text not null,
  zone text not null,
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

create table provider_schedules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  work_days integer[] not null,
  shift_start time not null,
  shift_end time not null,
  shift2_start time,
  shift2_end time,
  timezone text default 'America/Argentina/Buenos_Aires',
  is_active boolean default true
);

create table provider_sessions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  date date not null,
  checkin_asked_at timestamptz,
  checkin_response text
    check (checkin_response in ('available','unavailable','later','no_response')),
  session_start timestamptz,
  session_end timestamptz,
  duration_minutes integer,
  had_location boolean default false,
  jobs_completed integer default 0,
  checkout_trigger text
    check (checkout_trigger in ('provider_message','auto_timeout','admin'))
);

-- ============================================================
-- AGENTE 3: CALIDAD POST-TRABAJO
-- ============================================================

create table quality_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid not null,
  provider_id uuid not null,
  user_phone text not null,
  asked_at timestamptz,
  responded_at timestamptz,
  raw_response text,
  stars integer check (stars between 1 and 5),
  sentiment text check (sentiment in ('positive','neutral','negative')),
  is_complaint boolean default false,
  complaint_category text,
  complaint_summary text,
  escalated boolean default false,
  escalated_at timestamptz,
  resolved boolean default false,
  resolved_at timestamptz,
  resolution_notes text,
  gemini_analysis jsonb
);

create table provider_ratings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique,
  updated_at timestamptz default now(),
  total_reviews integer default 0,
  average_stars numeric default 0,
  nps_score numeric,
  complaint_rate numeric default 0,
  last_review_at timestamptz
);

-- ============================================================
-- AGENTE 4: RETENCIÓN DE PROVEEDORES
-- ============================================================

create table provider_health (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique,
  updated_at timestamptz default now(),
  last_active_at timestamptz,
  last_job_at timestamptz,
  days_inactive integer default 0,
  rating_30d numeric,
  rating_delta numeric default 0,
  jobs_30d integer default 0,
  risk_level text default 'healthy'
    check (risk_level in ('healthy','watch','at_risk','churned')),
  risk_reasons jsonb default '[]',
  last_retention_message_at timestamptz,
  retention_message_count integer default 0
);

create table retention_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  provider_id uuid not null,
  risk_level text not null,
  message_sent text not null,
  channel text default 'whatsapp',
  responded boolean default false,
  responded_at timestamptz,
  reactivated boolean default false
);

-- ============================================================
-- AGENTE 5: ANTI-FRAUDE
-- ============================================================

create table fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  entity_type text not null check (entity_type in ('provider','user','job')),
  entity_id uuid not null,
  alert_type text not null,
  -- 'price_always_max', 'impossible_time', 'repeat_user',
  -- 'fake_completion', 'rating_manipulation', 'payment_anomaly'
  severity text not null check (severity in ('low','medium','high')),
  description text not null,
  evidence jsonb not null,
  status text default 'pending'
    check (status in ('pending','reviewed','dismissed','actioned')),
  reviewed_by text,
  reviewed_at timestamptz,
  action_taken text
);

create table fraud_patterns (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz default now(),
  pattern_name text not null unique,
  description text,
  threshold jsonb not null,
  is_active boolean default true
);

-- ============================================================
-- AGENTE 6: FORECAST + EXPANSIÓN
-- ============================================================

create table demand_forecasts (
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
  -- 'sufficient', 'recruit_providers', 'launch_campaign'
  gemini_reasoning text
);

create table expansion_opportunities (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz default now(),
  zone text not null,
  category text not null,
  uncovered_requests_30d integer,
  estimated_revenue_ars numeric,
  priority text check (priority in ('low','medium','high')),
  status text default 'detected'
    check (status in ('detected','campaigning','covered','dismissed')),
  campaign_launched_at timestamptz
);

-- ============================================================
-- LOGS UNIFICADOS DE TODOS LOS AGENTES
-- ============================================================

create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  agent text not null,
  -- 'pricing','availability','quality','retention','fraud','forecast'
  event text not null,
  level text default 'info' check (level in ('info','warn','error')),
  entity_type text,
  entity_id uuid,
  details jsonb,
  duration_ms integer,
  tokens_used integer
);
```

---

## SEED DATA — insertar al correr las migraciones

```sql
-- Configuración inicial de pricing
insert into pricing_config (labor_base, zone_multipliers, time_multipliers, demand_thresholds)
values (
  '{
    "plomeria_simple": 8000,
    "plomeria_media": 15000,
    "plomeria_compleja": 25000,
    "electricidad_simple": 7000,
    "electricidad_media": 14000,
    "cerrajeria_simple": 6000,
    "cerrajeria_media": 12000,
    "gas_simple": 10000,
    "gas_media": 18000,
    "aires_simple": 12000,
    "aires_media": 20000
  }',
  '{
    "caba_premium": 1.35,
    "caba_resto": 1.20,
    "gba_norte": 1.25,
    "gba_oeste_sur": 1.00,
    "gba_lejano": 0.95
  }',
  '{
    "weekday_day": 1.00,
    "weekday_evening": 1.20,
    "saturday_morning": 1.15,
    "saturday_afternoon": 1.30,
    "sunday": 1.40,
    "night": 1.60,
    "holiday": 1.50
  }',
  '{
    "low": {"max": 2, "multiplier": 1.00},
    "medium": {"max": 5, "multiplier": 1.10},
    "high": {"max": 10, "multiplier": 1.20},
    "peak": {"max": 999, "multiplier": 1.35}
  }'
);

-- Patrones de fraude iniciales
insert into fraud_patterns (pattern_name, description, threshold) values
('price_always_max',
 'Proveedor siempre cobra el máximo del rango',
 '{"consecutive_max": 5, "window_days": 30}'),
('impossible_time',
 'Trabajo completado en tiempo imposible según distancia',
 '{"min_minutes_per_km": 2}'),
('repeat_user_same_service',
 'Usuario pide el mismo servicio 3+ veces en 7 días',
 '{"max_same_service": 3, "window_days": 7}'),
('rating_drop',
 'Proveedor baja 1.5 puntos de rating en 14 días',
 '{"drop": 1.5, "window_days": 14}'),
('payment_anomaly',
 'Trabajo pagado pero sin registro de completado en bot',
 '{"hours_after_payment": 24}');
```

---

## ESTRUCTURA DE ARCHIVOS

```
apps/api/src/
├── agents/
│   ├── pricing-agent.ts         # Agente 1
│   ├── availability-agent.ts    # Agente 2
│   ├── quality-agent.ts         # Agente 3
│   ├── retention-agent.ts       # Agente 4
│   ├── fraud-agent.ts           # Agente 5
│   ├── forecast-agent.ts        # Agente 6
│   └── prompts/
│       ├── quality.ts           # system prompt análisis de reseñas
│       ├── retention.ts         # system prompt mensajes personalizados
│       ├── fraud.ts             # system prompt análisis de patrones
│       └── forecast.ts          # system prompt predicción de demanda
├── crons/
│   ├── index.ts                 # registra todos los crons
│   ├── scrape-prices.ts         # cada 6hs
│   ├── demand-snapshot.ts       # cada 5 min
│   ├── checkin-scheduler.ts     # cada 1 min
│   ├── metrics-collector.ts     # cada 24hs
│   ├── quality-followup.ts      # cada hora (busca jobs de 48hs)
│   ├── retention-check.ts       # diario 10am
│   ├── fraud-scan.ts            # diario 3am
│   └── forecast-generator.ts   # domingos 8am
└── routes/
    ├── pricing.ts
    ├── availability.ts
    ├── quality.ts
    ├── retention.ts
    ├── fraud.ts
    └── forecast.ts
```

---

## AGENTE 1 — PRICING DINÁMICO

**Archivo:** `apps/api/src/agents/pricing-agent.ts`
**Triggers:** on-demand por pedido + cron scraping cada 6hs

### Función principal: `generateQuote(params)`

```typescript
interface QuoteParams {
  category: string        // 'plomeria' | 'electricidad' | etc.
  jobType: string         // 'plomeria_simple' | 'plomeria_media' | etc.
  zone: string            // zona del usuario
  datetime: Date          // para calcular multiplicador horario
}

interface QuoteResult {
  rangeMin: number
  rangeMax: number
  recommended: number
  demandLevel: string | null
  demandLabel: string | null
  multipliers: { zone: number; time: number; demand: number }
  providerNetMin: number
  providerNetMax: number
  providerNetRecommended: number
  validUntil: Date        // expira en 10 minutos
}
```

### Función de scraping: `scrapeMaterials()`

Usa MercadoLibre API pública (sin auth para búsquedas básicas):
```
GET https://api.mercadolibre.com/sites/MLA/search?q={item}&limit=10
```

Gemini filtra los resultados relevantes y calcula precio promedio ponderado.
Si el precio subió más de 15% vs la lectura anterior → crear `agent_log` con level `warn`
y notificar al admin via el dashboard.

### Redis keys del pricing

```
pricing:demand:{category}:{zone}        # conteo de pedidos activos
  TTL: 35 minutos (se renueva con cada pedido)

pricing:materials:{category}            # último promedio de materiales
  TTL: 7 horas (invalidado por el scraper)

pricing:quote:{quote_id}                # cotización activa
  TTL: 10 minutos
```

---

## AGENTE 2 — DISPONIBILIDAD DE PROVEEDORES

**Archivo:** `apps/api/src/agents/availability-agent.ts`
**Triggers:** cron cada 1 minuto + webhook Twilio

### Redis keys de disponibilidad

```
provider:status:{provider_id}
  value: 'active' | 'active_no_location' | 'inactive' | 'busy'
  TTL: fin del turno declarado

provider:location:{provider_id}
  value: JSON { lat, lng, updatedAt }
  TTL: 1 hora (se renueva con cada update de ubicación)

provider:session:{provider_id}
  value: JSON { sessionId, startedAt, jobsCount }
  TTL: fin del turno

checkin:scheduled:{provider_id}:{date}
  value: 'pending' | 'sent' | 'responded'
  TTL: 24 horas
```

### Frases que activan check-out (detección fuzzy)

```typescript
const CHECKOUT_PHRASES = [
  'listo por hoy', 'termino', 'me desconecto',
  'hasta mañana', 'fin del turno', 'paro', 'salgo',
  'ya termine', 'termine por hoy', 'me voy'
]
// Usar distancia de Levenshtein ≤ 2 para variantes con typos
```

### Integración con el webhook de Twilio existente

```typescript
// En el handler de Twilio existente, agregar AL INICIO:
const handled = await availabilityAgent.process({
  provider,
  body: Body,
  messageType: MessageType,
  lat: Latitude,
  lng: Longitude,
})
if (handled) return res.status(200).send()
// Si no fue manejado, continuar con el flujo normal del bot
```

### Mensajes al usuario según disponibilidad del proveedor

```
Con ubicación:
"Carlos, plomero ⭐4.9 — está a ~2.3km, llega en ~15 minutos"

Sin ubicación:
"Carlos, plomero ⭐4.9 — disponible en tu zona, llega en ~30-45 minutos"
```

---

## AGENTE 3 — CALIDAD POST-TRABAJO

**Archivo:** `apps/api/src/agents/quality-agent.ts`
**Trigger:** 48hs después de cada trabajo marcado como completado

### Flujo WhatsApp al usuario

```
Bot → Usuario (48hs post-trabajo):
"Hola [nombre] 👋
¿Cómo te fue con [Nombre Proveedor]?

Contanos brevemente o respondé con una estrella:
⭐ Malo
⭐⭐ Regular
⭐⭐⭐ Bien
⭐⭐⭐⭐ Muy bien
⭐⭐⭐⭐⭐ Excelente"
```

Si responde con texto libre → Gemini analiza:

```typescript
// System prompt en apps/api/src/agents/prompts/quality.ts
`Analizá esta reseña de un servicio del hogar en Argentina.
Devolvé JSON con:
{
  stars: number (1-5, inferido del tono),
  sentiment: 'positive' | 'neutral' | 'negative',
  isComplaint: boolean,
  complaintCategory: string | null,
  // 'quality', 'price', 'punctuality', 'behavior', 'incomplete_work'
  complaintSummary: string | null (máx 100 chars, en español)
}
Solo JSON, sin texto adicional.`
```

Si `isComplaint === true`:
- Escalar automáticamente: crear registro en `fraud_alerts` si hay patrón
- Notificar en dashboard admin con prioridad alta
- Bajar rating del proveedor en `provider_ratings`
- Bot responde al usuario:

```
Bot:
"Gracias por contarnos, lo tomamos muy en serio 🙏
Un integrante del equipo de Servy va a revisar
tu caso en las próximas 24hs."
```

---

## AGENTE 4 — RETENCIÓN DE PROVEEDORES

**Archivo:** `apps/api/src/agents/retention-agent.ts`
**Trigger:** cron diario 10am

### Niveles de riesgo y umbrales

```typescript
const RISK_LEVELS = {
  healthy: {
    // Todo OK — no hacer nada
  },
  watch: {
    daysInactive: 5,        // sin conectarse en 5 días
    ratingDelta: -0.5,      // bajó 0.5 puntos en 30 días
    jobs30d: 3,             // menos de 3 trabajos en el mes
  },
  at_risk: {
    daysInactive: 10,
    ratingDelta: -1.0,
    jobs30d: 1,
  },
  churned: {
    daysInactive: 21,
  }
}
```

### Generación de mensaje personalizado con Gemini

```typescript
// System prompt en apps/api/src/agents/prompts/retention.ts
`Sos el equipo de Servy escribiéndole a un proveedor.
Tono: cercano, de igual a igual, sin sonar corporativo.
Máximo 3 líneas. Voseo argentino.
No menciones "retención" ni "plataforma".

Datos del proveedor:
- Nombre: {name}
- Rubro: {category}
- Días inactivo: {daysInactive}
- Último trabajo: {lastJobDate}
- Rating actual: {rating}
- Motivo de riesgo: {riskReasons}

Escribí un mensaje de WhatsApp natural y específico.
Ejemplos de tono:
- "Carlos, hace 10 días que no te vemos. ¿Todo bien?"
- "Martín, tus últimas reseñas bajaron un poco. ¿Pasó algo?"
Solo el mensaje, sin comillas.`
```

### Reglas para no spamear

- Máximo 1 mensaje de retención cada 7 días por proveedor
- Si no respondió al mensaje anterior → escalar a `agent_logs` para revisión humana
- Si el proveedor está `churned` → no mandar más mensajes automáticos, alertar en admin

---

## AGENTE 5 — ANTI-FRAUDE

**Archivo:** `apps/api/src/agents/fraud-agent.ts`
**Trigger:** cron diario 3am + tiempo real en transacciones críticas

### Patrones que detecta

**1. price_always_max**
Proveedor que cobró el máximo del rango en 5 o más trabajos consecutivos.
```typescript
// Query: últimos N trabajos del proveedor donde price_chosen === range_max
// Si count >= 5 → alerta medium
```

**2. impossible_time**
Trabajo marcado como completado antes de que fuera físicamente posible llegar.
```typescript
// Si tiempo_aceptacion + (distancia_km * 2 min/km) > tiempo_completado
// → alerta high
```

**3. repeat_user_same_service**
Usuario que pidió el mismo servicio 3+ veces en 7 días.
```typescript
// Puede ser legítimo (obra) o testing/abuso
// → alerta low, para revisión humana
```

**4. rating_manipulation**
Proveedor que sube de golpe 0.8 puntos en menos de 5 reseñas.
```typescript
// Spike inusual de reseñas 5 estrellas en ventana corta
// → alerta medium
```

**5. payment_anomaly**
Pago procesado por Mercado Pago pero sin registro de trabajo completado en el bot.
```typescript
// Join entre tabla de pagos de MP y tabla de jobs
// Si pago existe pero job no está completado luego de 24hs → alerta high
```

### Política: el agente nunca bloquea solo

Siempre crea una alerta en `fraud_alerts` con status `pending`.
El admin la revisa en el dashboard y decide la acción.
Excepto `payment_anomaly` con severity `high` → pausa el pago automáticamente
y notifica al admin de inmediato.

---

## AGENTE 6 — FORECAST + EXPANSIÓN

**Archivo:** `apps/api/src/agents/forecast-agent.ts`
**Trigger:** cron domingos 8am

### Qué analiza

1. Pedidos de los últimos 60 días por categoría, zona y día de semana
2. Proveedores activos por categoría y zona
3. Feriados y eventos de la semana siguiente
4. Historial de demanda en esas mismas fechas el año anterior

### Output que genera

Para cada combinación categoría + zona:

```typescript
interface ForecastResult {
  predictedRequests: number       // pedidos estimados para la semana
  confidence: number              // 0-1
  availableProviders: number      // proveedores activos en esa zona/cat
  coverageGap: number             // pedidos que no podrían cubrirse
  recommendation: 'sufficient' | 'recruit_providers' | 'launch_campaign'
  reasoning: string               // Gemini explica por qué
}
```

### Detección de zonas sin cobertura

Si una zona recibe pedidos pero tiene 0 proveedores activos en esa categoría:
- Crear registro en `expansion_opportunities`
- Si `uncovered_requests_30d >= 10` → priority `high`
- Notificar en dashboard: "Zona X necesita proveedores de [categoría]"
- Opcionalmente conectar con el agente de contenido para lanzar
  campaña de captación de proveedores en esa zona

### System prompt de forecast

```typescript
// En apps/api/src/agents/prompts/forecast.ts
`Sos un analista de operaciones de Servy, marketplace de servicios del hogar en Argentina.
Analizá los datos de demanda y devolvé predicciones en JSON.
Considerá: estacionalidad argentina, feriados, inflación como factor de demanda
(cuando la gente tiene menos plata, repara en vez de reemplazar).

Datos: {historicalData}
Feriados próximos: {holidays}

Devolvé array de ForecastResult. Solo JSON, sin texto adicional.`
```

---

## CRONS — REGISTRO CENTRALIZADO

**Archivo:** `apps/api/src/crons/index.ts`

```typescript
import cron from 'node-cron'
import { scrapePrices } from './scrape-prices'
import { takeDemandSnapshot } from './demand-snapshot'
import { runCheckinScheduler } from './checkin-scheduler'
import { collectMetrics } from './metrics-collector'
import { runQualityFollowup } from './quality-followup'
import { runRetentionCheck } from './retention-check'
import { runFraudScan } from './fraud-scan'
import { runForecast } from './forecast-generator'

export function startCrons() {
  cron.schedule('0 */6 * * *',    scrapePrices)         // cada 6hs
  cron.schedule('*/5 * * * *',    takeDemandSnapshot)    // cada 5 min
  cron.schedule('* * * * *',      runCheckinScheduler)   // cada 1 min
  cron.schedule('0 10 * * *',     collectMetrics)        // diario 10am
  cron.schedule('0 * * * *',      runQualityFollowup)    // cada hora
  cron.schedule('0 10 * * *',     runRetentionCheck)     // diario 10am
  cron.schedule('0 3 * * *',      runFraudScan)          // diario 3am
  cron.schedule('0 8 * * 0',      runForecast)           // domingos 8am
}

// Llamar startCrons() al iniciar la API
```

---

## API ROUTES

```
# Pricing
GET  /api/pricing/quote          # genera cotización
GET  /api/pricing/demand         # demanda actual
POST /api/pricing/accept         # proveedor acepta con precio
GET  /api/pricing/materials      # últimos precios scrapeados

# Disponibilidad
GET  /api/availability/active    # proveedores activos ahora
GET  /api/availability/nearby    # proveedores cercanos a lat/lng
POST /api/availability/checkin   # forzar check-in manual (admin)
POST /api/availability/checkout  # forzar check-out (admin)

# Calidad
GET  /api/quality/reviews        # listado de reseñas
GET  /api/quality/complaints     # reclamos pendientes
POST /api/quality/resolve/:id    # marcar reclamo como resuelto
GET  /api/quality/provider/:id   # rating detallado de un proveedor

# Retención
GET  /api/retention/at-risk      # proveedores en riesgo
GET  /api/retention/messages     # historial de mensajes enviados
POST /api/retention/message/:id  # enviar mensaje manual a proveedor

# Anti-fraude
GET  /api/fraud/alerts           # alertas pendientes
POST /api/fraud/review/:id       # revisar alerta (dismiss/action)
GET  /api/fraud/patterns         # patrones activos

# Forecast
GET  /api/forecast/weekly        # forecast de la semana actual
GET  /api/forecast/expansion     # oportunidades de expansión
POST /api/forecast/dismiss/:id   # descartar oportunidad
```

---

## DASHBOARD ADMIN — apps/admin

Agregar 6 nuevas secciones al admin existente.
Cada sección lee de su endpoint correspondiente.

```
/admin/pricing
  - Gráfico de precios de materiales por categoría (últimos 30 días)
  - Tabla de cotizaciones recientes
  - Alert si algún material subió > 15%

/admin/operations
  - Mapa en tiempo real de proveedores activos (lat/lng de Redis)
  - Contadores: activos / inactivos / ocupados por categoría
  - Tabla de sesiones del día

/admin/quality
  - NPS general y por proveedor
  - Lista de reclamos pendientes con botón "Resolver"
  - Gráfico de sentiment últimos 30 días

/admin/providers
  - Lista de proveedores por nivel de riesgo (healthy/watch/at_risk/churned)
  - Historial de mensajes de retención
  - Botón "Enviar mensaje ahora" por proveedor

/admin/fraud
  - Lista de alertas pendientes (ordenadas por severity)
  - Para cada alerta: evidencia + botones "Dismiss" / "Tomar acción"
  - Historial de alertas resueltas

/admin/forecast
  - Tabla: categoría × zona × demanda estimada × proveedores disponibles × gap
  - Lista de oportunidades de expansión con prioridad
  - Botón "Lanzar campaña de captación" (conecta con agente de contenido)
```

---

---

## AGENTE 7 — RECLUTAMIENTO DE PROVEEDORES



**Archivo:** `apps/api/src/agents/recruitment-agent.ts`
**Trigger:** cron lunes 6am + manual desde admin

### Fuentes de candidatos

**Fuente 1 — Grupos de Facebook via Apify**
Usa el actor `apify/facebook-groups-scraper`.
Scrapea publicaciones públicas de grupos de oficios por zona.
Busca: personas que ofrecen servicios, responden pedidos, publican fotos de trabajos.

Grupos objetivo iniciales (configurables en DB):
```
"Plomeros Buenos Aires", "Electricistas AMBA", "Gasistas matriculados Argentina",
"Cerrajeros Buenos Aires", "Técnicos aires acondicionados GBA",
"Oficios del hogar Argentina" — y variantes por zona
```

**Fuente 2 — Contactos manuales desde el admin**
El founder carga nombre + teléfono + rubro + zona.
Si tiene link de FB → Gemini lo califica igual que los scrapeados.
Si no → status directo `contacted`, se le manda mensaje por WhatsApp.

### Schema adicional

```sql
create table recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  source text not null check (source in ('facebook_scrape','manual','referral')),
  source_url text,
  source_group text,
  name text,
  phone text,
  facebook_id text,
  zone text,
  category text,
  raw_post text,
  score integer check (score between 1 and 10),
  score_reasons jsonb,
  gemini_analysis jsonb,
  status text not null default 'detected'
    check (status in (
      'detected','qualified','disqualified','in_campaign',
      'contacted','registered','active','rejected'
    )),
  campaign_id uuid,
  registered_at timestamptz,
  first_job_at timestamptz,
  notes text
);

create table facebook_groups (
  id uuid primary key default gen_random_uuid(),
  group_url text not null unique,
  group_name text not null,
  category text not null,
  zone text not null,
  is_active boolean default true,
  last_scraped_at timestamptz,
  candidates_found integer default 0
);

create table recruitment_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  category text not null,
  zone text not null,
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
  status text default 'draft'
    check (status in ('draft','pending_approval','active','paused','completed')),
  spend_total_ars numeric default 0,
  reach integer default 0,
  link_clicks integer default 0,
  registrations integer default 0,
  cost_per_registration_ars numeric,
  active_providers_from_campaign integer default 0
);

create table meta_custom_audiences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  category text not null,
  zone text not null,
  meta_audience_id text,
  candidate_count integer,
  last_updated_at timestamptz
);
```

### Flujo del agente

```
1. Apify scrapea grupos de Facebook configurados
2. Gemini califica cada candidato — score 1-10
3. Filtra score ≥ 7 → status 'qualified'
4. Sube Facebook IDs como Custom Audience en Meta Ads
5. Gemini genera copy del anuncio por categoría + zona
6. Crea sugerencia de campaña en DB → notifica al founder
7. Founder aprueba con 1 click desde el admin
8. Agente lanza campaña en Meta Ads API
9. Candidato ve el anuncio → click → servy.lat/profesionales?utm_source=recruitment&utm_zone={zone}&utm_category={category}
10. Se registra → agente actualiza status a 'registered'
11. Cuando completa primer trabajo → status 'active'
```

### System prompts

**Calificación de candidato:**
```
Analizá este perfil/publicación de Facebook y calificá al candidato
como potencial proveedor independiente de servicios del hogar en Argentina.

Criterios:
+3 si menciona explícitamente su oficio
+2 si publica fotos de trabajos realizados
+2 si menciona zona geográfica específica
+2 si tiene reseñas o recomendaciones
+1 si parece activo (publicación reciente)

Descalificar si: empresa grande, perfil falso, ya saturado de clientes.

Devolvé JSON:
{
  score: number (1-10),
  category: string,
  zone: string | null,
  isIndependent: boolean,
  reasons: string[],
  disqualified: boolean,
  disqualifyReason: string | null
}
Solo JSON.
```

**Generación de anuncio:**
```
Generá un anuncio de Facebook/Instagram para reclutar proveedores de Servy.
Tono: de igual a igual, directo, sin corporativo.
NO decir "unite a nuestra familia" ni "oportunidad única".
SÍ hablar de ingresos concretos y autonomía.

Categoría: {category} · Zona: {zone}
Ingreso promedio activos en esa categoría: ${averageIncome}/mes

Devolvé JSON:
{
  headline: string (máx 40 chars),
  body: string (máx 125 chars),
  cta: "Registrarme" | "Saber más" | "Empezar ahora"
}
Solo JSON.
```

### Conexión con el agente de forecast

Cuando `expansion_opportunities` tiene una entrada con priority `high`:
→ El agente de reclutamiento crea automáticamente un `recruitment_campaigns` en status `draft`
→ Genera el copy del anuncio
→ Notifica al founder: "La zona X necesita {categoría} — ¿lanzamos campaña?"

### Nuevas API Routes

```
GET  /api/recruitment/candidates
POST /api/recruitment/candidates          # agregar manual
PATCH /api/recruitment/candidates/:id
GET  /api/recruitment/campaigns
POST /api/recruitment/campaigns/suggest
POST /api/recruitment/campaigns/:id/approve
POST /api/recruitment/campaigns/:id/pause
POST /api/recruitment/scrape              # disparar scraping manual
GET  /api/recruitment/groups
POST /api/recruitment/groups
```

### Cron

```typescript
cron.schedule('0 6 * * 1', runRecruitmentCycle) // lunes 6am
```

### Dashboard admin — /admin/recruitment

- Métricas: candidatos detectados / en campaña / registrados / activos / costo por proveedor activo
- Tabla de candidatos con filtros por status, categoría, zona y score
- Panel de campañas activas con spend y registrations
- Mapa de cobertura: zonas verdes (suficiente) / amarillas (pocas) / rojas (sin cobertura)
- Click en zona roja → sugerir campaña de reclutamiento

---

## ORDEN DE IMPLEMENTACIÓN

### Fase 1 — Base (día 1-2)
1. Todas las migrations de base de datos
2. Seed data de pricing_config y fraud_patterns
3. Registro de crons (`crons/index.ts`) — sin lógica, solo estructura
4. Tipos TypeScript compartidos para los 6 agentes

### Fase 2 — Pricing + Disponibilidad (día 3-5)
5. `pricing-agent.ts` — scraping MercadoLibre + cálculo de quote
6. `availability-agent.ts` — check-in/out + Redis keys
7. Hook en webhook de Twilio
8. Routes de pricing y availability
9. Flujos de WhatsApp para check-in y cotización

### Fase 3 — Calidad + Retención (día 6-8)
10. `quality-agent.ts` — análisis con Gemini + escalado
11. `retention-agent.ts` — scoring de riesgo + mensaje personalizado
12. Crons de quality-followup y retention-check
13. Routes de quality y retention

### Fase 4 — Fraude + Forecast (día 9-11)
14. `fraud-agent.ts` — detección de los 5 patrones
15. `forecast-agent.ts` — análisis con Gemini + expansión
16. Crons de fraud-scan y forecast-generator
17. Routes de fraud y forecast

### Fase 5 — Reclutamiento (día 12-13)
18. `recruitment-agent.ts` — calificación con Gemini + generación de anuncios
19. Integración con Apify (`apify/facebook-groups-scraper`)
20. Routes de recruitment
21. Conexión forecast → recruitment (expansion_opportunities trigger)

### Fase 6 — Experimentos (día 14-15)
22. Schema: tablas `experiments` y `experiment_waitlist`
23. Seed data del calendario estacional
24. `experiments-agent.ts` — diseño + evaluación con Gemini
25. Flujo de WhatsApp para lista de espera (hook en webhook Twilio)
26. Routes de experiments
27. Crons: evaluación diaria + sugerencia mensual
28. Conexiones: experiments → recruitment, experiments → content-agent, experiments → pricing

### Fase 7 — Dashboard admin (día 16-18)
29. Las 8 secciones del admin (7 agentes + experiments)
30. Mapa de operaciones en tiempo real
31. Mapa de cobertura de reclutamiento (verde/amarillo/rojo)
32. Panel de experimentos con barra de progreso
33. Testing de todos los flujos end-to-end

---

## CONSIDERACIONES PARA EL AGENTE DE DESARROLLO

- **No tocar el flujo del bot existente.** Solo agregar el hook en el webhook de Twilio
  como se describe en el Agente 2. Un `if (handled) return` — nada más.

- **Gemini solo cuando es necesario.** Pricing, disponibilidad y fraud scan básico
  no necesitan Gemini — son lógica determinista. Gemini se usa solo para:
  quality (análisis de texto libre), retention (generar mensaje personalizado)
  y forecast (análisis de patrones complejos).

- **Redis es el estado en tiempo real. Postgres es el historial.**
  Nunca consultar Postgres para saber si un proveedor está activo ahora mismo.
  Siempre Redis. Postgres solo para reportes y dashboard.

- **Los agentes no se llaman entre sí directamente.**
  Se comunican a través de la base de datos y Redis.
  Excepción: forecast puede encolar una tarea para el agente de contenido
  via un registro en una tabla `agent_tasks`.

- **Todos los errores van a `agent_logs`** con level `error` y detalles del stack.
  El dashboard admin muestra los errores recientes.

- **Logging de tokens de Gemini.** Guardar `tokens_used` en cada `agent_log`
  para monitorear el consumo y anticipar si se va a superar el free tier.
