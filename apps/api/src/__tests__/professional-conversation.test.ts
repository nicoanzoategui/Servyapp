import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { ProfessionalConversationService } from '../services/professional.conversation.service';
import { VisitFlowService } from '../services/visit-flow.service';
import { redis } from '../utils/redis';

vi.mock('@servy/db', () => ({
    prisma: {
        professional: { findUnique: vi.fn() },
        jobOffer: { update: vi.fn() },
        professionalSession: {
            findUnique: vi.fn(),
            delete: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

vi.mock('../services/visit-flow.service', () => ({
    VisitFlowService: {
        onTechConfirmedVisit: vi.fn().mockResolvedValue(undefined),
        onTechRejectedVisit: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('ProfessionalConversationService job confirm', () => {
    const phone = '5491100000000';

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.spyOn(WhatsAppService, 'sendTextMessage').mockResolvedValue(undefined);
        (prisma.professional.findUnique as any).mockResolvedValue({
            id: 'pro1',
            phone,
            name: 'Ana',
        });
        (prisma.jobOffer.update as any).mockResolvedValue({});
        (prisma.professionalSession.delete as any).mockResolvedValue({});
        await redis.set(
            `pro_session:${phone}`,
            JSON.stringify({
                state: 'AWAITING_JOB_RESPONSE',
                data: { jobOfferId: 'offer1', userPhone: '549119999', requestId: 'req1' },
            }),
            'EX',
            60
        );
    });

    it('accepts natural language confirmation (sí / confirmo)', async () => {
        await ProfessionalConversationService.processMessage(phone, 'Sí, confirmo');
        expect(VisitFlowService.onTechConfirmedVisit).toHaveBeenCalledWith('offer1', '549119999');
        expect(prisma.jobOffer.update).toHaveBeenCalledWith({
            where: { id: 'offer1' },
            data: { status: 'accepted' },
        });
    });

    it('rejects with "no" / "2"', async () => {
        await ProfessionalConversationService.processMessage(phone, 'no');
        expect(VisitFlowService.onTechRejectedVisit).toHaveBeenCalledWith('offer1', 'req1', '549119999');
    });
});
