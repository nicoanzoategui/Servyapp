import { prisma } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';

export class ProfessionalMatchingService {
    static async findProfessionalsAndCreateOffers(requestId: string) {
        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) throw new Error('Request not found');

        const address = request.address || '';

        // Simplistic zone grouping logic (in real-life requires geospatial matching)
        // Here we'll just check if the zone array intersects with address string
        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                categories: { has: request.category || '' },
            },
        });

        // We filter in memory for 'zone' simply (for demo purposes)
        const validProfessionals = professionals.filter((p) =>
            p.zones.some((zone) => address.toLowerCase().includes(zone.toLowerCase().trim()))
        );

        let urgent = validProfessionals
            .filter((p) => p.is_urgent)
            .sort((a, b) => b.rating - a.rating)[0];

        let scheduled = validProfessionals
            .filter((p) => p.is_scheduled)
            .sort((a, b) => b.rating - a.rating)[0];

        // If both resolve to the same professional, remove it from scheduled
        if (urgent && scheduled && urgent.id === scheduled.id) {
            scheduled = validProfessionals
                .filter((p) => p.is_scheduled && p.id !== urgent.id)
                .sort((a, b) => b.rating - a.rating)[0];
        }

        if (!urgent && !scheduled) {
            // Retornar mensaje de no disponibilidad (or throw a flag to handle)
            return { msg: 'No professionals available for this zone and category', urgent: null, scheduled: null };
        }

        const offers = [];

        // Create JobOffers and notify them
        if (urgent) {
            const offer = await prisma.jobOffer.create({
                data: {
                    request_id: request.id,
                    professional_id: urgent.id,
                    priority: 'urgent',
                },
            });
            offers.push(offer);

            await WhatsAppService.sendTextMessage(
                urgent.phone,
                `¡Nuevo trabajo urgente! Categoría: ${request.category}. ¿Querés cotizarlo? Ingresá al portal.`
            );
        }

        if (scheduled) {
            const offer = await prisma.jobOffer.create({
                data: {
                    request_id: request.id,
                    professional_id: scheduled.id,
                    priority: 'scheduled',
                },
            });
            offers.push(offer);

            await WhatsAppService.sendTextMessage(
                scheduled.phone,
                `Nuevo trabajo programado. Categoría: ${request.category}. Ingresá al portal para cotizarlo.`
            );
        }

        return { urgent, scheduled, offers };
    }
}
