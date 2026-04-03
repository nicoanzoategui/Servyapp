import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

// Cuando Redis no está disponible, ioredis reintenta y spamea logs.
// Para que el desarrollo sea usable, se throttlea el error.
let lastRedisErrorLogAt = 0;
redis.on('error', (err) => {
    const now = Date.now();
    if (now - lastRedisErrorLogAt > 20_000) {
        lastRedisErrorLogAt = now;
        console.warn('Redis error (throttled):', err?.message || err);
    }
});

let hasLoggedConnect = false;
redis.on('connect', () => {
    if (!hasLoggedConnect) {
        hasLoggedConnect = true;
        console.log('Redis connected successfully');
    }
});
