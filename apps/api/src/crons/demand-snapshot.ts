import { prisma } from '@servy/db';
import { redis } from '../utils/redis';

/**
 * Refresca contadores en Redis a partir de pedidos recientes (últimos 35 min).
 */
export async function takeDemandSnapshot(): Promise<void> {
    const rows = await prisma.$queryRaw<{ category: string | null; zone: string | null; c: bigint }[]>`
        SELECT sr.category, COALESCE(sr.address, 'unknown') AS zone, COUNT(*)::bigint AS c
        FROM service_requests sr
        WHERE sr.created_at >= now() - interval '35 minutes'
          AND sr.status = 'pending'
          AND sr.category IS NOT NULL
        GROUP BY sr.category, COALESCE(sr.address, 'unknown')
    `;

    for (const row of rows) {
        const cat = row.category || 'general';
        const zone = row.zone || 'unknown';
        const n = Number(row.c);
        try {
            await redis.set(`pricing:demand:${cat}:${zone}`, String(n), 'EX', 35 * 60);
        } catch {
            /* */
        }
    }
}
