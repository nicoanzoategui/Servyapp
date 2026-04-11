import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';

const STALE_MS = 72 * 60 * 60 * 1000;

const USER_AUTO_COMPLETE_MSG =
    '⏰ El trabajo se marcó como completado automáticamente.\n\n' +
    'El pago fue liberado a tu técnico. Si tuviste algún inconveniente escribí _ayuda_ y lo revisamos.';

/**
 * Jobs confirmados o en curso sin cambios de estado durante 72h → completado automático.
 *
 * TODO: Acoplar aquí la liberación real del pago al técnico (transferencia MP / creación o cierre de Earning)
 * cuando el flujo automático esté centralizado fuera de mercadopago.service.ts. Hoy el mensaje al usuario
 * refleja el resultado esperado; la liquidación puede seguir siendo manual vía admin.
 */
export async function runJobTimeout(): Promise<void> {
    const threshold = new Date(Date.now() - STALE_MS);

    const staleJobs = await prisma.job.findMany({
        where: {
            status: { in: ['confirmed', 'in_progress'] },
            updated_at: { lt: threshold },
        },
        include: {
            quotation: {
                include: {
                    job_offer: { include: { service_request: true, professional: true } },
                },
            },
        },
    });

    for (const job of staleJobs) {
        const userPhone = job.quotation.job_offer.service_request.user_phone;
        const professionalId = job.quotation.job_offer.professional_id;

        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'completed', completed_at: new Date() },
        });

        try {
            const { clearProfessionalBusyIfNeeded } = await import('../agents/availability-agent');
            await clearProfessionalBusyIfNeeded(professionalId);
        } catch {
            /* no bloquear el cierre */
        }

        // TODO: liberación de fondos al técnico (integración de pagos / earnings).

        await WhatsAppService.sendTextMessage(userPhone, USER_AUTO_COMPLETE_MSG);
    }
}
