import { prisma } from '@servy/db';
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
    static async findProfessionalsAndCreateOffers(requestId: string) {
        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request) return { urgent: null, scheduled: null };

        const userPostalCode = request.user?.postal_code || '';
        const userAddress = request.address || '';

        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                OR: [
                    // Filtro normal: debe tener la categoría
                    { categories: { has: request.category || '' } },
                    // Excepción: técnico de prueba (mismo formato que en DB)
                    { phone: MATCHING_BYPASS_PHONE_DIGITS },
                ],
            },
            select: professionalMatchSelect,
        });

        const profileComplete = professionals.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            const { documents, ...rest } = p;
            return buildProfileCompletionFromDbRow(rest, documents).complete;
        });

        const matched = profileComplete.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;

            // Filtro normal por zona
            if (!p.zones || p.zones.length === 0) return true;
            return p.zones.some(
                (zone) =>
                    zone.trim() === userPostalCode.trim() ||
                    userAddress.toLowerCase().includes(zone.toLowerCase()) ||
                    zone.toLowerCase().includes(userPostalCode.toLowerCase())
            );
        });

        let urgent =
            matched.filter((p) => p.is_urgent).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
        let scheduled =
            matched.filter((p) => p.is_scheduled).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;

        const bypassPro = matched.find((p) => isMatchingBypassPhone(p.phone));
        if (bypassPro) {
            const inUrgent = urgent?.id === bypassPro.id;
            const inScheduled = scheduled?.id === bypassPro.id;
            if (!inUrgent && !inScheduled) {
                if (!urgent) urgent = bypassPro;
                else if (!scheduled) scheduled = bypassPro;
                else scheduled = bypassPro;
            }
        }

        if (urgent) {
            await prisma.jobOffer.create({
                data: { request_id: requestId, professional_id: urgent.id, priority: 'urgent', status: 'pending' },
            });
        }
        if (scheduled && scheduled.id !== urgent?.id) {
            await prisma.jobOffer.create({
                data: {
                    request_id: requestId,
                    professional_id: scheduled.id,
                    priority: 'scheduled',
                    status: 'pending',
                },
            });
        }

        return { urgent, scheduled };
    }
}
