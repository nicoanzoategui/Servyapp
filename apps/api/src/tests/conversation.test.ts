import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirst = vi.fn();

vi.mock('@servy/db', () => ({
    prisma: {
        job: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
        user: { findUnique: vi.fn() },
        whatsappSession: { findUnique: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
        serviceRequest: { create: vi.fn() },
    },
}));

vi.mock('../services/whatsapp.service', () => ({
    WhatsAppService: {
        sendTextMessage: vi.fn().mockResolvedValue(undefined),
        sendButtonMessage: vi.fn().mockResolvedValue(undefined),
        sendImageMessage: vi.fn().mockResolvedValue(undefined),
        downloadMedia: vi.fn(),
    },
}));

vi.mock('../utils/redis', () => ({
    redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn(),
    },
}));

vi.mock('../lib/agent-log', () => ({
    insertAgentLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/matching.service', () => ({
    ProfessionalMatchingService: { findProfessionalsAndCreateOffers: vi.fn() },
}));

vi.mock('../services/storage.service', () => ({
    StorageService: { uploadFile: vi.fn(), getSignedUrl: vi.fn() },
}));

vi.mock('../services/mercadopago.service', () => ({
    MercadoPagoService: {},
}));

vi.mock('../services/gemini.service', () => ({
    GeminiService: { classifyProblem: vi.fn() },
}));

import { ConversationService } from '../services/conversation.service';
import { WhatsAppService } from '../services/whatsapp.service';
import type { Professional } from '@servy/db';

const activeJob = {
    id: 'job-1',
    quotation: {
        job_offer: {
            professional_id: 'prof-1',
            professional: { name: 'María', phone: '549222' },
            service_request: { user_phone: '549333' },
        },
    },
};

describe('ConversationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('"estoy yendo" del técnico → avisa al usuario', async () => {
        mockFindFirst.mockResolvedValueOnce(activeJob);
        const pro = { id: 'prof-1', phone: '549222', name: 'María' } as Professional;
        const ok = await ConversationService.handleProfessionalMediatedMessaging({
            professional: pro,
            phone: '549222',
            body: 'estoy yendo',
            messageType: 'text',
        });
        expect(ok).toBe(true);
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledWith(
            '549333',
            expect.stringContaining('en camino')
        );
    });

    it('"tuve un imprevisto" → avisa al usuario y loguea en agent_logs', async () => {
        mockFindFirst.mockResolvedValueOnce(activeJob);
        const { insertAgentLog } = await import('../lib/agent-log');
        const pro = { id: 'prof-1', phone: '549222', name: 'María' } as Professional;
        await ConversationService.handleProfessionalMediatedMessaging({
            professional: pro,
            phone: '549222',
            body: 'tuve un imprevisto',
            messageType: 'text',
        });
        expect(insertAgentLog).toHaveBeenCalledWith(
            expect.objectContaining({
                agent: 'messaging',
                event: 'command_imprevisto',
                level: 'warn',
            })
        );
    });

    it('mensaje libre del usuario con job activo → reenvía al técnico', async () => {
        mockFindFirst.mockResolvedValueOnce({
            id: 'job-1',
            quotation: {
                job_offer: {
                    professional: { phone: '549222' },
                },
            },
        });
        const forwarded = await (
            ConversationService as unknown as {
                tryForwardUserMessageToProfessional: (
                    p: string,
                    t: string,
                    s: { state: string; data: Record<string, unknown> }
                ) => Promise<boolean>;
            }
        ).tryForwardUserMessageToProfessional('549333', 'Llegan a las 3?', { state: 'IDLE', data: {} });
        expect(forwarded).toBe(true);
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledWith(
            '549222',
            expect.stringContaining('Mensaje del cliente')
        );
    });

    it('smoke: servicio exportado', () => {
        expect(ConversationService.processMessage).toBeDefined();
    });
});
