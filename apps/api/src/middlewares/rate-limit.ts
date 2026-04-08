import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis';

const sendCommand = (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as Promise<import('rate-limit-redis').RedisReply>;

/** Webhook WhatsApp (Twilio): 10 mensajes por minuto por número de origen. */
export const whatsappRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        const from = (req.body as { From?: string })?.From;
        if (from != null && String(from).trim() !== '') return String(from);
        return req.ip != null ? ipKeyGenerator(req.ip) : 'unknown';
    },
    store: new RedisStore({ sendCommand }),
    message: { error: 'Demasiados mensajes. Esperá un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => (req.ip != null ? ipKeyGenerator(req.ip) : 'unknown'),
    store: new RedisStore({ sendCommand }),
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => (req.ip != null ? ipKeyGenerator(req.ip) : 'unknown'),
    store: new RedisStore({ sendCommand }),
    standardHeaders: true,
    legacyHeaders: false,
});
