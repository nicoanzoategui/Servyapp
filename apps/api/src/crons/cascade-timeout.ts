import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import { CascadeQueueService } from '../services/cascade-queue.service';

/**
 * Cron que revisa timeouts de ofertas de cascada
 * Corre cada 1 minuto
 */
export async function processCascadeTimeouts() {
    try {
        const now = new Date();

        // Buscar ofertas pendientes que ya expiraron
        const expiredOffers = await prisma.jobOffer.findMany({
            where: {
                status: 'pending',
                timeout_at: {
                    lte: now,
                },
            },
            include: {
                service_request: true,
            },
        });

        if (expiredOffers.length === 0) {
            return;
        }

        console.log(`[CascadeTimeout] Found ${expiredOffers.length} expired offers`);

        for (const offer of expiredOffers) {
            // Verificar que realmente expiró (doble check)
            const timeoutKey = `cascade:timeout:${offer.id}`;
            const exists = await redis.exists(timeoutKey);

            if (exists === 0) {
                // Ya fue procesado manualmente (aceptado/rechazado)
                continue;
            }

            console.log(`[CascadeTimeout] Processing timeout for offer ${offer.id}`);

            // Procesar timeout
            await CascadeQueueService.rejectOrTimeout(offer.id, offer.professional_id, 'timeout');

            // Limpiar key de Redis
            await redis.del(timeoutKey);
        }

        console.log(`[CascadeTimeout] Processed ${expiredOffers.length} timeouts`);
    } catch (error) {
        console.error('[CascadeTimeout] Error:', error);
    }
}
