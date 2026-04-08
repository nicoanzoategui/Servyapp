import Redis from 'ioredis';
import { env } from './env';

/**
 * Cliente para uso general (sesiones, caché, rate limit, chat log, etc.).
 * Mantiene el comportamiento por defecto de ioredis (p. ej. maxRetriesPerRequest acotado).
 */
export const redis = new Redis(env.REDIS_URL);

/**
 * Cliente dedicado a BullMQ. Debe usar maxRetriesPerRequest: null (requisito de BullMQ).
 * No usar para comandos normales como rpush/lrange si se quiere evitar el modo "sin límite de reintentos por comando".
 */
export const bullRedis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

function attachThrottledErrorLog(client: Redis, label: string): void {
    let lastRedisErrorLogAt = 0;
    client.on('error', (err) => {
        const now = Date.now();
        if (now - lastRedisErrorLogAt > 20_000) {
            lastRedisErrorLogAt = now;
            console.warn(`Redis error [${label}] (throttled):`, err?.message || err);
        }
    });
}

attachThrottledErrorLog(redis, 'default');
attachThrottledErrorLog(bullRedis, 'bullmq');

let defaultConnectLogged = false;
redis.on('connect', () => {
    if (!defaultConnectLogged) {
        defaultConnectLogged = true;
        console.log('Redis (default) connected successfully');
    }
});

let bullConnectLogged = false;
bullRedis.on('connect', () => {
    if (!bullConnectLogged) {
        bullConnectLogged = true;
        console.log('Redis (bullmq) connected successfully');
    }
});
