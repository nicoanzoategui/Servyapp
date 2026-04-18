import { prisma } from '@servy/db';
import { buildProfileCompletionFromDbRow } from './professional-profile-completion.service';

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
                    // Excepción: tu usuario de prueba recibe TODO
                    { phone: '5491154142169' },
                ],
            },
            select: professionalMatchSelect,
        });

        const profileComplete = professionals.filter((p) => {
            const { documents, ...rest } = p;
            return buildProfileCompletionFromDbRow(rest, documents).complete;
        });

        const matched = profileComplete.filter((p) => {
            // Excepción: tu usuario de prueba pasa siempre
            if (p.phone === '5491154142169') return true;

            // Filtro normal por zona
            if (!p.zones || p.zones.length === 0) return true;
            return p.zones.some(
                (zone) =>
                    zone.trim() === userPostalCode.trim() ||
                    userAddress.toLowerCase().includes(zone.toLowerCase()) ||
                    zone.toLowerCase().includes(userPostalCode.toLowerCase())
            );
        });

        const urgent =
            matched.filter((p) => p.is_urgent).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
        const scheduled =
            matched.filter((p) => p.is_scheduled).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;

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
