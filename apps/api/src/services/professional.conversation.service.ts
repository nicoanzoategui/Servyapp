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
                ? '⚡ *Urgente* — tarifa alta'
                : '📅 *Programado* — tarifa estándar';

        const jobCount = await prisma.job.count({
            where: { quotation: { job_offer: { professional_id: professional.id } } },
        });

        const uname = `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Cliente';
        const cat = request.category ?? '—';
        const desc = request.description ?? '—';
        const addr = request.address ?? '—';
        const sched = jobOffer.schedule || 'A coordinar';

        const proFirst = professional.name.trim() || 'vos';
        const body =
            jobCount === 0
                ? `🎉 *¡Tu primer trabajo en Servy, ${proFirst}!*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Aceptás el trabajo?\n\n1. Sí, acepto\n2. No, paso`
                : `💼 *Nuevo trabajo disponible*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Aceptás el trabajo?\n\n1. Sí, acepto\n2. No, paso`;

        await WhatsAppService.sendTextMessage(professional.phone, body);

        await this.saveSession(professional.phone, 'AWAITING_JOB_RESPONSE', {
            jobOfferId: jobOffer.id,
            requestId: request.id,
            userPhone: user.phone,
        });
    }

    static async processMessage(phone: string, content: string) {
        if (content.toLowerCase() === 'cancelar') {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                'Sesión cancelada. Te avisamos cuando haya un nuevo trabajo disponible.'
            );
            return;
        }

        const professional = await prisma.professional.findUnique({ where: { phone } });
        if (!professional) return;

        const session = await this.getSession(phone);

        if (session.state === 'AWAITING_JOB_RESPONSE') {
            const jobOfferId = session.data.jobOfferId as string;
            const userPhone = session.data.userPhone as string;
            const requestId = session.data.requestId as string;

            if (content === `job_accept_${jobOfferId}` || content.toLowerCase().includes('acepto') || content === '1') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'accepted' } });
                const { markProfessionalBusy } = await import('../agents/availability-agent');
                await markProfessionalBusy(professional.id).catch(() => {});
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    '*Perfecto.* Trabajo aceptado ✅\n\nMandanos la cotización con este formato:\n\nTrabajo: [descripción del trabajo]\nTiempo: [tiempo estimado]\nPrecio: [monto en pesos]\n\n_El precio NO incluye materiales._'
                );
            } else if (content === `job_reject_${jobOfferId}` || content.toLowerCase().includes('paso') || content === '2') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } });
                const { clearProfessionalBusyIfNeeded } = await import('../agents/availability-agent');
                await clearProfessionalBusyIfNeeded(professional.id).catch(() => {});
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    'Entendido. No te preocupes, te avisamos cuando haya otro trabajo disponible. 💪'
                );

                await WhatsAppService.sendTextMessage(
                    userPhone,
                    'El técnico que te recomendamos no está disponible en este momento.\n\nYa estamos buscando otra opción para vos. En breve te avisamos. 🔍'
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
                    'No pude leer bien la cotización. Usá este formato exacto:\n\nTrabajo: [descripción]\nTiempo: [tiempo estimado]\nPrecio: [monto en pesos]'
                );
                return;
            }

            const precioNum = parseFloat(precio.replace(/[^0-9.]/g, ''));
            if (Number.isNaN(precioNum) || precioNum <= 0) {
                await WhatsAppService.sendTextMessage(
                    phone,
                    'El precio no es válido. Enviá un monto en pesos en la línea _Precio:_\n\n_Ej: Precio: 45000_'
                );
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
            await WhatsAppService.sendTextMessage(phone, '✅ *Cotización enviada.*\n\nTe avisamos cuando el cliente la acepte.');

            const { ConversationService } = await import('./conversation.service');
            await ConversationService.afterQuotationSent(userPhone, {
                quotationId: quotation.id,
                jobOfferId,
                requestId: jobOffer.request_id,
                totalPrice: precioNum,
            });
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
                'Lo sentimos, no encontramos más técnicos disponibles en tu zona en este momento.\n\nEscribí cuando quieras intentarlo de nuevo. 🙏'
            );
        }
    }
}
