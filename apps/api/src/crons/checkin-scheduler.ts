import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import { WhatsAppService } from '../services/whatsapp.service';
import { insertAgentLog } from '../lib/agent-log';

/**
 * Recordatorios de check-in para profesionales marcados activos en Redis sin sesión del día.
 */
export async function runCheckinScheduler(): Promise<void> {
    const keys = await redis.keys('provider:status:*').catch(() => [] as string[]);
    const activeIds: string[] = [];
    for (const k of keys.slice(0, 100)) {
        const st = await redis.get(k).catch(() => null);
        if (st === 'active' || st === 'active_no_location') {
            activeIds.push(k.replace('provider:status:', ''));
        }
    }

    const today = new Date().toISOString().slice(0, 10);
    let sentThisRun = 0;
    for (const pid of activeIds) {
        if (sentThisRun >= 15) break;
        const ck = await redis.get(`checkin:scheduled:${pid}:${today}`).catch(() => null);
        if (ck === 'sent') continue;

        const pro = await prisma.professional.findUnique({ where: { id: pid } });
        if (!pro) continue;

        await WhatsAppService.sendTextMessage(
            pro.phone,
            'Servy: ¿seguís disponible para trabajos ahora? Respondé “disponible” o “listo por hoy” si cerrás turno.'
        );
        try {
            await redis.set(`checkin:scheduled:${pid}:${today}`, 'sent', 'EX', 86400);
        } catch {
            /* */
        }
        sentThisRun += 1;
        await insertAgentLog({
            agent: 'availability',
            event: 'checkin_ping',
            level: 'info',
            entityType: 'provider',
            entityId: pid,
        });
    }
}
