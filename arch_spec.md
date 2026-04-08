# Servy — Architecture Scale Spec v1.0

> Spec de mejoras arquitectónicas para escalar el producto.
> Implementar en orden de prioridad.
> Leer el master spec antes de implementar.

---

## CONTEXTO

Monorepo Turborepo. Stack: Node.js / TypeScript, Postgres, Redis, Twilio, Mercado Pago.
Los agentes y el bot ya existen. Este spec agrega infraestructura de producción.

---

## FASE 1 — BullMQ (queue de trabajos)

**Prioridad: crítica**

### Por qué

Hoy los crons y las llamadas a Apify/Gemini son síncronas dentro del proceso Node.
Si Railway reinicia, los jobs en curso se pierden sin rastro.
BullMQ persiste los jobs en Redis y reintenta automáticamente si fallan.

### Instalación

```bash
pnpm add bullmq --filter @servy/api
```

### Archivo: `apps/api/src/lib/queue.ts`

```typescript
import { Queue, Worker, Job } from 'bullmq'
import { redis } from '../utils/redis'

// Definición de queues
export const agentQueue = new Queue('agents', { connection: redis })
export const messagingQueue = new Queue('messaging', { connection: redis })
export const scrapingQueue = new Queue('scraping', { connection: redis })
```

### Jobs a mover a queue

| Job actual | Queue | Retry |
|---|---|---|
| `runRecruitmentCycle` (Apify) | `scraping` | 2 reintentos, backoff 5min |
| `geminiGenerateJson` en agentes | `agents` | 3 reintentos, backoff 2min |
| `sendTextMessage` post-pago | `messaging` | 5 reintentos, backoff 30s |
| `runDailyFinanceSnapshot` | `agents` | 1 reintento |
| `runFraudScan` | `agents` | 1 reintento |

### Workers

Crear un worker por queue en `apps/api/src/workers/`:

```
apps/api/src/workers/
├── agent-worker.ts
├── messaging-worker.ts
└── scraping-worker.ts
```

Cada worker se registra en `apps/api/src/index.ts` al arrancar.

### Dashboard de BullMQ (opcional pero recomendado)

```bash
pnpm add @bull-board/express --filter @servy/api
```

Montar en `/admin/queues` — protegido con `requireRole('admin')`.

### Variables de entorno

No necesita variables nuevas — usa el `REDIS_URL` existente.

---

## FASE 2 — Sentry (observabilidad de errores)

**Prioridad: alta**

### Por qué

Hoy los errores van a `agent_logs` en Postgres.
Eso es útil para auditoría pero no te avisa cuando algo falla.
Sentry notifica en tiempo real con stack trace completo.

### Instalación

```bash
pnpm add @sentry/node --filter @servy/api
pnpm add @sentry/nextjs --filter @servy/admin --filter @servy/pro-portal
```

### Archivo: `apps/api/src/lib/sentry.ts`

```typescript
import * as Sentry from '@sentry/node'

export function initSentry() {
  if (!process.env.SENTRY_DSN) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1, // 10% de requests en prod
    integrations: [
      Sentry.prismaIntegration(),
    ],
  })
}
```

### Integración en `apps/api/src/index.ts`

```typescript
import { initSentry } from './lib/sentry'
initSentry() // llamar ANTES de todo lo demás
```

### Capturar errores en agentes

En cada agente, reemplazar:
```typescript
// ANTES
console.error('[agente] error:', err)

// DESPUÉS
import * as Sentry from '@sentry/node'
Sentry.captureException(err, { tags: { agent: 'recruitment' } })
```

### Alertas recomendadas en Sentry

- Error rate > 5% en 5 minutos → email al founder
- Cualquier error en `webhook.controller.ts` → Slack/email inmediato
- Error en `mercadopago.service.ts` → email inmediato

### Variables de entorno

```
SENTRY_DSN=https://xxx@sentry.io/yyy
```

Plan free: hasta 10.000 errores/mes — suficiente para el piloto.

---

## FASE 3 — Tests (ConversationService + webhooks críticos)

**Prioridad: alta**

### Por qué

El `ConversationService` es la máquina de estados del bot — el core del negocio.
Un bug ahí rompe la experiencia de todos los usuarios.
Sin tests, cualquier cambio es un riesgo.

### Instalación

```bash
pnpm add -D vitest @vitest/coverage-v8 supertest --filter @servy/api
```

### Configuración: `apps/api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/controllers/**'],
      thresholds: { lines: 60 }, // 60% mínimo
    },
  },
})
```

### Tests requeridos

#### `apps/api/src/tests/conversation.test.ts`

```typescript
describe('ConversationService', () => {
  // Flujo feliz completo
  it('flujo completo: descripción → match → cotización → pago')
  
  // Onboarding
  it('usuario nuevo: solicita nombre y dirección antes de continuar')
  it('usuario existente: no pide onboarding de nuevo')
  
  // Estados
  it('mensaje fuera de estado esperado → respuesta de ayuda')
  it('sesión expirada → reinicia flujo')
  
  // Selección de profesional
  it('respuesta "1" selecciona urgente')
  it('respuesta "2" selecciona programado')
  it('respuesta inválida → repite opciones')
  
  // Cotización
  it('aceptar cotización → genera link de MP')
  it('rechazar cotización → vuelve a opciones')
  
  // Mensajería intermediada
  it('"estoy yendo" del técnico → avisa al usuario')
  it('"tuve un imprevisto" → avisa al usuario y loguea en agent_logs')
  it('mensaje libre del usuario con job activo → reenvía al técnico')
})
```

#### `apps/api/src/tests/mercadopago.test.ts`

```typescript
describe('MercadoPago webhook', () => {
  it('status approved → crea job, manda WhatsApp a usuario y técnico')
  it('status rejected → notifica al usuario')
  it('status duplicado → ignora (idempotente)')
  it('firma HMAC inválida → 401')
  it('quotation_id inexistente → no hace nada')
})
```

#### `apps/api/src/tests/availability-agent.test.ts`

```typescript
describe('AvailabilityAgent', () => {
  it('"listo por hoy" → checkout del técnico')
  it('"lsto por hoy" (typo) → checkout por Levenshtein ≤ 2')
  it('"disponible" → check-in y estado activo en Redis')
  it('técnico sin schedule → TTL default de 12hs')
})
```

### Script en `package.json`

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

---

## FASE 4 — CI/CD con GitHub Actions

**Prioridad: media-alta**

### Por qué

Hoy pusheás a main y Railway/Vercel despliegan sin verificar nada.
Con CI/CD los tests corren antes de cada deploy — un test roto bloquea el deploy.

### Archivo: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @servy/api test
      - run: pnpm --filter @servy/api exec tsc --noEmit

  deploy-api:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-github-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: api

  deploy-frontends:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

### Secrets necesarios en GitHub

```
RAILWAY_TOKEN        # Railway → Account Settings → Tokens
VERCEL_TOKEN         # Vercel → Settings → Tokens
VERCEL_ORG_ID        # Vercel → Settings → General
VERCEL_PROJECT_ID    # Vercel → Project → Settings
```

---

## FASE 5 — Rate limiting y seguridad

**Prioridad: media**

### Por qué

El webhook de WhatsApp es público — cualquiera puede spammearlo.
Sin rate limiting un usuario malicioso puede generar miles de sesiones.

### Instalación

```bash
pnpm add express-rate-limit rate-limit-redis --filter @servy/api
```

### Archivo: `apps/api/src/middlewares/rate-limit.ts`

```typescript
import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { redis } from '../utils/redis'

// Webhook de WhatsApp: 10 mensajes por minuto por número
export const whatsappRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.From ?? req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  message: { error: 'Demasiados mensajes. Esperá un momento.' },
})

// Auth endpoints: 5 intentos por minuto
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
})

// API general: 100 requests por minuto
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
})
```

### Aplicar en `apps/api/src/index.ts`

```typescript
app.use('/webhook/whatsapp', whatsappRateLimit)
app.use('/auth', authRateLimit)
app.use('/api', apiRateLimit)
```

### Validación HMAC en webhook de WhatsApp

Ya existe para MP — agregar lo mismo para WhatsApp en `webhook.controller.ts`:

```typescript
const signature = req.headers['x-hub-signature-256'] as string
const expected = `sha256=${crypto
  .createHmac('sha256', process.env.WA_APP_SECRET!)
  .update(JSON.stringify(req.body))
  .digest('hex')}`
if (signature !== expected) return res.status(401).send()
```

---

## FASE 6 — Caché más agresivo

**Prioridad: baja (implementar con volumen real)**

### Casos de uso

```typescript
// 1. Pricing config — hoy va a Postgres en cada cotización
// Cachear en Redis con TTL de 1 hora
const PRICING_CONFIG_KEY = 'config:pricing:active'
// TTL: 1 hora, invalidar cuando admin actualiza config

// 2. Matching de profesionales por zona
// Hoy hace query a Postgres en cada pedido
const PROFESSIONALS_KEY = 'professionals:active:{zone}:{category}'
// TTL: 5 minutos, invalidar cuando un profesional cambia estado

// 3. Respuestas de Gemini para prompts similares
// Hash del prompt como key
const GEMINI_CACHE_KEY = 'gemini:cache:{hash}'
// TTL: 24 horas — solo para prompts deterministas (pricing materials, scoring)
```

---

## FASE 7 — Separar la API en servicios

**Prioridad: baja (solo cuando el equipo crezca)**

### Cuándo hacerlo

- Equipo de más de 3 devs trabajando en paralelo
- Más de 10.000 servicios/mes
- El proceso Node supera 512MB de RAM consistentemente

### Arquitectura propuesta

```
apps/
├── api-bot/          # Solo webhook WhatsApp + ConversationService
├── api-agents/       # Los 8 agentes + crons
├── api-public/       # Endpoints del portal pro y admin
└── api-webhooks/     # Webhooks de MP, Twilio, Meta
```

Cada servicio se deploya independientemente en Railway.
Comunicación entre servicios via Redis pub/sub o BullMQ.

---

## ORDEN DE IMPLEMENTACIÓN

### Sprint 1 (esta semana)
1. BullMQ — instalar, crear queues, mover scraping de Apify y mensajes de WhatsApp
2. Sentry — instalar, configurar, agregar en agentes críticos

### Sprint 2
3. Tests del ConversationService (mínimo flujo feliz + webhook MP)
4. Rate limiting en webhook de WhatsApp

### Sprint 3
5. CI/CD con GitHub Actions
6. Tests de los agentes

### Backlog
7. Caché agresivo
8. Separar API en servicios

---

## VARIABLES DE ENTORNO ADICIONALES

```
SENTRY_DSN=              # https://xxx@sentry.io/yyy
RAILWAY_TOKEN=           # para CI/CD
VERCEL_TOKEN=            # para CI/CD
```
