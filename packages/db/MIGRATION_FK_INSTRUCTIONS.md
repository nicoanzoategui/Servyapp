# Migración: Foreign Key PasswordToken → Professional

Esta migración agrega un **foreign key** en PostgreSQL entre `password_tokens.email` y `professionals.email`, alineado con la relación declarada en `schema.prisma`.

## Importante

La migración **fallará** si quedan filas en `password_tokens` cuyo `email` no coincide con ningún `professionals.email`.

## Pasos para aplicar la migración

### 1. Limpiar tokens huérfanos (obligatorio antes del FK)

```bash
cd packages/db
npx tsx scripts/clean-orphan-tokens.ts
```

Elimina tokens cuyo email normalizado (trim + minúsculas) no existe en ningún profesional.

---

### 2. Aplicar la migración

#### Opción A: Desarrollo local (recomendado primero)

```bash
cd packages/db
pnpm exec prisma migrate dev --name add_passwordtoken_professional_fk
```

- Genera el SQL en `prisma/migrations/`
- Lo aplica a la base local
- Actualiza el historial de migraciones

#### Opción B: Producción (Railway u otro)

**No uses `migrate dev` en producción.**

1. Generá la migración en local **solo archivo** (o copiá la carpeta generada en dev):

```bash
cd packages/db
pnpm exec prisma migrate dev --create-only --name add_passwordtoken_professional_fk
```

2. Revisá el SQL en:

`packages/db/prisma/migrations/<timestamp>_add_passwordtoken_professional_fk/migration.sql`

3. En producción:

```bash
cd packages/db
pnpm exec prisma migrate deploy
```

---

### 3. Verificar

```bash
cd packages/db
npx tsx scripts/verify-fk.ts
```

Intenta crear un token con un email inexistente: si el FK está aplicado, Prisma/Postgres rechaza el insert (`P2003` / foreign key).

---

## Qué hace la migración (conceptual)

Prisma genera un `ALTER TABLE` que agrega la FK de `password_tokens.email` → `professionals.email`. El comportamiento exacto (`ON DELETE` / `ON UPDATE`) sale del `migration.sql` generado: **revisalo** antes de `deploy`.

Efectos habituales:

- No se pueden insertar tokens con email inexistente en `professionals`.
- La integridad queda garantizada a nivel de base de datos.

---

## Cuándo aplicarla

| Entorno      | Sugerencia                                      |
| ------------ | ----------------------------------------------- |
| Desarrollo   | Cuando quieras alinear DB con el schema actual |
| Producción   | Después de probar magic link y limpiar huérfanos |

---

## Si la migración falla

Mensaje típico:

```text
ERROR: insert or update on table "password_tokens" violates foreign key constraint
```

**Pasos:**

1. Volvé a correr la limpieza:

```bash
cd packages/db
npx tsx scripts/clean-orphan-tokens.ts
```

2. Revisá manualmente si quedó algún email raro en `password_tokens` frente a `professionals`.

3. Reintentá `migrate dev` o `migrate deploy`.
