# BACKLOG.md

## Tareas Prioritarias y Deuda Técnica Detectada

Este documento detalla el backlog técnico acumulado y los cuellos de botella detectados en el repositorio de Servy.

---

### 1. Seguridad y Rendimiento de Consultas
- [ ] **Sanitización de SQL Crudo:** Reemplazar las llamadas directas `$executeRawUnsafe` y `$queryRaw` en `finance-agent.ts` por variables parametrizadas nativas de Prisma (`$executeRaw` / `$queryRaw` con templates) para evitar riesgos de inyección SQL y mejorar la performance.
- [ ] **Optimización de Consultas N+1:** Corregir consultas consecutivas al cliente Prisma dentro de bucles (`for...of` / `.map`) en `matching.service.ts` y reportes financieros. Priorizar consultas batch (`findMany` con operador `in`).

---

### 2. Rendimiento de Base de Datos (PostgreSQL)
- [ ] **Índices en Base de Datos:** Agregar índices ausentes en tablas transaccionales de crecimiento rápido dentro de `packages/db/prisma/schema.prisma` para mejorar la velocidad de lectura y búsquedas:
  * `job_offers` (índices por `request_id` y `professional_id`).
  * `quotations` (índice por `job_offer_id`).
  * `payments` (índice por `quotation_id` y `status`).

---

### 3. Arquitectura y Escalabilidad de Procesos
- [ ] **Desacoplamiento de Workers Cron:** Delegar tareas pesadas del cron (ej: análisis financiero Gemini, generación de reportes y WhatsApp masivo a fundadores) a una cola de mensajería asincrónica (ej: BullMQ usando la instancia de Redis) en lugar de ejecutarlas secuencialmente en el proceso Express.

---

### 4. Refactorización de Código
- [ ] **Refactorización del Bot de WhatsApp:** Migrar la lógica densa de `conversation.service.ts` hacia un patrón de State Machine modular para mejorar la mantenibilidad del onboarding y los flujos de agenda.
