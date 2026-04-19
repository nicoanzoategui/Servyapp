import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    CORS_ORIGIN: z.string().default('*'),
    FRONTEND_URL: z.string().url().default('http://localhost:3001'),
    /** URL pública de esta API (para webhooks MP). Ej: https://api.servy.ar */
    API_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default('7d'),
    WA_TOKEN: z.string().min(1),
    WA_PHONE_ID: z.string().min(1),
    WA_APP_SECRET: z.string().min(1),
    WA_VERIFY_TOKEN: z.string().min(1),
    TWILIO_ACCOUNT_SID: z.string().min(1),
    TWILIO_AUTH_TOKEN: z.string().min(1),
    TWILIO_PHONE_NUMBER: z.string().min(1),
    /** true = loguea payload Twilio completo en webhook (solo debugging). */
    TWILIO_WEBHOOK_DEBUG: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY: z.string().min(1),
    R2_SECRET_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    MP_ACCESS_TOKEN: z.string().min(1),
    MP_WEBHOOK_SECRET: z.string().min(1),
    /** Si false, al aceptar cotización no se llama a MP (solo mensaje placeholder). */
    PAYMENTS_ENABLED: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    /** Solo desarrollo: saltar validación HMAC del webhook de WhatsApp. */
    WA_SKIP_SIGNATURE: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().min(1),
    /** URL del portal profesional (links en emails set/reset password). */
    FRONTEND_PRO_URL: z.string().url(),
    GEMINI_API_KEY: z.string().min(1),
    /** Alias opcional del spec; si viene, sobreescribe GEMINI_API_KEY para Gemini. */
    GOOGLE_AI_API_KEY: z.string().optional().default(''),
    MERCADOLIBRE_API_URL: z.string().url().optional().default('https://api.mercadolibre.com'),
    APIFY_API_TOKEN: z.string().optional().default(''),
    META_AD_ACCOUNT_ID: z.string().optional().default(''),
    META_SYSTEM_USER_TOKEN: z.string().optional().default(''),
    /** ID numérico de la página de Facebook (requerido para link ads / creatives). */
    META_PAGE_ID: z.string().optional().default(''),
    /**
     * Si true, ante `payment_anomaly` high se intenta reembolso total en Mercado Pago (peligroso en prod).
     * Por defecto solo se marca `fraud_hold` en DB y se registra alerta.
     */
    MP_AUTO_REFUND_FRAUD: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    /**
     * Ofertas `pending` más viejas que esto se cancelan (cron cada 5 min).
     * Default 180: da margen a que el cliente elija técnico y al pro aceptar/cotizar.
     */
    JOB_OFFER_PENDING_EXPIRE_MINUTES: z
        .string()
        .optional()
        .transform((v) => {
            const n = parseInt(String(v || ''), 10);
            return Number.isFinite(n) && n >= 15 ? n : 180;
        }),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const env = _env.data;
