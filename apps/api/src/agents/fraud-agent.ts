import { prisma } from '@servy/db';
import { env } from '../utils/env';
import { insertAgentLog } from '../lib/agent-log';
import { MercadoPagoService } from '../services/mercadopago.service';

async function alertExists(entityType: string, entityId: string, alertType: string): Promise<boolean> {
    const r = await prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c FROM fraud_alerts
        WHERE entity_type = ${entityType}
          AND entity_id = ${entityId}
          AND alert_type = ${alertType}
          AND status = 'pending'
    `;
    return Number(r[0]?.c ?? 0) > 0;
}

export async function runFraudScans(): Promise<void> {
    const started = Date.now();

    const repeatUsers = await prisma.$queryRaw<{ user_phone: string; category: string; c: bigint }[]>`
        SELECT user_phone, category, COUNT(*)::bigint AS c
        FROM service_requests
        WHERE created_at >= now() - interval '7 days'
          AND category IS NOT NULL
        GROUP BY user_phone, category
        HAVING COUNT(*) >= 3
    `;

    for (const row of repeatUsers) {
        const id = `repeat:${row.user_phone}:${row.category}`;
        if (await alertExists('user', row.user_phone, 'repeat_user_same_service')) continue;
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('user', $1, 'repeat_user_same_service', 'low', $2, $3::jsonb)`,
            row.user_phone,
            `Usuario pidió ${row.c} veces ${row.category} en 7 días`,
            JSON.stringify({ category: row.category, count: Number(row.c) })
        );
    }

    const paymentAnomalies = await prisma.$queryRaw<{ quotation_id: string; job_id: string | null }[]>`
        SELECT p.quotation_id, j.id AS job_id
        FROM payments p
        LEFT JOIN jobs j ON j.quotation_id = p.quotation_id
        WHERE p.status = 'approved'
          AND p.paid_at IS NOT NULL
          AND p.paid_at < now() - interval '24 hours'
          AND (j.id IS NULL OR j.status != 'completed')
        LIMIT 50
    `;

    for (const row of paymentAnomalies) {
        const eid = row.job_id ?? `q:${row.quotation_id}`;
        if (await alertExists('job', eid, 'payment_anomaly')) continue;

        const payment = await prisma.payment.findUnique({ where: { quotation_id: row.quotation_id } });
        if (payment?.status === 'fraud_hold') continue;

        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('job', $1, 'payment_anomaly', 'high', $2, $3::jsonb)`,
            eid,
            'Pago aprobado sin trabajo completado tras 24h',
            JSON.stringify({ quotation_id: row.quotation_id })
        );

        await prisma.payment.updateMany({
            where: { quotation_id: row.quotation_id, status: 'approved' },
            data: { status: 'fraud_hold' },
        });

        await insertAgentLog({
            agent: 'fraud',
            event: 'payment_fraud_hold',
            level: 'error',
            entityType: 'job',
            entityId: eid,
            details: {
                quotation_id: row.quotation_id,
                mp_payment_id: payment?.mp_payment_id,
                message: 'Pago marcado fraud_hold — revisar en admin / Mercado Pago',
            },
        });

        if (env.MP_AUTO_REFUND_FRAUD && payment?.mp_payment_id) {
            try {
                await MercadoPagoService.refundByMpPaymentId(payment.mp_payment_id);
                await prisma.payment.updateMany({
                    where: { quotation_id: row.quotation_id },
                    data: { status: 'refunded' },
                });
                await insertAgentLog({
                    agent: 'fraud',
                    event: 'payment_auto_refund',
                    level: 'warn',
                    details: { quotation_id: row.quotation_id },
                });
            } catch (e) {
                await insertAgentLog({
                    agent: 'fraud',
                    event: 'payment_auto_refund_failed',
                    level: 'error',
                    details: { quotation_id: row.quotation_id, message: String(e) },
                });
            }
        }
    }

    const ratingSpikes = await prisma.$queryRaw<{ provider_id: string; cnt: bigint }[]>`
        SELECT provider_id, COUNT(*)::bigint AS cnt
        FROM quality_reviews
        WHERE stars = 5
          AND responded_at IS NOT NULL
          AND responded_at >= now() - interval '72 hours'
        GROUP BY provider_id
        HAVING COUNT(*) >= 5
    `;

    for (const row of ratingSpikes) {
        if (await alertExists('provider', row.provider_id, 'rating_manipulation')) continue;
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('provider', $1, 'rating_manipulation', 'medium', $2, $3::jsonb)`,
            row.provider_id,
            'Muchas reseñas 5★ en ventana corta (posible manipulación)',
            JSON.stringify({ count_5_star_72h: Number(row.cnt) })
        );
    }

    const tooFastAfterPay = await prisma.$queryRaw<{ id: string; professional_id: string; sec: number }[]>`
        SELECT j.id, jo.professional_id,
               EXTRACT(EPOCH FROM (j.completed_at - p.paid_at))::int AS sec
        FROM jobs j
        JOIN quotations q ON q.id = j.quotation_id
        JOIN job_offers jo ON jo.id = q.job_offer_id
        JOIN payments p ON p.quotation_id = q.id
        WHERE j.status = 'completed'
          AND j.completed_at IS NOT NULL
          AND p.paid_at IS NOT NULL
          AND p.status = 'approved'
          AND j.completed_at > p.paid_at
          AND j.completed_at < p.paid_at + interval '25 minutes'
          AND j.completed_at >= now() - interval '30 days'
        LIMIT 40
    `;

    for (const row of tooFastAfterPay) {
        if (await alertExists('job', row.id, 'impossible_time')) continue;
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('job', $1, 'impossible_time', 'high', $2, $3::jsonb)`,
            row.id,
            'Trabajo marcado completado muy poco después del pago aprobado',
            JSON.stringify({ seconds_after_payment: row.sec, professional_id: row.professional_id })
        );
    }

    const fastCompletions = await prisma.$queryRaw<{ id: string; professional_id: string; seconds: number }[]>`
        SELECT j.id, jo.professional_id,
               EXTRACT(EPOCH FROM (j.completed_at - j.scheduled_at))::int AS seconds
        FROM jobs j
        JOIN quotations q ON q.id = j.quotation_id
        JOIN job_offers jo ON jo.id = q.job_offer_id
        WHERE j.status = 'completed'
          AND j.completed_at IS NOT NULL
          AND j.scheduled_at IS NOT NULL
          AND j.completed_at >= now() - interval '30 days'
          AND j.completed_at < j.scheduled_at + interval '10 minutes'
        LIMIT 30
    `;

    for (const row of fastCompletions) {
        if (await alertExists('job', row.id, 'impossible_time')) continue;
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('job', $1, 'impossible_time', 'medium', $2, $3::jsonb)`,
            row.id,
            'Trabajo marcado completado muy poco después de agendar',
            JSON.stringify({ seconds: row.seconds, professional_id: row.professional_id })
        );
    }

    const maxPricePattern = await prisma.$queryRaw<{ provider_id: string; cnt: bigint }[]>`
        SELECT provider_id, COUNT(*)::bigint AS cnt
        FROM price_quotes
        WHERE provider_id IS NOT NULL
          AND price_chosen IS NOT NULL
          AND range_max IS NOT NULL
          AND price_chosen >= range_max * 0.999
          AND created_at >= now() - interval '30 days'
        GROUP BY provider_id
        HAVING COUNT(*) >= 5
    `;

    for (const row of maxPricePattern) {
        if (await alertExists('provider', row.provider_id, 'price_always_max')) continue;
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('provider', $1, 'price_always_max', 'medium', $2, $3::jsonb)`,
            row.provider_id,
            'Varias cotizaciones aceptadas al máximo del rango',
            JSON.stringify({ count: Number(row.cnt) })
        );
    }

    await insertAgentLog({
        agent: 'fraud',
        event: 'scan_complete',
        level: 'info',
        durationMs: Date.now() - started,
    });
}
