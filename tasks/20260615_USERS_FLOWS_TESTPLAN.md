# Test Plan for User Types and Flows

## User Types
| Type | Unique Identifier | Main Channel | DB Status | 
|------|-------------------|--------------|-----------|
| **Cliente (User)** | Phone number | WhatsApp Bot (`conversation.service.ts`) | `users` table |
| **Professional / Técnico** | Phone + email + DNI | WhatsApp Wizard + Portal Web (`pro-portal`) | `professionals` table (`pending` → `active` / `suspended`) |
| **Administrator** | Email + password | Admin Panel (`apps/admin`) | Separate auth table |

## Main Flows
### **FLUJO A: Cliente — Pedido de Servicio (WhatsApp)**
1. **Onboarding inicial** (si no registrado): nombre, tipo de domicilio, calle, ciudad, CP.
2. **Descripción del problema** → IA (Gemini) clasifica: categoría + urgencia (alta/media/baja).
3. **Envío de fotos** (opcional) o "listo".
4. **Selección de agenda**: Urgente (<24h) vs Programada (≤72h) + franja horaria.
5. **Matching automático** con profesionales activos de la zona.
6. **Notificación**: "Asignando técnico, espere confirmación".

### **FLUJO B: Asignación, Pago de Visita y Arreglo**
1. **API → Profesional**: Notifica oferta por WhatsApp.
2. **Profesional → API**: Acepta ("estoy yendo") → estado `held`/`accepted`.
3. **API → Mercado Pago**: Genera preference link (tarifa de visita fija según urgencia).
4. **API → Cliente**: Envía link de pago visita.
5. **Cliente → Mercado Pago**: Paga visita.
6. **MP → API (webhook)**: Pago aprobado.
7. **API → Cliente**: Confirma técnico + datos contacto + **QR de liberación**.
8. **API → Profesional**: Confirma visita pagada + dirección + comandos habilitados.
9. **Profesional (en sitio)**: Diagnostica → carga cotización en Portal Pro (`repair`).
10. **API → Cliente**: Envía presupuesto (Aceptar/Rechazar).
11. **Cliente → API**: Acepta → genera link pago arreglo total.
12. **Cliente → Mercado Pago**: Paga arreglo (queda **retenido** en Servy).
13. **Profesional ejecuta trabajo**.
14. **Cliente escanea QR** → libera pago.
15. **API**: Calcula comisión (12% + MP fees) → deposita neto al técnico (`earnings`).

### **FLUJO C: Onboarding Profesional (Híbrido WhatsApp + Web)**
1. **Contacto**: Form Landing (`/tecnicos`) o WhatsApp "Soy técnico".
2. **Wizard WhatsApp**: DNI, email, rubros, zonas, CBU/alias.
3. **Portal Web**: Link para setear password + acceso `pro-portal`.
4. **Subida docs**: DNI frente/dorso + certificaciones → S3 → estado `pending`.
5. **Admin aprueba** en `apps/admin` → estado `active` → recibe ofertas.

### **FLUJO D: Administrador (Panel Interno)**
- Aprobar/rechazar/suspender profesionales.
- Gestionar solicitudes, ofertas, reclamos, incidencias.
- Módulo financiero: ingresos brutos, comisiones, alertas IA, conciliación diaria MP.

## Estados Clave para Tests
| Entidad | Estados Relevantes |
|---------|--------------------|
| `JobOffer` | `pending` → `held` → `accepted` / `rejected` / `expired` |
| `Quotation` | `visit` (fija) / `repair` (detallada) |
| `Payment` | `visit` / `repair` → `pending` → `approved` / `rejected` / `refunded` |
| `Job` | `in_progress` → `completed` (QR escaneado) → `payment_released_at` |
| `Professional` | `pending` → `active` / `suspended` |

## Sugerencias de Pruebas
- **Validar Webhooks de Pago**: Asegurar que los webhooks de Mercado Pago para pagos `visit` y `repair` se procesan correctamente en `finance-agent.ts` (idempotencia, manejo de claves, transiciones de estado).
- **Validar Flujo QR**: Confirmar que el escaneo del QR actualiza `payment_released_at` en `jobs` y calcula comisión correcta en `earnings`.
- **Validar Onboarding de Profesional**: Verificar que documentos (DNI, certificaciones) se validan por formato (PDF/JPG/PNG) antes de la aprobación del admin.
- **Desacoplar Workers Cron**: Verificar que tareas pesadas (análisis financiero, reportes) usan BullMQ en lugar de ejecutarse directamente en `node-cron`.
- **Sanitización SQL y Fix N+1**: Asegurar que `$executeRaw` en `finance-agent.ts` usa plantillas seguras y que las consultas en `matching.service.ts` usan `findMany` con `in` para evitar N+1.

**Nota**: Todos los casos de prueba deben validar la integridad de datos en PostgreSQL y Redis donde aplique.