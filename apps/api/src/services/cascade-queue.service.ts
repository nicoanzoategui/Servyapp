import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import { CascadeLogger } from '../utils/cascade-logger';
import { WhatsAppService } from './whatsapp.service';

type CascadeJob = {
    requestId: string;
    currentIndex: number;
    professionalIds: string[];
    timeoutMinutes: number; // 10 para programado, 2 para urgente
    priority: 'urgent' | 'scheduled';
    category: string;
    location: string;
    amount: number;
};

export class CascadeQueueService {
    /**
     * Iniciar cascada: ordenar técnicos y enviar al primero
     */
    static async startCascade(
        requestId: string,
        professionalIds: string[],
        priority: 'urgent' | 'scheduled',
        category: string,
        location: string,
        amount: number
    ): Promise<void> {
        if (professionalIds.length === 0) {
            console.error(`[Cascade] No professionals available for request ${requestId}`);
            return;
        }

        const timeoutMinutes = priority === 'urgent' ? 2 : 10;

        const cascadeData: CascadeJob = {
            requestId,
            currentIndex: 0,
            professionalIds,
            timeoutMinutes,
            priority,
            category,
            location,
            amount,
        };

        // Guardar en Redis con TTL del timeout total
        const key = `cascade:${requestId}`;
        const ttlSeconds = timeoutMinutes * 60 * professionalIds.length; // TTL para toda la cascada

        await redis.setex(key, ttlSeconds, JSON.stringify(cascadeData));

        CascadeLogger.cascadeStarted(requestId, professionalIds.length);

        console.log(
            `[Cascade] Started for request ${requestId}, ${professionalIds.length} professionals`
        );

        // Enviar al primer técnico
        await this.sendToNextProfessional(cascadeData);
    }

    /**
     * Enviar trabajo al siguiente técnico en la lista
     */
    private static async sendToNextProfessional(cascade: CascadeJob): Promise<void> {
        const professionalId = cascade.professionalIds[cascade.currentIndex];

        if (!professionalId) {
            // Se acabaron los técnicos
            await this.handleNoTechnicianAvailable(cascade.requestId);
            return;
        }

        const professional = await prisma.professional.findUnique({
            where: { id: professionalId },
            select: {
                phone: true,
                name: true,
                availability_status: true,
            },
        });

        if (!professional) {
            // Técnico no existe, saltar al siguiente
            console.warn(`[Cascade] Professional ${professionalId} not found, skipping`);
            cascade.currentIndex++;
            await this.sendToNextProfessional(cascade);
            return;
        }

        if (professional.availability_status !== 'IDLE') {
            // Técnico no disponible, saltar al siguiente
            console.log(
                `[Cascade] Professional ${professionalId} not IDLE (${professional.availability_status}), skipping`
            );
            cascade.currentIndex++;
            await this.sendToNextProfessional(cascade);
            return;
        }

        // Cambiar estado a EVALUATING
        await prisma.professional.update({
            where: { id: professionalId },
            data: {
                availability_status: 'EVALUATING',
                last_status_change: new Date(),
                total_jobs_offered: { increment: 1 },
            },
        });

        // Crear JobOffer
        const timeoutAt = new Date(Date.now() + cascade.timeoutMinutes * 60 * 1000);

        const jobOffer = await prisma.jobOffer.create({
            data: {
                request_id: cascade.requestId,
                professional_id: professionalId,
                priority: cascade.priority,
                status: 'pending',
                cascade_position: cascade.currentIndex + 1,
                timeout_at: timeoutAt,
            },
        });

        // Guardar timeout en Redis
        const timeoutKey = `cascade:timeout:${jobOffer.id}`;
        await redis.setex(
            timeoutKey,
            cascade.timeoutMinutes * 60,
            JSON.stringify({ jobOfferId: jobOffer.id, requestId: cascade.requestId, professionalId })
        );

        // Enviar mensaje de WhatsApp
        const urgencyEmoji = cascade.priority === 'urgent' ? '🚨 URGENCIA' : '📅 PROGRAMADO';
        const timeText = cascade.priority === 'urgent' ? '2 minutos' : '10 minutos';

        const message =
            `${urgencyEmoji} en tu zona\n\n` +
            `📍 ${cascade.location}\n` +
            `🔧 ${cascade.category}\n` +
            `💰 $${cascade.amount.toLocaleString('es-AR')}\n\n` +
            `REF: #${jobOffer.id.substring(0, 8).toUpperCase()}\n\n` +
            `Respondé en los próximos ${timeText}:\n` +
            `✅ *SI* - Acepto el trabajo\n` +
            `❌ *NO* - No puedo ahora\n\n` +
            `⏰ Expira automáticamente a las ${timeoutAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

        await WhatsAppService.sendTextMessage(professional.phone, message);

        CascadeLogger.offerSent(cascade.requestId, professionalId, jobOffer.id, cascade.currentIndex + 1);

        console.log(
            `[Cascade] Sent offer ${jobOffer.id} to professional ${professionalId} (position ${cascade.currentIndex + 1})`
        );

        // Actualizar Redis con el nuevo currentIndex y jobOfferId
        const key = `cascade:${cascade.requestId}`;
        await redis.setex(
            key,
            cascade.timeoutMinutes * 60 * cascade.professionalIds.length,
            JSON.stringify({
                ...cascade,
                currentJobOfferId: jobOffer.id,
            })
        );
    }

    /**
     * Técnico aceptó el trabajo
     */
    static async acceptJob(jobOfferId: string, professionalId: string): Promise<boolean> {
        try {
            // Bloqueo transaccional
            const result = await prisma.$transaction(async (tx) => {
                const jobOffer = await tx.jobOffer.findUnique({
                    where: { id: jobOfferId },
                    include: { service_request: true },
                });

                if (!jobOffer || jobOffer.status !== 'pending') {
                    return { success: false as const, reason: 'already_taken' };
                }

                if (jobOffer.professional_id !== professionalId) {
                    return { success: false as const, reason: 'wrong_professional' };
                }

                // Marcar como aceptado
                await tx.jobOffer.update({
                    where: { id: jobOfferId },
                    data: {
                        status: 'accepted',
                        responded_at: new Date(),
                        response_time_sec: Math.floor((Date.now() - jobOffer.offered_at.getTime()) / 1000),
                    },
                });

                // Cambiar estado del técnico
                await tx.professional.update({
                    where: { id: professionalId },
                    data: {
                        availability_status: 'IDLE', // Vuelve a IDLE para poder cotizar
                        current_job_offer_id: jobOfferId,
                        total_jobs_accepted: { increment: 1 },
                    },
                });

                return {
                    success: true as const,
                    request: jobOffer.service_request,
                    offeredAt: jobOffer.offered_at,
                };
            });

            if (!result.success) {
                console.log(`[Cascade] Accept failed for ${jobOfferId}: ${result.reason}`);
                return false;
            }

            const responseTimeSeconds = Math.floor((Date.now() - result.offeredAt.getTime()) / 1000);
            CascadeLogger.offerAccepted(result.request.id, professionalId, jobOfferId, responseTimeSeconds);
            CascadeLogger.cascadeCompleted(result.request.id);

            // Limpiar cascada de Redis
            const key = `cascade:${result.request.id}`;
            await redis.del(key);

            // Limpiar timeout
            const timeoutKey = `cascade:timeout:${jobOfferId}`;
            await redis.del(timeoutKey);

            console.log(`[Cascade] Job ${jobOfferId} accepted by professional ${professionalId}`);

            return true;
        } catch (error) {
            console.error('[Cascade] Accept error:', error);
            return false;
        }
    }

    /**
     * Técnico rechazó o timeout
     */
    static async rejectOrTimeout(
        jobOfferId: string,
        professionalId: string,
        reason: 'rejected' | 'timeout'
    ): Promise<void> {
        try {
            const jobOffer = await prisma.jobOffer.findUnique({
                where: { id: jobOfferId },
            });

            if (!jobOffer) return;

            const key = `cascade:${jobOffer.request_id}`;
            const data = await redis.get(key);

            if (!data) {
                console.log(`[Cascade] No cascade data for request ${jobOffer.request_id}`);
                return;
            }

            const cascade: CascadeJob & { currentJobOfferId?: string } = JSON.parse(data);

            // Marcar jobOffer como rechazado
            await prisma.jobOffer.update({
                where: { id: jobOfferId },
                data: {
                    status: reason === 'rejected' ? 'rejected' : 'timeout',
                    responded_at: reason === 'rejected' ? new Date() : null,
                },
            });

            // Cambiar estado del técnico
            await prisma.professional.update({
                where: { id: professionalId },
                data: {
                    availability_status: 'IDLE',
                    total_jobs_rejected: { increment: 1 },
                },
            });

            if (reason === 'rejected') {
                CascadeLogger.offerRejected(cascade.requestId, professionalId, jobOfferId);
            } else {
                CascadeLogger.offerTimeout(cascade.requestId, professionalId, jobOfferId);
            }

            // Limpiar timeout de este jobOffer
            const timeoutKey = `cascade:timeout:${jobOfferId}`;
            await redis.del(timeoutKey);

            // Avanzar al siguiente técnico
            cascade.currentIndex++;

            if (cascade.currentIndex >= cascade.professionalIds.length) {
                // No quedan más técnicos
                await this.handleNoTechnicianAvailable(cascade.requestId);
                await redis.del(key);
                return;
            }

            // Actualizar Redis y enviar al siguiente
            await redis.setex(
                key,
                cascade.timeoutMinutes * 60 * (cascade.professionalIds.length - cascade.currentIndex),
                JSON.stringify(cascade)
            );

            await this.sendToNextProfessional(cascade);

            console.log(
                `[Cascade] Moved to next professional (position ${cascade.currentIndex + 1}) after ${reason}`
            );
        } catch (error) {
            console.error('[Cascade] Reject/timeout error:', error);
        }
    }

    /**
     * No hay técnicos disponibles
     */
    private static async handleNoTechnicianAvailable(requestId: string): Promise<void> {
        console.error(`[Cascade] No technician available for request ${requestId}`);

        CascadeLogger.noTechniciansAvailable(requestId);

        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (request?.user?.phone) {
            await WhatsAppService.sendTextMessage(
                request.user.phone,
                '😔 Lo sentimos, en este momento no tenemos técnicos disponibles en tu zona.\n\n' +
                    'Te avisaremos en cuanto haya uno disponible o podés intentar más tarde.'
            );
        }
    }
}
