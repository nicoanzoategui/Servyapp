import { prisma, type JobOffer, type Professional, type ServiceRequest, type User } from '@servy/db';
import { redis } from '../utils/redis';
import { WhatsAppService } from './whatsapp.service';

const SESSION_TTL = 60 * 60 * 24;

export class ProfessionalConversationService {
    private static async getSession(phone: string) {
        try {
            const cached = await redis.get(`pro_session:${phone}`);
            if (cached) {
                const p = JSON.parse(cached) as { state: string; data: Record<string, unknown> };
                return { state: String(p.state).toUpperCase(), data: p.data };
            }
        } catch {
            /* cache miss / redis down */
        }
        const row = await prisma.professionalSession.findUnique({ where: { phone } });
        if (!row) return { state: 'IDLE', data: {} as Record<string, unknown> };
        if (row.expires_at < new Date()) {
            await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
            return { state: 'IDLE', data: {} as Record<string, unknown> };
        }
        return { state: String(row.step).toUpperCase(), data: (row.data_json as Record<string, unknown>) || {} };
    }

    private static async saveSession(phone: string, state: string, data: Record<string, unknown> = {}) {
        try {
            await redis.set(`pro_session:${phone}`, JSON.stringify({ state, data }), 'EX', SESSION_TTL);
        } catch {
            /* redis optional */
        }
        await prisma.professionalSession.upsert({
            where: { phone },
            update: {
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + SESSION_TTL * 1000),
            },
            create: {
                phone,
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + SESSION_TTL * 1000),
            },
        });
    }

    private static async clearSession(phone: string) {
        try {
            await redis.del(`pro_session:${phone}`);
        } catch {
            /* ignore */
        }
        await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
    }

    static async notifyNewJob(
        professional: Professional,
        jobOffer: JobOffer,
        request: ServiceRequest & { user: User },
        user: User
    ) {
        const urgencyText =
            jobOffer.priority === 'urgent'
                ? '⚡ Tipo: URGENTE (tarifa alta)'
                : '📅 Tipo: PROGRAMADO (tarifa estándar)';

        // 1. Primero el mensaje con los detalles
        await WhatsAppService.sendTextMessage(
            professional.phone,
            `🔧 Nuevo trabajo disponible, ${professional.name}!\n\n` +
                `👤 Cliente: ${user.name} ${user.last_name || ''}\n` +
                `📍 Dirección: ${request.address}\n` +
                `🔧 Categoría: ${request.category}\n` +
                `📋 Problema: ${request.description}\n` +
                `🕐 Horario solicitado: ${jobOffer.schedule || 'A coordinar'}\n\n` +
                `${urgencyText}`
        );

        // 2. Después los botones
        await WhatsAppService.sendButtonMessage(
            professional.phone,
            '¿Aceptás el trabajo?',
            [
                { id: `job_accept_${jobOffer.id}`, title: 'Sí, acepto' },
                { id: `job_reject_${jobOffer.id}`, title: 'No, paso' },
            ]
        );

        await this.saveSession(professional.phone, 'AWAITING_JOB_RESPONSE', {
            jobOfferId: jobOffer.id,
            requestId: request.id,
            userPhone: user.phone,
        });
    }

    static async processMessage(phone: string, content: string) {
        const professional = await prisma.professional.findUnique({ where: { phone } });
        if (!professional) return;

        const session = await this.getSession(phone);

        if (session.state === 'AWAITING_JOB_RESPONSE') {
            const jobOfferId = session.data.jobOfferId as string;
            const userPhone = session.data.userPhone as string;
            const requestId = session.data.requestId as string;

            if (content === `job_accept_${jobOfferId}` || content.toLowerCase().includes('acepto') || content === '1') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'accepted' } });
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    `Perfecto! Mandanos la cotización con este formato:\n\n` +
                        `Trabajo: [descripción del trabajo]\n` +
                        `Tiempo: [tiempo estimado]\n` +
                        `Precio: [monto en pesos]\n\n` +
                        `⚠️ Recordá que el precio NO incluye materiales.`
                );
            } else if (content === `job_reject_${jobOfferId}` || content.toLowerCase().includes('paso') || content === '2') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } });
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    'Entendido. No te preocupes, te avisamos cuando haya otro trabajo disponible.'
                );

                const endUser = await prisma.user.findUnique({ where: { phone: userPhone } });
                const greet = endUser?.name?.trim() ? `${endUser.name.trim()}, ` : '';
                await WhatsAppService.sendTextMessage(
                    userPhone,
                    `${greet}el profesional que te recomendamos no está disponible en este momento. ` +
                        'Ya te estamos buscando otro que va a cumplir igual el trabajo en el tiempo que necesitás. En breve te avisamos.'
                );

                await this.findNextProfessional(requestId, jobOfferId, userPhone);
            } else {
                await WhatsAppService.sendTextMessage(phone, 'Respondé *1* para aceptar o *2* para pasar.');
            }
            return;
        }

        if (session.state === 'AWAITING_QUOTATION') {
            const jobOfferId = session.data.jobOfferId as string;
            const userPhone = session.data.userPhone as string;

            const lines = content.split('\n');
            let trabajo = '';
            let tiempo = '';
            let precio = '';

            for (const line of lines) {
                const lower = line.toLowerCase();
                if (lower.startsWith('trabajo:')) trabajo = line.split(':').slice(1).join(':').trim();
                if (lower.startsWith('tiempo:')) tiempo = line.split(':').slice(1).join(':').trim();
                if (lower.startsWith('precio:')) precio = line.split(':').slice(1).join(':').trim();
            }

            if (!trabajo || !tiempo || !precio) {
                await WhatsAppService.sendTextMessage(
                    phone,
                    'No pude leer bien la cotización. Usá este formato exacto:\n\n' +
                        'Trabajo: [descripción]\n' +
                        'Tiempo: [tiempo estimado]\n' +
                        'Precio: [monto en pesos]'
                );
                return;
            }

            const precioNum = parseFloat(precio.replace(/[^0-9.]/g, ''));
            if (Number.isNaN(precioNum) || precioNum <= 0) {
                await WhatsAppService.sendTextMessage(phone, 'El precio no es válido. Enviá un monto en pesos en la línea Precio:');
                return;
            }

            const jobOffer = await prisma.jobOffer.findUnique({
                where: { id: jobOfferId },
                include: { service_request: true },
            });
            if (!jobOffer) return;

            const quotation = await prisma.quotation.create({
                data: {
                    job_offer_id: jobOfferId,
                    items_json: [{ description: trabajo, price: precioNum }],
                    total_price: precioNum,
                    description: trabajo,
                    estimated_duration: tiempo,
                    status: 'pending',
                },
            });

            await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'quoted' } });

            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, '✅ Cotización enviada al cliente. Te avisamos cuando la acepte.');

            const { ConversationService } = await import('./conversation.service');
            await ConversationService.afterQuotationSent(userPhone, {
                quotationId: quotation.id,
                jobOfferId,
                requestId: jobOffer.request_id,
                totalPrice: precioNum,
            });

            await WhatsAppService.sendButtonMessage(
                userPhone,
                `💼 ${professional.name} te envió su cotización:\n\n` +
                    `🔧 Trabajo: ${trabajo}\n` +
                    `⏱ Tiempo estimado: ${tiempo}\n` +
                    `💰 Total: $${precioNum.toLocaleString('es-AR')}\n` +
                    `⚠️ Precio no incluye materiales\n\n` +
                    `¿Qué querés hacer?`,
                [
                    { id: 'btn_accept', title: 'Aceptar' },
                    { id: 'btn_reject', title: 'Rechazar' },
                ]
            );
        }
    }

    private static async findNextProfessional(requestId: string, rejectedOfferId: string, userPhone: string) {
        const nextOffer = await prisma.jobOffer.findFirst({
            where: {
                request_id: requestId,
                id: { not: rejectedOfferId },
                status: 'pending',
            },
            include: {
                professional: true,
                service_request: { include: { user: true } },
            },
        });

        if (nextOffer) {
            const req = nextOffer.service_request;
            const u = req.user;
            await ProfessionalConversationService.notifyNewJob(nextOffer.professional, nextOffer, { ...req, user: u }, u);
        } else {
            await WhatsAppService.sendTextMessage(
                userPhone,
                'Lo sentimos, no encontramos más profesionales disponibles para tu zona en este momento. ' +
                    'Podés intentarlo de nuevo más tarde escribiendo un nuevo mensaje.'
            );
        }
    }
}
