# Servy — Seed & Conversation Simulator Spec v1.0

> Script de datos de prueba y simulador de conversaciones para testear el producto
> sin técnicos ni usuarios reales.
> Leer el master spec y arch_spec.md antes de implementar.

---

## CONTEXTO

Para probar el flujo completo de Servy sin depender de técnicos reales ni números de
WhatsApp físicos, necesitamos:

1. **Seed de datos** — 20 técnicos + 20 usuarios ficticios en la DB
2. **Simulador de conversaciones** — script que llama directamente al webhook de
   WhatsApp simulando mensajes, sin pasar por Twilio

---

## ARCHIVOS A CREAR

```
apps/api/src/
├── scripts/
│   ├── seed-test-data.ts        # Crea técnicos y usuarios en DB
│   ├── clear-test-data.ts       # Limpia todos los datos de prueba
│   └── simulate-conversation.ts # Simula conversaciones completas
└── tests/
    └── fixtures/
        └── test-data.ts         # Datos compartidos entre seed y tests
```

---

## SCRIPT 1 — `seed-test-data.ts`

### Técnicos a crear (20 profesionales)

Distribuidos por categoría y zona. Todos con `status: 'active'` y
`onboarding_completed: true`.

```typescript
const PROFESSIONALS = [
  // Plomeros — zona norte
  { name: 'Carlos Rodríguez', category: 'plomeria', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
  { name: 'Martín López', category: 'plomeria', zone: 'gba_norte', rating: 4.7, isUrgent: false, isScheduled: true },
  { name: 'Diego Fernández', category: 'plomeria', zone: 'caba_resto', rating: 4.8, isUrgent: true, isScheduled: true },
  { name: 'Pablo García', category: 'plomeria', zone: 'caba_resto', rating: 4.5, isUrgent: true, isScheduled: false },

  // Electricistas
  { name: 'Sergio Torres', category: 'electricidad', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
  { name: 'Nicolás Pérez', category: 'electricidad', zone: 'gba_norte', rating: 4.6, isUrgent: false, isScheduled: true },
  { name: 'Alejandro Díaz', category: 'electricidad', zone: 'caba_resto', rating: 4.8, isUrgent: true, isScheduled: true },
  { name: 'Federico Ruiz', category: 'electricidad', zone: 'caba_premium', rating: 4.7, isUrgent: true, isScheduled: false },

  // Gasistas
  { name: 'Roberto Sánchez', category: 'gas', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
  { name: 'Gustavo Moreno', category: 'gas', zone: 'caba_resto', rating: 4.8, isUrgent: false, isScheduled: true },
  { name: 'Hernán Jiménez', category: 'gas', zone: 'caba_premium', rating: 4.7, isUrgent: true, isScheduled: true },

  // Cerrajeros
  { name: 'Oscar Romero', category: 'cerrajeria', zone: 'gba_norte', rating: 4.8, isUrgent: true, isScheduled: false },
  { name: 'Luis Vargas', category: 'cerrajeria', zone: 'caba_resto', rating: 4.6, isUrgent: true, isScheduled: false },
  { name: 'Juan Medina', category: 'cerrajeria', zone: 'caba_premium', rating: 4.9, isUrgent: true, isScheduled: false },

  // Técnicos de aires
  { name: 'Marcelo Castro', category: 'aires', zone: 'gba_norte', rating: 4.7, isUrgent: false, isScheduled: true },
  { name: 'Andrés Ortega', category: 'aires', zone: 'caba_resto', rating: 4.8, isUrgent: false, isScheduled: true },
  { name: 'Ricardo Flores', category: 'aires', zone: 'caba_premium', rating: 4.9, isUrgent: true, isScheduled: true },

  // Multioficio
  { name: 'Eduardo Silva', category: 'plomeria', zone: 'gba_norte', rating: 4.5, isUrgent: true, isScheduled: true },
  { name: 'Claudio Reyes', category: 'electricidad', zone: 'caba_resto', rating: 4.6, isUrgent: false, isScheduled: true },
  { name: 'Miguel Herrera', category: 'gas', zone: 'gba_norte', rating: 4.4, isUrgent: true, isScheduled: true },
]
```

Cada profesional se crea con:
- `email`: `{nombre.toLowerCase().replace(' ', '.')}@test.servy.lat`
- `password_hash`: bcrypt de `Test1234!`
- `phone`: `+54911000000XX` (XX = índice 01-20)
- `categories`: array con su categoría principal
- `zones`: array con su zona
- `dni`: `3000000XX`

### Usuarios a crear (20)

```typescript
const USERS = [
  { name: 'Ana Martínez', phone: '+5491155550001', address: 'Av. Santa Fe 1234, Pilar' },
  { name: 'Laura González', phone: '+5491155550002', address: 'Belgrano 567, Pilar' },
  { name: 'Sofía Ramírez', phone: '+5491155550003', address: 'San Martín 890, Del Viso' },
  { name: 'Valentina Torres', phone: '+5491155550004', address: 'Rivadavia 234, Pilar' },
  { name: 'Camila López', phone: '+5491155550005', address: 'Mitre 678, Tortuguitas' },
  { name: 'Martina García', phone: '+5491155550006', address: 'Sarmiento 345, Manuel Alberti' },
  { name: 'Julia Fernández', phone: '+5491155550007', address: 'Corrientes 1567, Pilar' },
  { name: 'Florencia Díaz', phone: '+5491155550008', address: 'Las Heras 234, Del Viso' },
  { name: 'Romina Sánchez', phone: '+5491155550009', address: 'Libertad 890, Pilar' },
  { name: 'Natalia Pérez', phone: '+5491155550010', address: 'Moreno 456, Tortuguitas' },
  { name: 'Diego Castillo', phone: '+5491155550011', address: 'Av. del Libertador 789, Pilar' },
  { name: 'Facundo Ríos', phone: '+5491155550012', address: 'Reconquista 345, Del Viso' },
  { name: 'Lucía Benitez', phone: '+5491155550013', address: 'Avenida Italia 678, Pilar' },
  { name: 'Tomás Aguirre', phone: '+5491155550014', address: 'San Lorenzo 123, Tortuguitas' },
  { name: 'Agustina Molina', phone: '+5491155550015', address: 'Hipólito Yrigoyen 456, Pilar' },
  { name: 'Bruno Suárez', phone: '+5491155550016', address: 'Av. Colón 789, Manuel Alberti' },
  { name: 'Manuela Castro', phone: '+5491155550017', address: 'Güemes 234, Del Viso' },
  { name: 'Ignacio Peralta', phone: '+5491155550018', address: 'Av. San Martín 567, Pilar' },
  { name: 'Julieta Vega', phone: '+5491155550019', address: 'Lavalle 890, Tortuguitas' },
  { name: 'Matías Heredia', phone: '+5491155550020', address: 'Independencia 123, Pilar' },
]
```

Todos con `onboarding_completed: true`.

### Jobs en distintos estados (para el dashboard)

Crear un job en cada estado para poder ver el dashboard completo:

```typescript
// 1. Job pending — service_request creado, sin job_offer
// 2. Job quoted — cotización enviada al usuario
// 3. Job confirmed — pago aprobado, trabajo confirmado
// 4. Job completed — trabajo terminado con rating
// 5. Job cancelled — trabajo cancelado
```

### Cómo correr

```bash
# Crear datos de prueba
cd apps/api
DATABASE_URL='postgresql://...' npx tsx src/scripts/seed-test-data.ts

# Limpiar datos de prueba
DATABASE_URL='postgresql://...' npx tsx src/scripts/clear-test-data.ts
```

El script de limpieza borra solo los registros con emails `@test.servy.lat` y
teléfonos `+549115555XXXX`.

---

## SCRIPT 2 — `simulate-conversation.ts`

Simula una conversación completa enviando POST requests al webhook de WhatsApp
local, como si fueran mensajes reales de Twilio.

### Interfaz

```bash
# Simular flujo completo de un usuario
npx tsx src/scripts/simulate-conversation.ts \
  --phone=+5491155550001 \
  --scenario=full_flow \
  --category=plomeria

# Simular solo un mensaje específico
npx tsx src/scripts/simulate-conversation.ts \
  --phone=+5491155550001 \
  --message="necesito un plomero"

# Simular mensaje de técnico
npx tsx src/scripts/simulate-conversation.ts \
  --phone=+549110000001 \
  --role=professional \
  --message="estoy yendo"

# Ver todos los escenarios disponibles
npx tsx src/scripts/simulate-conversation.ts --list
```

### Escenarios predefinidos

```typescript
const SCENARIOS = {
  // Flujo completo feliz
  full_flow: [
    { message: 'necesito un plomero', delay: 1000 },
    { message: '1', delay: 2000 },           // selecciona urgente
    { message: '1', delay: 1000 },           // franja mañana
    { message: 'Aceptar', delay: 3000 },     // acepta cotización
    // El pago se simula automáticamente via webhook de MP
  ],

  // Solo onboarding
  onboarding: [
    { message: 'hola', delay: 1000 },
    { message: 'Juan Pérez', delay: 2000 },
    { message: 'Av. Corrientes 1234, Pilar', delay: 2000 },
  ],

  // Flujo con rechazo
  reject_and_retry: [
    { message: 'necesito electricista', delay: 1000 },
    { message: '1', delay: 2000 },
    { message: '2', delay: 1000 },
    { message: 'Rechazar', delay: 3000 },    // rechaza cotización
    { message: '2', delay: 2000 },           // elige el otro profesional
    { message: 'Aceptar', delay: 3000 },
  ],

  // Mensajería intermediada
  mediated_messaging: [
    // Después de job confirmado:
    { phone: 'professional', message: 'estoy yendo', delay: 1000 },
    { phone: 'user', message: 'perfecto gracias', delay: 2000 },
    { phone: 'professional', message: 'llego en 10 minutos', delay: 2000 },
  ],

  // Imprevisto del técnico
  imprevisto: [
    { phone: 'professional', message: 'tuve un imprevisto', delay: 1000 },
  ],
}
```

### Cómo funciona internamente

El simulador hace POST directo al webhook local:

```typescript
async function sendMessage(phone: string, message: string, role: 'user' | 'professional') {
  await fetch('http://localhost:3000/webhook/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      From: `whatsapp:${phone}`,
      Body: message,
      MessageType: 'text',
      NumMedia: '0',
    }),
  })
}
```

### Simular pago de Mercado Pago

```typescript
async function simulatePayment(quotationId: string, userPhone: string) {
  await fetch('http://localhost:3000/webhook/mercadopago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': generateHMAC(payload), // genera HMAC válido con MP_WEBHOOK_SECRET
    },
    body: JSON.stringify({
      type: 'payment',
      data: { id: `TEST_${Date.now()}` },
      // status: 'approved' viene de la consulta a MP API (mockeada en test)
    }),
  })
}
```

---

## SCRIPT 3 — `clear-test-data.ts`

Limpia todos los datos de prueba sin tocar datos reales:

```typescript
// Borra en orden para respetar foreign keys:
// jobs → quotations → job_offers → service_requests
// payments
// professionals (donde email like '%@test.servy.lat')
// users (donde phone like '+549115555%')
// whatsapp_sessions (donde phone like '+549115555%')
// provider_health, provider_ratings, provider_sessions
//   (donde provider_id está en los profesionales borrados)
```

---

## VARIABLES DE ENTORNO REQUERIDAS

No necesita variables nuevas — usa `DATABASE_URL` y `API_URL` existentes.

Para correr contra staging en Railway:

```bash
DATABASE_URL='postgresql://postgres:PASSWORD@interchange.proxy.rlwy.net:22623/railway' \
API_URL='https://servy-api-staging-production.up.railway.app' \
npx tsx src/scripts/seed-test-data.ts
```

---

## ORDEN DE IMPLEMENTACIÓN

1. `src/tests/fixtures/test-data.ts` — datos compartidos
2. `src/scripts/seed-test-data.ts` — seed de técnicos y usuarios
3. `src/scripts/clear-test-data.ts` — limpieza
4. `src/scripts/simulate-conversation.ts` — simulador

Agregar en `package.json`:
```json
"scripts": {
  "seed": "tsx src/scripts/seed-test-data.ts",
  "seed:clear": "tsx src/scripts/clear-test-data.ts",
  "simulate": "tsx src/scripts/simulate-conversation.ts"
}
```

---

## NOTAS IMPORTANTES

- Todos los datos de prueba usan el dominio `@test.servy.lat` y teléfonos
  `+549115555XXXX` para poder identificarlos y borrarlos fácilmente
- El simulador funciona contra localhost (dev) o contra la URL de staging
- Los passwords de los técnicos de prueba son todos `Test1234!`
- No commitear datos de prueba reales al repo
- El script de seed es idempotente — si se corre dos veces no duplica datos

---

## PROCEDIMIENTO COMPLETO

### Arrancar con datos de prueba

1. Correr el seed:
```bash
cd apps/api
DATABASE_URL='postgresql://...' pnpm seed
```
2. Verificar en `admin.servy.lat` que aparecen los 20 técnicos y 20 usuarios
3. Correr el simulador con distintos escenarios:
```bash
API_URL='https://servy-api-staging-production.up.railway.app' pnpm simulate --phone=+5491155550001 --scenario=full_flow --category=plomeria
```
4. Ver cómo los agentes actúan en el admin — retención, calidad, finanzas, fraude

### Limpiar y arrancar con datos reales

1. Correr la limpieza:
```bash
DATABASE_URL='postgresql://...' pnpm seed:clear
```
2. Verificar en el admin que no quedan datos de prueba
3. Cargar los primeros técnicos reales manualmente desde el admin
4. El sistema queda listo para usuarios reales

### Notas importantes del procedimiento

- Los agentes actúan sobre los datos de prueba igual que con datos reales
- Twilio va a intentar mandar WhatsApps a los números de prueba — van a fallar silenciosamente, es normal
- Nunca correr seed en producción con usuarios reales activos
- Siempre correr `seed:clear` antes de pasar a producción real
- El seed es idempotente — si se corre dos veces no duplica datos
