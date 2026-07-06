import { prisma } from '@servy/db';
import { formatArs, visitFeeForPriority, type ServicePriority } from './visit-pricing';

/** Comisión Servy sobre mano de obra del técnico. */
export const REPAIR_SERVY_COMMISSION_RATE = 0.15;
/** Costo de procesamiento sobre (mano de obra + comisión Servy). */
export const REPAIR_PLATFORM_FEE_RATE = 0.06;

export type RepairPricingBreakdown = {
    techAmount: number;
    servyFee: number;
    platformFee: number;
    grossTotal: number;
    visitCredit: number;
    clientCharge: number;
};

export function calculateRepairPricing(techAmount: number, visitFeePaid: number): RepairPricingBreakdown {
    const servyFee = Math.round(techAmount * REPAIR_SERVY_COMMISSION_RATE);
    const subtotalAfterServy = techAmount + servyFee;
    const platformFee = Math.round(subtotalAfterServy * REPAIR_PLATFORM_FEE_RATE);
    const grossTotal = techAmount + servyFee + platformFee;
    const clientCharge = Math.max(0, grossTotal - visitFeePaid);

    return {
        techAmount,
        servyFee,
        platformFee,
        grossTotal,
        visitCredit: visitFeePaid,
        clientCharge,
    };
}

/** Visita ya abonada: visit_fee del pedido o total de la cotización visita. */
export async function resolveVisitFeePaidForRepair(jobOfferId: string): Promise<number> {
    const offer = await prisma.jobOffer.findUnique({
        where: { id: jobOfferId },
        include: { service_request: true },
    });
    if (!offer) return visitFeeForPriority('scheduled');

    const sr = offer.service_request;
    if (sr.visit_fee != null && sr.visit_fee > 0) return sr.visit_fee;

    const visitQuotation = await prisma.quotation.findFirst({
        where: { job_offer_id: jobOfferId, quotation_type: 'visit' },
    });
    if (visitQuotation?.total_price) return visitQuotation.total_price;

    const priority = (sr.priority as ServicePriority | null) ?? 'scheduled';
    return visitFeeForPriority(priority);
}

export function formatRepairQuoteBreakdown(b: RepairPricingBreakdown, proName: string): string {
    return (
        `💰 *Presupuesto del arreglo*\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 *${proName}*\n` +
        `🔧 Mano de obra: *$${formatArs(b.techAmount)}*\n` +
        `📋 Comisión Servy (15%): *$${formatArs(b.servyFee)}*\n` +
        `💳 Costo de procesamiento (6%): *$${formatArs(b.platformFee)}*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Subtotal: *$${formatArs(b.grossTotal)}*\n` +
        `✅ Visita ya abonada: *-$${formatArs(b.visitCredit)}*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💵 *Total a pagar: $${formatArs(b.clientCharge)}*\n\n` +
        `⚠️ _Precio no incluye materiales_\n\n` +
        `🔒 _Pago protegido hasta que confirmes el trabajo._\n\n` +
        `¿Aceptás?\n\n1. Sí, acepto\n2. No, gracias`
    );
}

export function formatRepairPaymentBreakdown(b: RepairPricingBreakdown, proName: string, initPoint: string): string {
    return (
        `*¡Genial!* Confirmamos el arreglo con *${proName}* 🙌\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🔧 Mano de obra: *$${formatArs(b.techAmount)}*\n` +
        `📋 Comisión Servy (15%): *$${formatArs(b.servyFee)}*\n` +
        `💳 Costo de procesamiento (6%): *$${formatArs(b.platformFee)}*\n` +
        `Subtotal: *$${formatArs(b.grossTotal)}*\n` +
        `✅ Visita ya abonada: *-$${formatArs(b.visitCredit)}*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💳 *Total a pagar: $${formatArs(b.clientCharge)}*\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `🔒 *Tu dinero está protegido*\nEl pago queda retenido hasta que el trabajo esté bien hecho.\n\n` +
        `👉 ${initPoint}\n\n` +
        `_Tenés 48 horas para completar el pago._`
    );
}
