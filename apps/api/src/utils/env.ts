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
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const env = _env.data;
