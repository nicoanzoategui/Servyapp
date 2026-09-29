import { prisma } from '@servy/db';
import { insertAgentLog } from '../lib/agent-log';
import { redis } from '../utils/redis';
import { userRelayPauseRedisKey } from '../utils/twilio-phone';
import { formatClientChosenSchedule } from './manual-assignment.service';
import { WhatsAppService } from './whatsapp.service';

export type CancellablePaidVisit = {
    jobId: string;
    jobOfferId: string;
    requestId: string;
    paymentId: string | null;
    paymentAmount: number | null;
    address: string | null;
    professionalPhone: string | null;
    whenLabel: string;
};

export function isUserCancelCommand(text: string): boolean {
    const n = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return n.includes('cancelar');
}

export function isVisitCancelConfirmChoice(text: string): boolean {
    const n = text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return n === '1' || n === '1.' || n === '1)' || n === 'si, cancelar' || n === 'si cancelar';
}

export async function findPostPayCancellableVisit(userPhone: string): Promise<CancellablePaidVisit | null> {
    const job = await prisma.job.findFirst({
        where: {
            status: { in: ['confirmed', 'in_progress'] },
            arrival_confirmed_at: null,
            quotation: {
                quotation_type: 'visit',
                payment: { status: 'approved' },
                job_offer: { service_request: { user_phone: userPhone } },
            },
        },
        include: {
            quotation: {
                include: {
                    payment: true,
                    job_offer: { include: { professional: true, service_request: true } },
                },
            },
        },
        orderBy: { updated_at: 'desc' },
    });
    if (!job) return null;

    const offer = job.quotation.job_offer;
    const sr = offer.service_request;
    return {
        jobId: job.id,
        jobOfferId: offer.id,
        requestId: sr.id,
        paymentId: job.quotation.payment?.id ?? null,
        paymentAmount: job.quotation.payment?.amount ?? null,
        address: sr.address,
        professionalPhone: offer.professional_id ? offer.professional?.phone ?? null : null,
        whenLabel: formatClientChosenSchedule({
            scheduled_slot: sr.scheduled_slot,
            scheduled_date: sr.scheduled_date,
            offerSchedule: offer.schedule,
        }),
    };
}

export async function executePostPayVisitCancel(visit: CancellablePaidVisit): Promise<
    | { ok: true }
    | { ok: false; reason: 'arrival_confirmed' | 'not_found' }
> {
    const job = await prisma.job.findUnique({
        where: { id: visit.jobId },
        include: {
            quotation: {
                include: {
                    payment: true,
                    job_offer: { include: { professional: true, service_request: true } },
                },
            },
        },
    });
    if (!job || !['confirmed', 'in_progress'].includes(job.status)) {
        return { ok: false, reason: 'not_found' };
    }
    if (job.arrival_confirmed_at) {
        return { ok: false, reason: 'arrival_confirmed' };
    }

    const offer = job.quotation.job_offer;
    const payment = job.quotation.payment;

    await prisma.$transaction([
        prisma.job.update({
            where: { id: job.id },
            data: { status: 'cancelled' },
        }),
        prisma.serviceRequest.update({
            where: { id: offer.request_id },
            data: { status: 'cancelled_by_user' },
        }),
        prisma.jobOffer.update({
            where: { id: offer.id },
            data: { status: 'cancelled' },
        }),
        ...(payment?.status === 'approved'
            ? [
                  prisma.payment.update({
                      where: { id: payment.id },
                      data: { status: 'refund_pending' },
                  }),
              ]
            : []),
    ]);

    if (offer.professional_id && offer.professional?.phone) {
        const addr = offer.service_request.address?.trim() || 'la dirección coordinada';
        await WhatsAppService.sendTextMessage(
            offer.professional.phone,
            `❌ El cliente canceló esta visita: ${addr}. No hace falta que vayas.`
        );
    }

    try {
        await redis.set(userRelayPauseRedisKey(offer.service_request.user_phone), '1', 'EX', 7 * 24 * 60 * 60);
    } catch {
        /* ignore */
    }

    await insertAgentLog({
        agent: 'messaging',
        event: 'visit_refund_pending',
        level: 'warn',
        entityType: 'job',
        entityId: job.id,
        details: {
            jobId: job.id,
            paymentId: payment?.id ?? null,
            amount: payment?.amount ?? null,
            userPhone: offer.service_request.user_phone,
            professionalId: offer.professional_id,
            reason: 'client_cancel_before_arrival',
            refund: 'manual',
        },
    });

    return { ok: true };
}
