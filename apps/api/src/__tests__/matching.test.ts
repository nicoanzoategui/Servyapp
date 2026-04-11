import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfessionalMatchingService } from '../services/matching.service';
import { prisma } from '@servy/db';

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

const completePro = (overrides: Record<string, unknown>) => ({
    id: 'pro1',
    categories: ['Plomería'],
    zones: ['1414'],
    is_urgent: true,
    is_scheduled: false,
    rating: 5,
    name: 'Ana',
    last_name: 'García',
    dni: '30123456',
    address: 'Calle 1',
    postal_code: '1414',
    bio: 'a'.repeat(35),
    skills: ['Instalaciones'],
    cbu_alias: '0000000000000000000000',
    mp_alias: null,
    payout_institution: 'Banco',
    payout_account_type: 'cbu',
    documents: [{ kind: 'dni_front' }, { kind: 'dni_back' }],
    ...overrides,
});

describe('ProfessionalMatchingService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns nulls if request not found', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue(null);

        const result = await ProfessionalMatchingService.findProfessionalsAndCreateOffers('123');

        expect(result).toEqual({ urgent: null, scheduled: null });
    });

    it('returns nulls if no professionals match', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue({
            id: 'req1',
            category: 'Plomería',
            address: 'Calle Falsa 123, CABA',
            user: { postal_code: '1000' },
        });
        (prisma.professional.findMany as any).mockResolvedValue([]);

        const result = await ProfessionalMatchingService.findProfessionalsAndCreateOffers('req1');

        expect(result.urgent).toBeNull();
        expect(result.scheduled).toBeNull();
    });

    it('matches by postal code and creates offers for distinct urgent vs scheduled pros', async () => {
        (prisma.serviceRequest.findUnique as any).mockResolvedValue({
            id: 'req1',
            category: 'Plomería',
            address: 'Calle Falsa 123, CABA (1414)',
            user: { postal_code: '1414' },
        });

        (prisma.professional.findMany as any).mockResolvedValue([
            completePro({ id: 'pro1', is_urgent: true, is_scheduled: false, rating: 5 }),
            completePro({
                id: 'pro2',
                is_urgent: false,
                is_scheduled: true,
                rating: 4,
                phone: '222',
            }),
        ]);

        (prisma.jobOffer.create as any).mockResolvedValue({ id: 'offer1' });

        const result = await ProfessionalMatchingService.findProfessionalsAndCreateOffers('req1');

        expect(result.urgent?.id).toBe('pro1');
        expect(result.scheduled?.id).toBe('pro2');
        expect(prisma.jobOffer.create).toHaveBeenCalledTimes(2);
    });
});
