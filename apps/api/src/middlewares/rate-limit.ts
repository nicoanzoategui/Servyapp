import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis';

export const whatsappRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        const from = (req.body as { From?: unknown } | undefined)?.From;
        if (typeof from === 'string' && from.length > 0) return from;
        return 'unknown';
    },
    skip: () => false,
    store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args) }),
    message: { error: 'Demasiados mensajes. Esperá un momento.' },
});

export const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: () => 'global',
    store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args) }),
});

export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: () => 'global',
    store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args) }),
});
