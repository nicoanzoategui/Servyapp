import { prisma } from '@servy/db';
import { VisitFlowService } from './visit-flow.service';
import { formatArs } from './visit-pricing';

export { isRepairQuoteCommand, parseRepairAmount } from './repair-quote-parse';

export type EligibleRepairJob = {
    jobId: string;
    jobOfferId: string;
    requestId: string;
    professionalId: string;
    professionalPhone: string;
    professionalName: string;
};

export function formatRepairAmountConfirmForTech(techAmount: number): string {
    return (
        `💰 *Confirmá el presupuesto*\n\n` +
        `El cliente indicó que cotizaste *$${formatArs(techAmount)}* para el arreglo.\n\n` +
        `1. Sí, es correcto\n` +
        `2. No, es otro monto`
    );
}

export async function findActiveRepairJobForUser(userPhone: string): Promise<{
    job: EligibleRepairJob | null;
    repairQuoteStatus: string | null;
    hasAssignedTech: boolean;
    hasPaidVisit: boolean;
}> {
    const job = await prisma.job.findFirst({
        where: {
            status: { in: ['confirmed', 'in_progress'] },
            quotation: {
                job_offer: {
                    service_request: { user_phone: userPhone },
                },
            },
        },
        include: {
            quotation: {
                include: {
                    job_offer: {
                        include: {
                            professional: true,
                            service_request: true,
                            quotations: { select: { quotation_type: true, status: true } },
                        },
                    },
                },
            },
        },
        orderBy: { id: 'desc' },
    });
    if (!job) {
        return { job: null, repairQuoteStatus: null, hasAssignedTech: false, hasPaidVisit: false };
    }

    const offer = job.quotation.job_offer;
    const repair = offer.quotations.find((q) => q.quotation_type === 'repair');
    const proId = offer.professional_id;
    const proPhone = offer.professional?.phone;
    if (!proId || !proPhone) {
        return {
            job: null,
            repairQuoteStatus: repair?.status ?? null,
            hasAssignedTech: false,
            hasPaidVisit: true,
        };
    }

    return {
        hasAssignedTech: true,
        hasPaidVisit: true,
        repairQuoteStatus: repair?.status ?? null,
        job: {
            jobId: job.id,
            jobOfferId: offer.id,
            requestId: offer.request_id,
            professionalId: proId,
            professionalPhone: proPhone,
            professionalName: offer.professional?.name?.trim() || 'el técnico',
        },
    };
}

export async function createRepairQuotationAndNotifyClient(args: {
    jobOfferId: string;
    requestId: string;
    userPhone: string;
    techAmount: number;
}): Promise<{ ok: true; quotationId: string } | { ok: false; reason: 'already_quoted' | 'error' }> {
    const existing = await prisma.quotation.findFirst({
        where: { job_offer_id: args.jobOfferId, quotation_type: 'repair' },
        select: { id: true },
    });
    if (existing) return { ok: false, reason: 'already_quoted' };

    try {
        const quotation = await prisma.quotation.create({
            data: {
                job_offer_id: args.jobOfferId,
                quotation_type: 'repair',
                items_json: [{ description: 'Arreglo in situ', price: args.techAmount }],
                total_price: args.techAmount,
                description: 'Arreglo in situ',
                estimated_duration: 'A coordinar',
                status: 'pending',
            },
        });
        await prisma.jobOffer.update({
            where: { id: args.jobOfferId },
            data: { status: 'quoted' },
        });
        await VisitFlowService.afterRepairQuotationSent(args.userPhone, {
            quotationId: quotation.id,
            jobOfferId: args.jobOfferId,
            requestId: args.requestId,
            totalPrice: args.techAmount,
        });
        return { ok: true, quotationId: quotation.id };
    } catch (err) {
        console.error('[repair-quote-whatsapp] create failed', err);
        return { ok: false, reason: 'error' };
    }
}
