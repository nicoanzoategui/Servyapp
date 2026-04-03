import { Request, Response, NextFunction } from 'express';

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/**
 * Rate limit por IP (memoria). Suficiente para MVP; en producción usar Redis.
 */
export function rateLimit(options: { windowMs: number; max: number; keyPrefix?: string }) {
    const { windowMs, max, keyPrefix = 'rl' } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();
        let e = buckets.get(key);
        if (!e || now >= e.resetAt) {
            e = { count: 0, resetAt: now + windowMs };
            buckets.set(key, e);
        }
        e.count += 1;
        if (e.count > max) {
            const retry = Math.ceil((e.resetAt - now) / 1000);
            return res.status(429).json({
                success: false,
                error: { code: 'RATE_LIMIT', message: `Demasiados intentos. Probá de nuevo en ${retry}s.` },
            });
        }
        next();
    };
}
