# Estrategia de Pruebas (Test Strategy)

Este documento sirve como la única fuente de verdad (SSOT) para la arquitectura, herramientas y procesos de validación de pruebas del backend de Servy (`apps/api`). Debe mantenerse actualizado cada vez que se modifique la estrategia o se agreguen nuevos tipos de tests.

---

## 1. Arquitectura y Herramientas

| Herramienta | Rol | Ejecución |
| :--- | :--- | :--- |
| **Vitest** | Test runner principal y mocking de APIs externas (Twilio, Mercado Pago, AWS S3, Resend). | `pnpm test` (unitarios/mocks) |
| **Supertest** | Agente de simulación HTTP para invocar rutas de la aplicación Express (`app`). | Integrado en los archivos `.test.ts` |
| **PostgreSQL (`servydb_test`)** | Base de datos de pruebas real para asegurar integridad de relaciones y persistencia sin mocks. | Integrado en `test:integration` |
| **Autocannon** | Generador de carga y concurrencia para pruebas de estrés. | `pnpm run stress:run` |

---

## 2. Tipos de Pruebas Implementados

### A. Pruebas Unitarias y con Mocks (`src/__tests__/*.test.ts`)
* **Ubicación:** `apps/api/src/__tests__/` (excluyendo archivos real-db).
* **Propósito:** Validar lógica de negocio aislada rápida.
* **Base de datos:** Mockeada mediante `vi.mock('@servy/db')`. No requiere base de datos activa.

### B. Pruebas de Integración con Base de Datos Real (`src/__tests__/integration-real-db.test.ts`)
* **Ubicación:** `apps/api/src/__tests__/integration-real-db.test.ts`.
* **Propósito:** Probar los flujos de usuario completos (Registro, Asignación, Cotización, Pagos de Mercado Pago y Liberación de fondos por QR) interactuando con una base de datos real.
* **Requisito:** Requiere que PostgreSQL esté activo en el puerto 5432 y que se especifique `DATABASE_URL` apuntando a la base de pruebas.

### C. Pruebas de Seguridad (`src/__tests__/security-vulnerability.test.ts`)
* **Ubicación:** `apps/api/src/__tests__/security-vulnerability.test.ts`.
* **Propósito:** Evitar regresiones de seguridad y verificar resiliencia ante inyecciones (SQLi), polución de parámetros (HPP), y falta de autorización (IDOR).

### D. Pruebas de Estrés y Carga (`scripts/stress-test.ts`)
* **Ubicación:** `apps/api/scripts/stress-test.ts`.
* **Propósito:** Probar la estabilidad del event loop y base de datos ante concurrencia simulando cientos de peticiones simultáneas a los endpoints de `/health`, `/auth/professional/login`, y `/webhook/twilio`.

---

## 3. Instrucciones de Ejecución

### Prerrequisitos
1. Iniciar el motor de base de datos (ej. Docker Desktop o servicio PostgreSQL nativo):
   ```bash
   docker compose up -d
   ```
2. Asegurar que las variables de entorno de prueba estén configuradas (Vitest las setea por defecto en `setup.ts`).
3. Levantar la base de datos de test (`servydb_test`) y aplicar el esquema:
   ```bash
   # Posicionado en packages/db
   $env:DATABASE_URL="postgresql://servy:password@localhost:5432/servydb_test?schema=public"
   pnpm prisma db push
   ```

### Comandos de Ejecución
* **Pruebas Rápidas / Unitarias:**
  ```bash
  pnpm --filter @servy/api test
  ```
* **Pruebas de Integración & Seguridad (Con DB Real):**
  ```bash
  pnpm --filter @servy/api run test:integration
  ```
* **Pruebas de Carga y Estrés:**
  ```bash
  # Primero levantar el servidor en modo desarrollo o producción en otra terminal
  pnpm --filter @servy/api run dev
  # Luego correr la prueba de carga
  pnpm --filter @servy/api run stress:run
  ```

---

## 4. Mantenimiento y Aislamiento

* **Limpieza de Base de Datos:** Antes de correr cada test de integración, el archivo `test-db-setup.ts` ejecuta un comando `TRUNCATE CASCADE` de forma secuencial en las tablas para asegurar el aislamiento absoluto entre ejecuciones de pruebas.
* **Mantenimiento del Esquema:** Si modificas el archivo `schema.prisma` del proyecto, debes volver a correr el comando `prisma db push` apuntando a la base de pruebas para sincronizar el esquema.
