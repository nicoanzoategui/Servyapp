# Servy — checklist hacia producción

Orden sugerido de ejecución. **Mercado Pago queda al final** (sección 13).

---

## 1. Portal profesional ↔ API

- [x] Unificar login: `POST /auth/professional/login` con email + password; front sin hardcode de localhost.
- [x] Variable `NEXT_PUBLIC_API_URL` en landing, admin y pro-portal (`lib/api.ts` donde aplica + `.env.example` + `.env.local` local; dev en puertos 3001–3003).
- [x] Listado: ofertas (`GET /professional/offers`) vs confirmados (`GET /professional/jobs`) en UI.
- [x] Detalle y cotización: `offers/:id`, `POST /professional/offers/:id/quote`.
- [x] Body de cotización: `{ items, total_price, description, estimated_duration }` (con normalización).
- [x] Mapear respuestas API (detalle resuelve offer vs job).
- [x] Dirección oculta en ofertas pending/quoted (API + UI).

## 2. Bot WhatsApp — flujo conversacional

- [x] Tras cotización: `ConversationService.afterQuotationSent` → `AWAITING_PAYMENT_DECISION`.
- [x] En "Aceptar": MP si `PAYMENTS_ENABLED=true`, si no mensaje placeholder.
- [x] En "Rechazar": reactivar oferta hermana `cancelled` y avisar al otro profesional.
- [x] IDs categoría: mapa `cat_*` → Plomería / Electricidad / Cerrajería.
- [x] Intenciones: Ayuda, Estado/Mi turno, Cancelar.
- [x] Sesión expirada: rehidratación desde DB + mensaje si `EXPIRED`.

## 3. Webhook Meta (sin MP)

- [x] Raw body `POST /webhook/whatsapp` + `X-Hub-Signature-256` (o `WA_SKIP_SIGNATURE` en dev).
- [x] Firma inválida: no procesar (responde 200 a Meta pero ignora payload).

## 4. Datos, fotos y R2

- [ ] Persistir **solo keys** R2 en `service_requests.photos`, firmar al mostrar (hoy se sube a R2 pero en DB quedan **URLs firmadas** que expiran).
- [ ] Keys estables `requests/{request_id}/...` al subir (hoy `requests/temp_{teléfono}_{timestamp}.jpg` antes de existir el `request_id`).

## 5. Usuarios, profesionales y seed

- [x] Seed: bcrypt + admin demo + password documentado en consola del seed.
- [x] Admin `POST/PUT` professionals: hashear `password`, no aceptar `password_hash` arbitrario en update.
- [ ] Normalización de teléfonos (`+549`, etc.) en registro y matching con WhatsApp.

## 6. Admin API y back office

- [x] Pantallas admin: `/jobs`, `/finance`, `/settings` (consumen API existente).
- [ ] `reassignJob`: reglas vs cotización/pago (revisar negocio).
- [ ] Logs de acciones admin (IP, timestamp, acción).

## 7. Cron y notificaciones

- [x] Expiración ofertas: cancelar request solo si no quedan `pending` en ese request.
- [x] `reminder_sent` en schema + cron horario si hay `scheduled_at` en ventana 0–2h.
- [ ] Alerta email Resend si cotización > 30 min.
- [ ] Flujo review post-completado → rating profesional.

## 8. Front admin

- [x] Rutas `/jobs`, `/finance`, `/settings`.
- [x] Polling dashboard ~30s (ya estaba).
- [ ] Cookie httpOnly vs Bearer (mejora seguridad).

## 9. Front portal — producto

- [ ] Wizard onboarding 5 pasos + endpoint complete.
- [ ] Gating: `onboarding_completed` + `status === active`.
- [ ] 2FA WhatsApp (fase posterior).

## 10. Landing y leads

- [x] `POST /leads/professional` + modelo `ProfessionalLead` + landing apunta a API.
- [x] SEO/OG básico en layout; GA4 placeholder (reemplazar `G-XXXXXXXXXX`).

## 11. Infra, env y CI/CD

- [x] `.env.example` API ampliado (`API_PUBLIC_URL`, `PAYMENTS_ENABLED`, `WA_SKIP_SIGNATURE`, etc.).
- [x] `.gitignore` en raíz: `.env`, `.env.local`, `.env*.local`, `!.env.example` (no subir secretos de apps ni de `packages/db`).
- [x] GitHub Actions: tests API en PR/push.
- [x] API: tipos `Express.Request.user` + `ts-node.files` en `tsconfig` para que `pnpm dev` compile.
- [ ] Backups DB (proveedor / Railway).

## 12. Hardening

- [x] Rate limit en `/auth/*` y `/leads/professional` (memoria; migrar a Redis en prod).
- [ ] Sin PII en logs (`morgan`, `console` en cron/webhook).
- [ ] CORS: en prod incluir dominios reales del front (`https://servy.ar`, etc.); hoy local usa lista `localhost:3001–3003`.
- [ ] Sentry / Axiom.

## 13. Mercado Pago (último)

- [x] `POST /webhook/mercadopago` registrado (responde 200 + idempotencia job).
- [ ] Validar firma webhook MP + idempotencia de pagos duplicados (más estricta).
- [x] `notification_url` desde `API_PUBLIC_URL` + `/webhook/mercadopago`.
- [x] Bot: `createPreference` cuando `PAYMENTS_ENABLED` (resto pendiente de pruebas sandbox).
- [ ] Reembolsos admin E2E.
- [ ] Comisión / `earnings` al completar trabajo.
- [ ] Sandbox → producción en panel MP.

---

## Próximo sprint (orden sugerido: impacto vs esfuerzo)

1. **§12 CORS prod** — Bajo esfuerzo; desbloquea front en dominio real sin errores de navegador.
2. **§4 R2: keys + `requests/{id}/`** — Medio; evita fotos “rotas” cuando expiran URLs firmadas.
3. **§5 Normalización de teléfonos** — Medio; menos fallos de matching usuario ↔ WhatsApp.
4. **§8 Cookie httpOnly** (admin, luego portal) — Medio–alto; reduce robo de token por XSS.
5. **§7 Review → rating** — Medio; cierra el loop de confianza del marketplace.
6. **§6 Logs de acciones admin** — Medio; trazabilidad mínima antes de operar con datos reales.
7. **§11 Backups DB** — Bajo (config proveedor); obligatorio antes de producción seria.
8. **§12 PII en logs + Sentry** — Medio; compliance básico y debug en prod.
9. **§9 Onboarding portal + gating** — Alto esfuerzo; necesario si el producto exige alta de pros “self-serve”.
10. **§7 Resend >30 min** — Medio; complemento al cron (hoy ya hay WhatsApp en expiración).
11. **§13 Mercado Pago** — Alto; dejar para cuando el flujo operativo esté estable (firma, earnings, sandbox E2E).

---

## Leyenda

Marca con `[x]` cuando cierre un ítem. Los PRs pueden referenciar la sección (ej. `TODO.md §1`).

### Migración DB

Tras pull: en `packages/db` ejecutá `pnpm prisma migrate deploy` (o `db push` en dev) y `pnpm prisma generate`.
