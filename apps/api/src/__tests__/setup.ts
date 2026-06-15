import { vi } from 'vitest';

// Configurar env vars de prueba para evitar fallos de Zod env validation
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars!!';
process.env.WA_TOKEN = 'dummy';
process.env.WA_PHONE_ID = 'dummy';
process.env.WA_APP_SECRET = 'dummy';
process.env.WA_VERIFY_TOKEN = 'dummy';
process.env.TWILIO_ACCOUNT_SID = 'AC0000000000000000000000000000000';
process.env.TWILIO_AUTH_TOKEN = 'dummy';
process.env.TWILIO_PHONE_NUMBER = 'whatsapp:+10000000000';
process.env.R2_ACCOUNT_ID = 'dummy';
process.env.R2_ACCESS_KEY = 'dummy';
process.env.R2_SECRET_KEY = 'dummy';
process.env.R2_BUCKET = 'dummy';
process.env.MP_ACCESS_TOKEN = 'dummy';
process.env.MP_WEBHOOK_SECRET = 'dummy';
process.env.RESEND_API_KEY = 're_test_dummy';
process.env.RESEND_FROM_EMAIL = 'noreply@example.com';
process.env.FRONTEND_PRO_URL = 'http://localhost:3003';
process.env.GEMINI_API_KEY = 'dummy-gemini-key-for-tests';

// Mock de Redis in-memory
const redisStore = new Map<string, string>();
vi.mock('ioredis', () => {
    return {
        default: class {
            get = vi.fn(async (key: string) => redisStore.get(key) || null);
            set = vi.fn(async (key: string, value: string, mode?: string, duration?: number) => {
                redisStore.set(key, value);
                return 'OK';
            });
            del = vi.fn(async (key: string) => {
                const existed = redisStore.has(key);
                redisStore.delete(key);
                return existed ? 1 : 0;
            });
            keys = vi.fn(async (pattern: string) => {
                return Array.from(redisStore.keys());
            });
            on = vi.fn();
        },
    };
});

// Mock de AWS SDK y Resend
vi.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: class {
            send = vi.fn();
        },
        PutObjectCommand: class {},
    };
});

vi.mock('resend', () => {
    return {
        Resend: class {
            emails = {
                send: vi.fn().mockResolvedValue({ id: 'dummy-email-id' }),
            };
        },
    };
});

// Mock de Twilio
vi.mock('twilio', () => {
    const mockClient = {
        messages: {
            create: vi.fn().mockResolvedValue({
                sid: 'SMmocked',
                status: 'sent',
            }),
        },
    };
    const twilioFn = () => mockClient;
    return {
        default: twilioFn,
    };
});
