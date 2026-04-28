import { prisma } from '@servy/db';
import { CascadeQueueService } from './cascade-queue.service';
import { buildProfileCompletionFromDbRow } from './professional-profile-completion.service';
import { normalizeTwilioWhatsAppFrom } from '../utils/twilio-phone';

/** Técnico de prueba: ignora perfil incompleto, zona/categoría y asegura al menos una oferta. */
const MATCHING_BYPASS_PHONE_DIGITS = '5491154142169';

function isMatchingBypassPhone(phone: string | null | undefined): boolean {
    const d = normalizeTwilioWhatsAppFrom(phone || '') || String(phone || '').replace(/\D/g, '');
    return d === MATCHING_BYPASS_PHONE_DIGITS;
}

const professionalMatchSelect = {
    id: true,
    phone: true,
    categories: true,
    zones: true,
    is_urgent: true,
    is_scheduled: true,
    total_jobs_accepted: true,
    rating: true,
    name: true,
    last_name: true,
    dni: true,
    address: true,
    postal_code: true,
    bio: true,
    skills: true,
    cbu_alias: true,
    mp_alias: true,
    payout_institution: true,
    payout_account_type: true,
    documents: { select: { kind: true } },
} as const;

export class ProfessionalMatchingService {
    static async findProfessionalsAndCreateOffers(
        requestId: string,
        priority: 'urgent' | 'scheduled' = 'scheduled'
    ) {
        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!request) return { urgent: null, scheduled: null };

        const userPostalCode = request.user?.postal_code || '';
        const userAddress = request.address || '';

        // Buscar profesionales que coincidan
        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                // Solo disponibles (IDLE u OFFLINE que puedan activarse)
                availability_status: { in: ['IDLE', 'OFFLINE'] },
                OR: [
                    { categories: { has: request.category || '' } },
                    { phone: MATCHING_BYPASS_PHONE_DIGITS },
                ],
            },
            select: professionalMatchSelect,
        });

        // Filtrar por perfil completo
        const profileComplete = professionals.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            const { documents, ...rest } = p;
            return buildProfileCompletionFromDbRow(rest, documents).complete;
        });

        // Filtrar por zona
        const matched = profileComplete.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            if (!p.zones || p.zones.length === 0) return true;
            return p.zones.some(
                (zone) =>
                    zone.trim() === userPostalCode.trim() ||
                    userAddress.toLowerCase().includes(zone.toLowerCase()) ||
                    zone.toLowerCase().includes(userPostalCode.toLowerCase())
            );
        });

        // Filtrar según prioridad solicitada
        let candidates = matched.filter((p) =>
            priority === 'urgent' ? p.is_urgent : p.is_scheduled
        );

        // Si no hay técnicos del tipo solicitado, buscar del otro tipo
        if (candidates.length === 0) {
            candidates = matched.filter((p) => (priority === 'urgent' ? p.is_scheduled : p.is_urgent));
        }

        // Asegurar técnico bypass si existe
        const bypassPro = matched.find((p) => isMatchingBypassPhone(p.phone));
        if (bypassPro && !candidates.find((c) => c.id === bypassPro.id)) {
            candidates.push(bypassPro);
        }

        if (candidates.length === 0) {
            console.log(`[Matching] No professionals available for request ${requestId}`);
            return { urgent: null, scheduled: null };
        }

        // Ordenar por scoring: rating descendente, luego total_jobs_accepted descendente
        const scored = candidates
            .map((p) => ({
                ...p,
                score: (p.rating || 0) * 10 + (p.total_jobs_accepted || 0) * 0.1,
            }))
            .sort((a, b) => b.score - a.score);

        const professionalIds = scored.map((p) => p.id);
        const topProfessional = scored[0];

        console.log(
            `[Matching] Found ${professionalIds.length} professionals for request ${requestId}, starting cascade`
        );

        // Calcular monto (puede venir de request o usar default)
        const amount = priority === 'urgent' ? 50000 : 35000;

        // Iniciar cascada
        await CascadeQueueService.startCascade(
            requestId,
            professionalIds,
            priority,
            request.category || 'Servicio',
            request.address || userPostalCode || 'Tu zona',
            amount
        );

        // Retornar compatibilidad con código existente
        return {
            urgent: priority === 'urgent' ? topProfessional : null,
            scheduled: priority === 'scheduled' ? topProfessional : null,
        };
    }
}
