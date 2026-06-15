import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';

vi.mock('@servy/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
        professional: {
            findUnique: vi.fn(),
        },
        whatsappSession: {
            findUnique: vi.fn(),
            delete: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

describe('WhatsApp Webhook Flow (Black Box Integration)', () => {
    let sendTextMessageSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        sendTextMessageSpy = vi.spyOn(WhatsAppService, 'sendTextMessage').mockResolvedValue(undefined);
    });

    it('should prompt for onboarding if client is not registered', async () => {
        (prisma.user.findUnique as any).mockResolvedValue(null);
        (prisma.professional.findUnique as any).mockResolvedValue(null);

        const res = await request(app)
            .post('/webhook/twilio')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send('From=whatsapp%3A%2B5491199998888&Body=Hola&MessageSid=SM9999');

        expect(res.status).toBe(200);
        expect(res.text).toBe('<Response></Response>');

        // Debería haber enviado un mensaje de texto de WhatsApp para iniciar el registro
        expect(sendTextMessageSpy).toHaveBeenCalled();
        const args = sendTextMessageSpy.mock.calls[0];
        expect(args[0]).toBe('5491199998888');
        expect(args[1]).toContain('Necesito un técnico'); // Bienvenida inicial del bot
    });
});
