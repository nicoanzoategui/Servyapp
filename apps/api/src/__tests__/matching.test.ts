import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfessionalMatchingService } from '../services/matching.service';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';

vi.mock('@servy/db', () => ({
    prisma: {
        serviceRequest: {
            findUnique: vi.fn(),
        },
        professional: {
            findMany: vi.fn(),
        },
        jobOffer: {
            create: vi.fn(),
        },
    },
}));

vi.mock('../services/whatsapp.service', () => ({
    WhatsAppService: {
        sendTextMessage: vi.fn(),
    },
}));

describe('ProfessionalMatchingService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if request not found', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue(null);

        await expect(ProfessionalMatchingService.findProfessionalsAndCreateOffers('123'))
            .rejects.toThrow('Request not found');
    });

    it('should return error message if no professionals available', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue({
            id: 'req1',
            category: 'Plomería',
            address: 'Calle Falsa 123, CABA',
        });
        (prisma.professional.findMany as any).mockResolvedValue([]);

        const result = await ProfessionalMatchingService.findProfessionalsAndCreateOffers('req1');

        expect(result.msg).toBe('No professionals available for this zone and category');
        expect(result.urgent).toBeNull();
    });

    it('should matching professionals by category and zone', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue({
            id: 'req1',
            category: 'Plomería',
            address: 'Calle Falsa 123, CABA',
        });

        (prisma.professional.findMany as any).mockResolvedValue([
            { id: 'pro1', categories: ['Plomería'], zones: ['CABA'], status: 'active', is_urgent: true, is_scheduled: true, rating: 5, phone: '111' },
            { id: 'pro2', categories: ['Plomería'], zones: ['CABA'], status: 'active', is_urgent: false, is_scheduled: true, rating: 4, phone: '222' },
        ]);

        (prisma.jobOffer.create as any).mockResolvedValue({ id: 'offer1' });

        const result: any = await ProfessionalMatchingService.findProfessionalsAndCreateOffers('req1');

        expect(result.urgent.id).toBe('pro1');
        expect(result.scheduled.id).toBe('pro2');
        expect(prisma.jobOffer.create).toHaveBeenCalledTimes(2);
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledTimes(2);
    });
});
