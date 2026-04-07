import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/redis', () => ({
    redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
    },
}));

const queryRaw = vi.fn();
const executeRawUnsafe = vi.fn();

vi.mock('@servy/db', () => ({
    prisma: {
        $queryRaw: (...args: unknown[]) => queryRaw(...args),
        $executeRawUnsafe: (...args: unknown[]) => executeRawUnsafe(...args),
    },
}));

vi.mock('../services/whatsapp.service', () => ({
    WhatsAppService: {
        sendTextMessage: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../lib/agent-log', () => ({
    insertAgentLog: vi.fn().mockResolvedValue(undefined),
}));

import { getShiftEndTtlSeconds, processAvailabilityMessage } from '../agents/availability-agent';
import { WhatsAppService } from '../services/whatsapp.service';
import type { Professional } from '@servy/db';

const pro = {
    id: 'prof-1',
    phone: '549111',
    name: 'Test',
} as Professional;

describe('AvailabilityAgent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryRaw.mockResolvedValue([]);
    });

    it('"listo por hoy" → checkout del técnico', async () => {
        const handled = await processAvailabilityMessage({
            professional: pro,
            body: 'listo por hoy',
            messageType: 'text',
        });
        expect(handled).toBe(true);
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledWith(
            pro.phone,
            expect.stringContaining('desconectado')
        );
    });

    it('"lsto por hoy" (typo) → checkout por Levenshtein ≤ 2', async () => {
        const handled = await processAvailabilityMessage({
            professional: pro,
            body: 'lsto por hoy',
            messageType: 'text',
        });
        expect(handled).toBe(true);
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalled();
    });

    it('"disponible" → check-in y estado activo en Redis', async () => {
        const { redis } = await import('../utils/redis');
        const handled = await processAvailabilityMessage({
            professional: pro,
            body: 'disponible',
            messageType: 'text',
        });
        expect(handled).toBe(true);
        expect(redis.set).toHaveBeenCalled();
        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledWith(
            pro.phone,
            expect.stringContaining('disponible')
        );
    });

    it('técnico sin schedule → TTL default de 12hs', async () => {
        queryRaw.mockResolvedValueOnce([]);
        const ttl = await getShiftEndTtlSeconds('prof-1');
        expect(ttl).toBe(12 * 3600);
    });
});
