import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL);

let lastRedisErrorLogAt = 0;
redis.on('error', (err) => {
    const now = Date.now();
    if (now - lastRedisErrorLogAt > 20_000) {
        lastRedisErrorLogAt = now;
        console.warn('Redis error (throttled):', err?.message || err);
    }
});

redis.on('connect', () => {
    console.log('Redis connected successfully');
});
