import { prisma } from '@servy/db';

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
                categories: { has: request.category || '' },
            },
        });

        const matched = professionals.filter((p) => {
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
