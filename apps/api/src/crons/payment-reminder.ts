import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import { env } from '../utils/env';
import { WhatsAppService } from '../services/whatsapp.service';

const REDIS_OP_TIMEOUT_MS = 500;
const REMINDER_TTL_SEC = 24 * 60 * 60;

function paymentReminderRedisKey(paymentId: string): string {
    return `payment_reminder_sent:${paymentId}`;
}

async function withRedisTimeout<T>(p: Promise<T>, ms = REDIS_OP_TIMEOUT_MS): Promise<T> {
    let id: ReturnType<typeof setTimeout> | undefined;
    const t = new Promise<T>((_, r) => {
        id = setTimeout(() => r(new Error('timeout')), ms);
    });
    return Promise.race([p, t]).finally(() => {
        if (id) clearTimeout(id);
    });
}

async function getPreferenceInitPoint(preferenceId: string): Promise<string | null> {
    try {
        const res = await fetch(
            `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(preferenceId)}`,
            { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { init_point?: string };
        return body.init_point ?? null;
    } catch (e) {
        console.error('[payment-reminder] MP preference get failed', e);
        return null;
    }
}

/**
 * Recordatorio de pago pendiente (20 min – 24 h desde cotización).
 */
export async function runPaymentReminder(): Promise<void> {
    const now = Date.now();
    const minAge = new Date(now - 20 * 60 * 1000);
    const maxAge = new Date(now - 24 * 60 * 60 * 1000);

    const payments = await prisma.payment.findMany({
        where: {
            status: 'pending',
            mp_preference_id: { not: null },
            quotation: {
                created_at: { lte: minAge, gte: maxAge },
            },
        },
        include: {
            quotation: {
                include: {
                    job_offer: { include: { professional: true, service_request: true } },
                },
            },
        },
    });

    for (const payment of payments) {
        const quotationId = payment.quotation_id;
        const existingJob = await prisma.job.findUnique({ where: { quotation_id: quotationId } });
        if (existingJob) continue;

        const reminderKey = paymentReminderRedisKey(payment.id);
        try {
            const sent = await withRedisTimeout(redis.get(reminderKey));
            if (sent) continue;
        } catch {
            continue;
        }

        const prefId = payment.mp_preference_id;
        if (!prefId) continue;

        const link = await getPreferenceInitPoint(prefId);
        if (!link) continue;

        const userPhone = payment.quotation.job_offer.service_request.user_phone;
        const proName = payment.quotation.job_offer.professional.name.trim() || 'Tu técnico';

        await WhatsAppService.sendTextMessage(
            userPhone,
            `⏰ *Todavía tenés un pago pendiente.*\n\n*${proName}* está esperando confirmación para tu servicio.\n\nCompletá el pago acá:\n👉 ${link}\n\n_Si ya no querés continuar, escribí cancelar._`
        );

        try {
            await withRedisTimeout(redis.set(reminderKey, '1', 'EX', REMINDER_TTL_SEC));
        } catch {
            /* ignore */
        }
    }
}
