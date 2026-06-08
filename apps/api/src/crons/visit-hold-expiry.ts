import { prisma } from '@servy/db';
import { env } from '../utils/env';
import { WhatsAppService } from '../services/whatsapp.service';
import { redis } from '../utils/redis';

const SESSION_TTL = 60 * 60 * 24;

/** Expira ofertas en held sin pago y pending sin confirmación técnica. */
export async function runVisitHoldExpiry(): Promise<void> {
    const now = new Date();
    const paymentCutoff = new Date(now.getTime() - env.VISIT_PAYMENT_EXPIRE_MINUTES * 60 * 1000);
    const confirmCutoff = new Date(now.getTime() - env.TECH_CONFIRM_TIMEOUT_MINUTES * 60 * 1000);

    const heldOffers = await prisma.jobOffer.findMany({
        where: {
            status: 'held',
            created_at: { lte: paymentCutoff },
        },
        include: { service_request: true, professional: true },
    });

    for (const offer of heldOffers) {
        await prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'expired' } });
        const visitQ = await prisma.quotation.findFirst({
            where: { job_offer_id: offer.id, quotation_type: 'visit' },
            include: { payment: true },
        });
        if (visitQ?.payment?.status === 'pending') {
            await prisma.payment.update({ where: { id: visitQ.payment.id }, data: { status: 'expired' } });
        }
        await WhatsAppService.sendTextMessage(
            offer.service_request.user_phone,
            '⏰ La reserva de visita venció porque no se completó el pago a tiempo.\n\nEscribí cuando quieras hacer un nuevo pedido.'
        ).catch(() => {});
        await WhatsAppService.sendTextMessage(
            offer.professional.phone,
            'La reserva de visita expiró (el cliente no pagó a tiempo). Ya podés recibir nuevos pedidos.'
        ).catch(() => {});
        try {
            await redis.del(`session:${offer.service_request.user_phone}`);
            await redis.del(`pro_session:${offer.professional.phone}`);
        } catch {
            /* ignore */
        }
        await prisma.whatsappSession.delete({ where: { phone: offer.service_request.user_phone } }).catch(() => {});
    }

    const pendingOffers = await prisma.jobOffer.findMany({
        where: {
            status: 'pending',
            created_at: { lte: confirmCutoff },
        },
        include: { service_request: true },
    });

    for (const offer of pendingOffers) {
        const req = offer.service_request;
        if (req.status !== 'awaiting_tech') continue;

        await prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'expired' } });

        const session = await prisma.whatsappSession.findUnique({ where: { phone: req.user_phone } });
        if (session?.step === 'AWAITING_TECH_CONFIRMATION') {
            const { VisitFlowService } = await import('../services/visit-flow.service');
            const data = (session.data_json as Record<string, unknown>) || {};
            data.excludedProIds = [...((data.excludedProIds as string[]) || []), offer.professional_id];
            await VisitFlowService.finalizeScheduleAndAssignTech(req.user_phone, data);
        }
    }
}
