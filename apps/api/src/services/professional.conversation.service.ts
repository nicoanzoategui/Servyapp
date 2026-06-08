import { prisma, type JobOffer, type Professional, type ServiceRequest, type User } from '@servy/db';
import { redis } from '../utils/redis';
import { WhatsAppService } from './whatsapp.service';
import { formatArs, visitFeeForPriority, type ServicePriority } from './visit-pricing';

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
        const priority = (jobOffer.priority || 'scheduled') as ServicePriority;
        const fee = request.visit_fee ?? visitFeeForPriority(priority);
        const urgencyText =
            priority === 'urgent'
                ? `⚡ *Urgente* — Visita $${formatArs(fee)}`
                : `📅 *Programado* — Visita $${formatArs(fee)}`;

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
                ? `🎉 *¡Tu primer trabajo en Servy, ${proFirst}!*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Confirmás que podés ir en ese turno?\n\n1. Sí, confirmo\n2. No, paso`
                : `💼 *Nueva visita disponible*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Confirmás que podés ir en ese turno?\n\n1. Sí, confirmo\n2. No, paso`;

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
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    `*Perfecto.* Turno confirmado ✅\n\nLe enviamos al cliente el link de pago de la visita. Te avisamos cuando abone.\n\n_Comandos útiles cuando estés en camino: *estoy yendo*, *llego en X minutos*_`
                );

                const { VisitFlowService } = await import('./visit-flow.service');
                await VisitFlowService.onTechConfirmedVisit(jobOfferId, userPhone);
            } else if (content === `job_reject_${jobOfferId}` || content.toLowerCase().includes('paso') || content === '2') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } });
                const { clearProfessionalBusyIfNeeded } = await import('../agents/availability-agent');
                await clearProfessionalBusyIfNeeded(professional.id).catch(() => {});
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    'Entendido. No te preocupes, te avisamos cuando haya otro trabajo disponible. 💪'
                );

                const { VisitFlowService } = await import('./visit-flow.service');
                await VisitFlowService.onTechRejectedVisit(jobOfferId, requestId, userPhone);
            } else {
                await WhatsAppService.sendTextMessage(phone, 'Respondé *1* para confirmar o *2* para pasar.');
            }
            return;
        }
    }
}
