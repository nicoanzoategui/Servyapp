# Walkthrough - Implementación de Suite de Validación

Hemos creado e integrado de punta a punta todas las herramientas y pruebas requeridas para garantizar la estabilidad del backend de Servy durante las próximas tareas de estrés, vulnerabilidades y posterior refactorización.

## Cambios Realizados

1. **Configuración de Dependencias y Scripts:**
   * Agregado `autocannon` en [package.json](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/apps/api/package.json).
   * Agregados los scripts `"test:integration"` y `"stress:run"`.

2. **Base de Datos de Prueba:**
   * Creado [test-db-setup.ts](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/apps/api/src/__tests__/test-db-setup.ts) para la conexión y limpieza dinámica vía TRUNCATE de la base `servydb_test`.

3. **Pruebas de Integración y Flujos de Usuario:**
   * Creado [integration-real-db.test.ts](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/apps/api/src/__tests__/integration-real-db.test.ts) cubriendo:
     * **Flujo A:** Registro, mensajes webhook Twilio y guardado en tabla `users`.
     * **Flujo B:** Matching, cotización, pagos (`visit`/`repair`), actualización de estados e inicialización de trabajos.

4. **Pruebas de Seguridad y Vulnerabilidad:**
   * Creado [security-vulnerability.test.ts](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/apps/api/src/__tests__/security-vulnerability.test.ts) cubriendo:
     * Validación de tokens JWT ausentes o expirados (BOLA/IDOR).
     * Intentos de SQL Injection en logins.
     * HTTP Parameter Pollution (HPP).

5. **Pruebas de Estrés:**
   * Creado [stress-test.ts](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/apps/api/scripts/stress-test.ts) ejecutando Autocannon en 3 escenarios concurrentes (salud, login y webhook Twilio).

6. **Documentación de la Estrategia:**
   * Creado el SSOT [TEST_STRATEGY.md](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/TEST_STRATEGY.md) en la raíz del monorepositorio.
   * Referenciado `TEST_STRATEGY.md` dentro de [GEMINI.md](file:///D:/ThisPc/Documentos/Proyectos/Servyapp/GEMINI.md).

---

## Verificación Requerida (Siguiente Paso)
Para correr la suite contra la base de datos real, es necesario levantar el motor local:
1. Asegurar que Docker Desktop esté encendido.
2. Iniciar contenedores: `docker compose up -d`
3. Aplicar esquema a la base de pruebas:
   ```bash
   $env:DATABASE_URL="postgresql://servy:password@localhost:5432/servydb_test?schema=public"
   pnpm prisma db push # posicionado en packages/db
   ```
4. Correr la suite: `pnpm --filter @servy/api run test:integration`
