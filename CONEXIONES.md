# Servy — Guía de conexiones e integraciones

Este documento lista **todo lo externo** que tenés que dar de alta, configurar y enlazar para que el producto funcione. Seguí el orden sugerido al final si es tu primera vez.

---

## Mapa rápido: qué habla con qué

| Componente | Conecta con |
|--------------|-------------|
| **API** (`apps/api`) | PostgreSQL, Redis, **Twilio WhatsApp** (chat), Meta WhatsApp (opcional / legado), R2, Mercado Pago |
| **Landing / Admin / Pro portal** | La API (`NEXT_PUBLIC_API_URL`) y, en landing, el número de WhatsApp |
| **Base de datos (Prisma)** | PostgreSQL (`DATABASE_URL`) |
| **Twilio** | Tu API pública (**POST** `https://TU-API/webhook/twilio`) |
| **Meta** | Tu API pública (webhook HTTPS `/webhook/whatsapp` — no es el que usa el envío del bot hoy) |
| **Mercado Pago** | Tu API pública (webhook HTTPS) |

---

## 1. PostgreSQL (base de datos)

**Para qué:** usuarios, profesionales, pedidos, cotizaciones, pagos, sesiones persistidas, leads, etc.

**Qué hacer:**

1. Crear una base PostgreSQL (local con Docker, [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), etc.).
2. Copiar la connection string (formato `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`).
3. Guardarla en **`packages/db/.env`** (recomendado) o en la raíz si tu flujo de Prisma la lee desde ahí:

   ```env
   DATABASE_URL="postgresql://..."
   ```

4. En la misma máquina donde corrés la API, la variable debe estar disponible: muchos equipos usan **un solo `.env` en `apps/api`** y duplican `DATABASE_URL` ahí, o usan un `.env` en la raíz del monorepo. Lo importante es que **`pnpm prisma`** y el **runtime de Node** vean el mismo valor.
5. Aplicar migraciones y generar el cliente:

   ```bash
   cd packages/db
   pnpm prisma migrate deploy   # o: prisma migrate dev (solo dev)
   pnpm prisma generate
   ```

6. Cargar datos demo (opcional):

   ```bash
   pnpm prisma db seed
   ```

**Checklist:** base creada → `DATABASE_URL` seteada → migrate OK → seed (opcional).

---

## 2. Redis

**Para qué:** sesiones del bot en tiempo real (`session:{phone}`), y config del sistema en admin (`system_config` en Redis).

**Qué hacer:**

1. Instalar Redis localmente o usar un servicio gestionado ([Upstash](https://upstash.com), Redis en Railway, etc.).
2. Obtener la URL, por ejemplo `redis://localhost:6379` o `rediss://...` (TLS). En **Railway**, usá la **URL pública** del servicio Redis (host tipo `*.proxy.rlwy.net` y puerto del proxy TCP), no el hostname interno de la red privada.
3. En **`apps/api/.env`**:

   ```env
   REDIS_URL=redis://localhost:6379
   ```

   En Railway, pegá la variable `REDIS_URL` / conexión pública que muestra el panel (incluye usuario y contraseña si aplica).

**Checklist:** Redis accesible desde donde corre la API → `REDIS_URL` en `.env` de la API.

---

## 3. Meta — WhatsApp Business Platform (Cloud API)

**Para qué:** recibir mensajes (webhook), enviar texto, botones y listas; validar firma de Meta.

**Qué hacer (alto nivel):**

1. Entrá a [Meta for Developers](https://developers.facebook.com/) y creá o usá una **app**.
2. Agregá el producto **WhatsApp**.
3. En el **WhatsApp Business Account**, obtené o configurá:
   - **Número de prueba o número de producción** conectado a la app.
4. Desde el panel de la app, copiá:
   - **Token de acceso temporal** o **de larga duración** del sistema → va en `WA_TOKEN`.
   - **Phone number ID** (ID del número que envía) → `WA_PHONE_ID`.
   - **App Secret** (configuración de la app) → `WA_APP_SECRET`.
5. Definí un **Verify token** propio (string secreto que inventás vos) → `WA_VERIFY_TOKEN`. Es el mismo valor que vas a poner en el panel de Meta al configurar el webhook.
6. En **`apps/api/.env`**:

   ```env
   WA_TOKEN=...
   WA_PHONE_ID=...
   WA_APP_SECRET=...
   WA_VERIFY_TOKEN=...
   ```

7. **Webhook (obligatorio en producción):**
   - URL callback: `https://TU-API-PUBLICA/webhook/whatsapp`
   - Suscripción de campos: al menos **messages** (y lo que pida tu flujo).
   - Meta hace un GET de verificación con `hub.verify_token` → debe coincidir con `WA_VERIFY_TOKEN`.

8. **Desarrollo local:** Meta necesita HTTPS público. Usá **ngrok**, **Cloudflare Tunnel**, o desplegá la API en un host con URL fija. Sin eso, el webhook no llega a tu máquina.

9. **Firma HMAC:** en producción no uses `WA_SKIP_SIGNATURE`. En local podés poner:

   ```env
   WA_SKIP_SIGNATURE=true
   ```

**Checklist:** app Meta + WhatsApp → tokens en `.env` → webhook apuntando a `/webhook/whatsapp` → verificación exitosa → probá mandar mensaje al número.

---

## 3b. Twilio — WhatsApp (chat del bot en producción)

**Para qué:** hoy el bot **recibe** los mensajes del usuario y **responde** por la API de Twilio (`WhatsAppService` en `apps/api`). Si el webhook de Twilio no llega a tu API, **el bot nunca arranca** (no es la landing ni Meta).

**Qué hacer:**

1. En [Twilio Console](https://console.twilio.com/), abrí el **número / sender de WhatsApp** que compraste (no solo SMS).
2. En **“When a message comes in”** (mensaje entrante), configurá la URL **HTTPS** de tu API, método **POST**, exactamente:

   `https://TU-API-PUBLICA/webhook/twilio`

   (misma base que usás en `API_PUBLIC_URL` en Railway, sin path extra).

3. En **`apps/api/.env`** (o variables en Railway):

   ```env
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1...   # o whatsapp:+1... — el mismo sender de WhatsApp
   ```

4. **Probar que la URL existe:** en el navegador abrí  
   `https://TU-API-PUBLICA/webhook/twilio`  
   Deberías ver texto plano tipo “Servy: webhook Twilio OK…”. Si da 404 o error de DNS/SSL, Twilio tampoco va a poder hacer POST.

5. **Logs de la API** al mandar un WhatsApp al número de Servy: debería aparecer `[twilio] parse` y luego `[twilio] mensaje`. Si ves `[twilio] parse: empty or skipped`, el body no llegó (proxy, URL equivocada, etc.).

6. **Twilio Debugger** (consola): mirá si el intento de webhook a tu URL falla (timeout, 403, 404, SSL).

**Checklist:** sender WhatsApp en Twilio → webhook POST a `/webhook/twilio` → GET a esa URL responde OK → variables `TWILIO_*` en el servicio de la API → probá mensaje y revisá logs.

---

## 4. Número de WhatsApp en la landing

**Para qué:** botones “Escribinos por WhatsApp” con link `wa.me/...`.

**Qué hacer:**

1. En **`apps/landing/.env.local`** (o variables en Vercel):

   ```env
   NEXT_PUBLIC_WA_NUMBER=5491112345678
   ```

   Sin `+`; con código país (Argentina suele ser `549` + código sin 0).

2. Rebuild de la landing si cambiás variables `NEXT_PUBLIC_*`.

**Checklist:** número real del negocio / bot → variable seteada → link correcto en la home.

---

## 5. Cloudflare R2 (almacenamiento de imágenes)

**Para qué:** subir fotos que manda el usuario por WhatsApp (y URLs firmadas para mostrarlas).

**Qué hacer:**

1. En [Cloudflare Dashboard](https://dash.cloudflare.com/) → R2 → creá un **bucket** (ej. `servy-user-uploads`).
2. Creá un **API token** / credenciales S3-compatible (Access Key ID + Secret).
3. Anotá **Account ID** (subdominio R2 suele ser `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
4. En **`apps/api/.env`**:

   ```env
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY=...
   R2_SECRET_KEY=...
   R2_BUCKET=nombre-del-bucket
   ```

5. (Recomendado) CORS del bucket: permitir el origen de tu API si hacés uploads desde el browser; para el flujo actual (API sube desde el servidor) suele bastar con que la API tenga red saliente a R2.

**Checklist:** bucket + keys → variables en API → probá flujo con imagen en WhatsApp (cuando el bot esté conectado).

---

## 6. Mercado Pago

**Para qué:** preferencias de pago, webhooks de pago aprobado/rechazado, reembolsos (admin).

**Qué hacer:**

1. Cuenta de [Mercado Pago](https://www.mercadopago.com.ar/) con **credenciales de producción** (o **test** para sandbox).
2. Obtené el **Access Token** del vendedor → `MP_ACCESS_TOKEN`.
3. Configurá el **webhook** en el panel de MP apuntando a:

   `https://TU-API-PUBLICA/webhook/mercadopago`

4. Guardá el secreto / configuración de firma que indique la doc actual de MP → `MP_WEBHOOK_SECRET` (el código aún valida de forma básica; completar según doc oficial cuando cierres producción).

5. En **`apps/api/.env`**:

   ```env
   API_PUBLIC_URL=https://api.tudominio.com
   FRONTEND_URL=https://tudominio.com
   MP_ACCESS_TOKEN=...
   MP_WEBHOOK_SECRET=...
   PAYMENTS_ENABLED=true
   ```

   Mientras no quieras cobrar: `PAYMENTS_ENABLED=false` (el bot no genera link de pago real; igual la API exige que existan valores en `MP_*` por el schema actual — podés usar placeholders en dev si tu arranque lo permite).

6. **Back URLs** de la preferencia usan `FRONTEND_URL` + `/payment/success|failure|pending` (esas rutas deben existir en el front o ajustar código).

**Checklist:** token MP → webhook URL pública → `API_PUBLIC_URL` coincide con la base de tu API → `PAYMENTS_ENABLED=true` cuando quieras cobrar → prueba en sandbox.

---

## 7. API Node (Express) — variables generales

Archivo de referencia: **`apps/api/.env.example`**. Copiá a **`apps/api/.env`** y completá.

| Variable | Acción |
|----------|--------|
| `PORT` | Puerto local (ej. `3000`). |
| `CORS_ORIGIN` | En prod: origen exacto del admin, portal y landing (o lista si extendés CORS). En dev `*` suele alcanzar. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Strings largos y aleatorios; **nunca** commitear. |
| `JWT_EXPIRES_IN` | Opcional (default `7d`). |
| `API_PUBLIC_URL` | URL **pública** de esta API (webhooks MP y referencias internas). |
| `FRONTEND_URL` | URL principal del sitio (back_urls de MP). |

**Checklist:** `.env` completo → `pnpm dev` o `node dist/index.js` sin errores de Zod al iniciar.

---

## 8. Frontends Next.js (landing, admin, pro-portal)

Cada app necesita saber dónde está la API.

**Qué hacer (cada una: landing, admin, pro-portal):**

1. Copiá el `.env.example` de la app a **`.env.local`** (Next.js carga esto en dev).
2. Seteá:

   ```env
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   ```

   En local, si la API corre en el puerto 3000:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Importante:** los navegadores llaman a la API desde el cliente; la API debe enviar **CORS** permitiendo el origen de cada front (`http://localhost:3001`, etc.).

**Puertos típicos en dev (ejemplo):**

- API: `3000`
- Landing: `3001`
- Admin: `3002`
- Pro portal: `3003`

Ajustá `CORS_ORIGIN` o implementá orígenes múltiples si hace falta (hoy el código usa un solo string).

**Checklist:** tres `.env.local` con `NEXT_PUBLIC_API_URL` → login admin/pro y formulario de leads funcionando contra la API.

---

## 9. Despliegue (resumen)

| Dónde | Qué subís |
|-------|-----------|
| **Railway / Render / Fly.io / VPS** | `apps/api` (build `tsc`, start `node dist/index.js`), con todas las env vars. |
| **Vercel** | `apps/landing`, `apps/admin`, `apps/pro-portal` como tres proyectos (o monorepo con root correcto). |
| **Dominios** | Ej. `servy.ar`, `admin.servy.ar`, `portal.servy.ar`, `api.servy.ar` → apuntar DNS a cada servicio. |

**Checklist:** API con HTTPS → webhooks Meta y MP actualizados con la URL final → fronts con `NEXT_PUBLIC_API_URL` de producción.

---

## 10. Opcionales / fases posteriores

| Servicio | Uso en el producto |
|----------|-------------------|
| **Resend** (u otro) | Emails (alertas admin, bienvenida). Aún no cableado en env obligatorio. |
| **Sentry / Axiom** | Errores y logs. Pendiente en código. |
| **Google Analytics** | Landing: reemplazar `G-XXXXXXXXXX` en `layout.tsx`. |

---

## Orden recomendado (primera vez)

1. PostgreSQL + `DATABASE_URL` → migraciones + seed.  
2. Redis + `REDIS_URL`.  
3. API levanta local con JWT y placeholders/dummy donde el schema lo permita.  
4. `NEXT_PUBLIC_API_URL` en los tres fronts → probá login admin y portal con usuario del seed.  
5. R2 → probá subida de medios cuando el bot esté activo.  
6. Meta WhatsApp → webhook con túnel HTTPS → sacá `WA_SKIP_SIGNATURE` en prod.  
7. Mercado Pago → `API_PUBLIC_URL` + webhook + `PAYMENTS_ENABLED=true`.  
8. Deploy producción y actualizar todas las URLs.

---

## Verificación final (checklist corto)

- [ ] `DATABASE_URL` + migraciones aplicadas.  
- [ ] `REDIS_URL` y API sin errores al usar el bot.  
- [ ] WhatsApp: token, phone id, secret, verify token, webhook verificado.  
- [ ] R2: bucket y credenciales.  
- [ ] MP: token, webhook, `API_PUBLIC_URL`, `PAYMENTS_ENABLED` según entorno.  
- [ ] Los tres fronts con `NEXT_PUBLIC_API_URL` correcto y CORS en la API.  
- [ ] Landing con `NEXT_PUBLIC_WA_NUMBER`.  

Si algo falla, revisá los logs de arranque de la API (Zod lista variables inválidas) y la consola del navegador (CORS / 401).
