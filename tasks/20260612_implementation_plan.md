# Plan de Pruebas Preventivas y Caja Negra para Servy (Estructura por Fases)

El objetivo es establecer un plan de pruebas automatizadas aisladas para asegurar que los flujos críticos del negocio no se rompan durante refactorizaciones.

---

## Fases de Implementación

### Fase 1: Infraestructura de Mocks (Bases de Datos y Mensajería)
- **Objetivo:** Configurar el entorno de pruebas para que no dependa de APIs externas ni base de datos real.
- **Tareas:**
  1. Configurar mocks globales para Prisma Client.
  2. Configurar mocks globales para el SDK de Twilio y servicios de mensajería (`whatsapp.service.ts`).

### Fase 2: Pruebas Unitarias de Servicios Críticos
- **Objetivo:** Asegurar lógica interna sin dependencias HTTP.
- **Tareas:**
  1. Expandir pruebas de `matching.service.ts` para cubrir casos límite.
  2. Implementar pruebas básicas de controladores sin levantar el servidor Express.

### Fase 3: Pruebas de Caja Negra e Integración (Endpoints y Webhooks)
- **Objetivo:** Simular comportamiento de extremo a extremo usando HTTP simulado.
- **Tareas:**
  1. Implementar `endpoints.test.ts` usando `supertest` para autenticación y operaciones comunes.
  2. Implementar `whatsapp.test.ts` simulando la llegada de mensajes entrantes a la ruta del webhook de Twilio y verificando las transiciones de estado en Redis y respuestas enviadas.

---

## 1. Estrategia de Aislamiento

### A. Mockeo de WhatsApp / Twilio
- Reemplazar llamadas reales con mocks en Vitest (`vi.mock`).
- Usar `supertest` para simular llamadas al webhook `/webhook/whatsapp`.

### B. Estrategia de Base de Datos
- Mockear `prisma` usando `vi.mock('@servy/db')`, retornando payloads controlados.

---

## 2. Plan de Verificación

### Pruebas Automatizadas
- Ejecutar suite de pruebas:
  ```bash
  pnpm --filter @servy/api test
  ```
