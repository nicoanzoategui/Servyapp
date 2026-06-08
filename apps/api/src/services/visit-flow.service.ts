import { prisma, type User } from '@servy/db';
import { redis } from '../utils/redis';
import { env } from '../utils/env';
import { WhatsAppService } from './whatsapp.service';
import { ProfessionalMatchingService } from './matching.service';
import { MercadoPagoService } from './mercadopago.service';
import {
    formatArs,
    priorityLabel,
    SPEED_SELECTION_PROMPT,
    visitFeeForPriority,
    type ServicePriority,
} from './visit-pricing';

const SESSION_TTL = 60 * 60 * 24;

async function saveUserSession(phone: string, state: string, data: Record<string, unknown> = {}) {
    try {
        await redis.set(`session:${phone}`, JSON.stringify({ state, data }), 'EX', SESSION_TTL);
    } catch {
        /* ignore */
    }
    await prisma.whatsappSession.upsert({
        where: { phone },
        update: { step: state, data_json: data as object, expires_at: new Date(Date.now() + SESSION_TTL * 1000) },
        create: { phone, step: state, data_json: data as object, expires_at: new Date(Date.now() + SESSION_TTL * 1000) },
    });
}

function scheduleDateFromDayKey(dayKey: string): Date {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    if (dayKey === 'day_tomorrow') d.setDate(d.getDate() + 1);
    else if (dayKey === 'day_after') d.setDate(d.getDate() + 2);
    else if (dayKey === 'day_3') d.setDate(d.getDate() + 3);
    return d;
}

export class VisitFlowService {
    static async beginServiceRequest(
        phone: string,
        sessionData: Record<string, unknown>,
        user: { name: string | null; address: string | null }
    ) {
        const address = (sessionData.serviceAddress as string) || user.address || '';

        const request = await prisma.serviceRequest.create({
            data: {
                user_phone: phone,
                category: sessionData.category as string,
                description: sessionData.description as string,
                photos: (sessionData.photos as string[]) || [],
                address,
                status: 'awaiting_speed',
            },
        });

        const hasUrgent = await ProfessionalMatchingService.checkCapacity(request.id, 'urgent');
        const hasScheduled = await ProfessionalMatchingService.checkCapacity(request.id, 'scheduled');

        if (!hasUrgent && !hasScheduled) {
            await WhatsAppService.sendTextMessage(
                phone,
                'No encontramos técnicos disponibles en tu zona en este momento. Probá más tarde o escribí *ayuda*.'
            );
            await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'cancelled' } });
            await saveUserSession(phone, 'IDLE', {});
            return;
        }

        let prompt = SPEED_SELECTION_PROMPT;
        if (!hasUrgent) {
            prompt =
                `Por ahora solo hay *programado* disponible en tu zona.\n\n` +
                `*Programado* — $${formatArs(env.VISIT_FEE_SCHEDULED)} (hasta 72 hs)\n\nEscribí *1* o *programado* para continuar.`;
        } else if (!hasScheduled) {
            prompt =
                `Por ahora solo hay *urgente* disponible en tu zona.\n\n` +
                `*Urgente* — $${formatArs(env.VISIT_FEE_URGENT)} (hoy, en menos de 24 hs)\n\nEscribí *1* o *urgente* para continuar.`;
        }

        await saveUserSession(phone, 'AWAITING_SPEED_SELECTION', {
            requestId: request.id,
            hasUrgent,
            hasScheduled,
            ...sessionData,
        });
        await WhatsAppService.sendTextMessage(phone, prompt);
    }

    static async handleSpeedSelection(phone: string, content: string, session: { data: Record<string, unknown> }) {
        const requestId = session.data.requestId as string;
        const hasUrgent = Boolean(session.data.hasUrgent);
        const hasScheduled = Boolean(session.data.hasScheduled);
        const raw = content.trim();
        const lc = raw.toLowerCase();

        let priority: ServicePriority | null = null;
        if (raw === '1' || lc === 'urgente' || (hasUrgent && !hasScheduled && (lc === 'si' || lc === 'sí'))) {
            if (hasUrgent) priority = 'urgent';
        } else if (raw === '2' || lc === 'programado' || (hasScheduled && !hasUrgent && (lc === 'si' || lc === 'sí'))) {
            if (hasScheduled) priority = 'scheduled';
        }

        if (!priority) {
            await WhatsAppService.sendTextMessage(
                phone,
                hasUrgent && hasScheduled
                    ? 'Escribí *1* para urgente o *2* para programado.'
                    : 'Escribí *1* para continuar con la opción disponible.'
            );
            return;
        }

        const fee = visitFeeForPriority(priority);
        await prisma.serviceRequest.update({
            where: { id: requestId },
            data: { priority, visit_fee: fee, status: 'scheduling' },
        });

        session.data.priority = priority;
        session.data.visitFee = fee;
        session.data.excludedProIds = [];
        session.data.assignAttempts = 0;

        if (priority === 'urgent') {
            const now = new Date();
            const hour = parseInt(
                new Intl.DateTimeFormat('es-AR', {
                    hour: 'numeric',
                    hour12: false,
                    timeZone: 'America/Argentina/Buenos_Aires',
                }).format(now),
                10
            );

            let scheduleOptionIds: string[] = [];
            let scheduleLabels: string[] = [];
            let scheduleMsg = '';

            if (hour < 18) {
                if (hour < 12) {
                    scheduleOptionIds.push('sch_9_12');
                    scheduleLabels.push('9 a 12hs');
                }
                if (hour < 15) {
                    scheduleOptionIds.push('sch_12_15');
                    scheduleLabels.push('12 a 15hs');
                }
                if (hour < 18) {
                    scheduleOptionIds.push('sch_15_18');
                    scheduleLabels.push('15 a 18hs');
                }
                scheduleOptionIds.push('sch_asap');
                scheduleLabels.push('Lo antes posible');
                const lines = scheduleOptionIds.map((_, i) => `${i + 1}. ${scheduleLabels[i]}`).join('\n');
                scheduleMsg = `⚡ *Urgente* — $${formatArs(fee)}\n\n¿En qué horario preferís que vaya hoy?\n\n${lines}`;
            } else {
                scheduleOptionIds = ['sch_tomorrow_morning', 'sch_tomorrow_mid', 'sch_tomorrow_afternoon'];
                scheduleMsg =
                    `⚡ *Urgente* — $${formatArs(fee)}\n\n` +
                    'Ya es tarde para coordinar para hoy.\n\n¿A qué horario preferís mañana?\n\n1. Mañana temprano (8 a 10hs)\n2. Mañana a la mañana (10 a 12hs)\n3. Mañana a la tarde (14 a 18hs)';
            }

            session.data.scheduleOptionIds = scheduleOptionIds;
            await saveUserSession(phone, 'AWAITING_SCHEDULE', session.data);
            await WhatsAppService.sendTextMessage(phone, scheduleMsg);
            return;
        }

        await saveUserSession(phone, 'AWAITING_SCHEDULE_DAY', session.data);
        await WhatsAppService.sendTextMessage(
            phone,
            `📅 *Programado* — $${formatArs(fee)}\n\n¿Qué día preferís?\n\n1. Mañana\n2. Pasado mañana\n3. En 3 días`
        );
    }

    static async finalizeScheduleAndAssignTech(phone: string, sessionData: Record<string, unknown>) {
        const requestId = sessionData.requestId as string;
        const priority = sessionData.priority as ServicePriority;
        const schedule = (sessionData.schedule as string) || null;
        const excluded = (sessionData.excludedProIds as string[]) || [];

        await ProfessionalMatchingService.cancelOffersForRequest(requestId);

        const offer = await ProfessionalMatchingService.assignProfessional(requestId, priority, schedule, excluded);
        if (!offer) {
            await WhatsAppService.sendTextMessage(
                phone,
                'No pudimos asignar un técnico para ese turno. Probá otro horario o escribí *ayuda*.'
            );
            await saveUserSession(phone, 'AWAITING_SPEED_SELECTION', sessionData);
            return;
        }

        const updateData: { scheduled_slot: string | null; status: string; scheduled_date?: Date } = {
            scheduled_slot: schedule,
            status: 'awaiting_tech',
        };
        if (sessionData.scheduledDateIso) {
            updateData.scheduled_date = new Date(sessionData.scheduledDateIso as string);
        }
        await prisma.serviceRequest.update({ where: { id: requestId }, data: updateData });

        sessionData.jobOfferId = offer.id;
        sessionData.proName = ProfessionalMatchingService.formatProName(offer.professional);

        await saveUserSession(phone, 'AWAITING_TECH_CONFIRMATION', sessionData);

        const proName = sessionData.proName as string;
        await WhatsAppService.sendTextMessage(
            phone,
            `⏳ Estamos confirmando con *${proName}* para tu turno:\n_${schedule}_\n\nTe avisamos en unos minutos cuando confirme.`
        );

        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request) return;

        const u = request.user ?? ({ phone, name: null, last_name: null } as User);
        const { ProfessionalConversationService } = await import('./professional.conversation.service');
        await ProfessionalConversationService.notifyNewJob(offer.professional, offer, { ...request, user: u }, u);
    }

    static persistScheduleDay(sessionData: Record<string, unknown>, dayKey: string) {
        sessionData.scheduledDateIso = scheduleDateFromDayKey(dayKey).toISOString();
    }

    static async onTechConfirmedVisit(jobOfferId: string, userPhone: string) {
        const offer = await prisma.jobOffer.findUnique({
            where: { id: jobOfferId },
            include: { professional: true, service_request: true },
        });
        if (!offer) return;

        await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'held' } });

        const fee = offer.service_request.visit_fee ?? visitFeeForPriority(offer.priority as ServicePriority);

        let quotation = await prisma.quotation.findFirst({
            where: { job_offer_id: jobOfferId, quotation_type: 'visit' },
        });

        if (!quotation) {
            quotation = await prisma.quotation.create({
                data: {
                    job_offer_id: jobOfferId,
                    quotation_type: 'visit',
                    items_json: [{ description: 'Visita diagnóstico Servy', price: fee }],
                    total_price: fee,
                    description: `Visita ${priorityLabel(offer.priority as ServicePriority)} — diagnóstico`,
                    estimated_duration: offer.schedule || 'A coordinar',
                    status: 'pending',
                },
            });
        }

        const user = await prisma.user.findUnique({ where: { phone: userPhone } });
        if (!user) {
            await WhatsAppService.sendTextMessage(userPhone, 'No pudimos generar el pago. Escribí *ayuda*.');
            return;
        }

        const proName = ProfessionalMatchingService.formatProName(offer.professional);
        const priceStr = formatArs(fee);
        const sched = offer.schedule || 'A coordinar';

        await saveUserSession(userPhone, 'VISIT_PAYMENT_PENDING', {
            quotationId: quotation.id,
            jobOfferId,
            requestId: offer.request_id,
            visitFee: fee,
        });

        if (!env.PAYMENTS_ENABLED) {
            await WhatsAppService.sendTextMessage(
                userPhone,
                `✅ *${proName}* confirmó tu visita.\n\n📅 ${sched}\n💰 Visita: *$${priceStr}*\n\n_Pagos deshabilitados en este entorno._`
            );
            return;
        }

        try {
            const initPoint = await MercadoPagoService.createPreference(quotation, user, 'visit');
            await WhatsAppService.sendTextMessage(
                userPhone,
                `✅ *${proName}* confirmó tu visita 🎉\n\n━━━━━━━━━━━━━━━\n📅 ${sched}\n💰 *Visita: $${priceStr}*\n━━━━━━━━━━━━━━━\n\n🔒 _Tu dinero queda retenido hasta confirmar el servicio._\n\n👉 ${initPoint}\n\n_Tenés ${env.VISIT_PAYMENT_EXPIRE_MINUTES} minutos para completar el pago._`
            );
        } catch {
            await WhatsAppService.sendTextMessage(
                userPhone,
                '⚠️ Hubo un problema al generar el link de pago. Escribí _ayuda_ y te ayudamos.'
            );
        }
    }

    static async onTechRejectedVisit(jobOfferId: string, requestId: string, userPhone: string) {
        const rejectedOffers = await prisma.jobOffer.findMany({
            where: { request_id: requestId },
            select: { professional_id: true },
        });
        const excludedIds = [...new Set(rejectedOffers.map((o) => o.professional_id))];

        const sessionRow = await prisma.whatsappSession.findUnique({ where: { phone: userPhone } });
        const sessionData = (sessionRow?.data_json as Record<string, unknown>) || {};
        const attempts = ((sessionData.assignAttempts as number) || 0) + 1;

        if (attempts >= env.MAX_TECH_ASSIGNMENT_ATTEMPTS) {
            await WhatsAppService.sendTextMessage(
                userPhone,
                'No pudimos confirmar un técnico para ese turno. Escribí cuando quieras probar de nuevo o elegí otro horario.'
            );
            await saveUserSession(userPhone, 'IDLE', {});
            await prisma.serviceRequest.update({ where: { id: requestId }, data: { status: 'cancelled' } });
            return;
        }

        sessionData.excludedProIds = excludedIds;
        sessionData.assignAttempts = attempts;

        await WhatsAppService.sendTextMessage(
            userPhone,
            'El técnico no pudo tomar ese turno. Estamos buscando otro profesional disponible… 🔍'
        );

        await VisitFlowService.finalizeScheduleAndAssignTech(userPhone, sessionData);
    }

    static async afterRepairQuotationSent(
        userPhone: string,
        payload: { quotationId: string; jobOfferId: string; requestId: string; totalPrice: number }
    ) {
        const offer = await prisma.jobOffer.findUnique({
            where: { id: payload.jobOfferId },
            include: { professional: true },
        });
        const proName = offer?.professional?.name?.trim() || 'Tu técnico';
        const priceStr = formatArs(payload.totalPrice);
        await WhatsAppService.sendTextMessage(
            userPhone,
            `💰 *Presupuesto del arreglo*\n\n━━━━━━━━━━━━━━━\n👤 *${proName}*\n💵 *$${priceStr}*\n⚠️ _Precio no incluye materiales_\n━━━━━━━━━━━━━━━\n\n🔒 _Pago protegido hasta que confirmes el trabajo._\n\n¿Aceptás?\n\n1. Sí, acepto\n2. No, gracias`
        );
        await saveUserSession(userPhone, 'AWAITING_REPAIR_PAYMENT_DECISION', payload as unknown as Record<string, unknown>);
    }
}
