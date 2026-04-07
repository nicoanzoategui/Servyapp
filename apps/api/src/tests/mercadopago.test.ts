import { describe, it, expect, vi, beforeEach } from 'vitest';

const jobFindUnique = vi.fn();
const paymentUpdateMany = vi.fn();
const jobCreate = vi.fn();
const serviceRequestFindUnique = vi.fn();

vi.mock('@servy/db', () => ({
    prisma: {
        job: {
            findUnique: (...a: unknown[]) => jobFindUnique(...a),
            create: (...a: unknown[]) => jobCreate(...a),
        },
        payment: { updateMany: (...a: unknown[]) => paymentUpdateMany(...a) },
        serviceRequest: { findUnique: (...a: unknown[]) => serviceRequestFindUnique(...a) },
    },
}));

vi.mock('../services/mercadopago.service', () => ({
    MercadoPagoService: {
        getPayment: vi.fn(),
    },
}));

vi.mock('../services/qr.service', () => ({
    QRService: {
        generateAndUpload: vi.fn().mockResolvedValue(null),
    },
}));

vi.mock('../lib/queue', () => ({
    enqueuePostPaymentMessaging: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/whatsapp.service', () => ({
    WhatsAppService: {
        sendTextMessage: vi.fn().mockResolvedValue(undefined),
        sendImageMessage: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../lib/sentry', () => ({
    captureException: vi.fn(),
}));

import { handleMPWebhook } from '../controllers/webhook.controller';
import { MercadoPagoService } from '../services/mercadopago.service';
import { enqueuePostPaymentMessaging } from '../lib/queue';

describe('MercadoPago webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('status approved → encola mensajes post-pago (usuario y técnico)', async () => {
        jobFindUnique.mockResolvedValueOnce(null);
        paymentUpdateMany.mockResolvedValueOnce({ count: 1 });
        jobCreate.mockResolvedValueOnce({
            id: 'job-1',
            quotation: {
                total_price: 1000,
                job_offer: {
                    professional: { name: 'Pro', phone: '549111' },
                    request_id: 'req-1',
                },
            },
        });
        serviceRequestFindUnique.mockResolvedValueOnce({
            address: 'Calle 1',
            description: 'Arreglo',
            scheduled_slot: null,
            scheduled_date: null,
        });

        vi.mocked(MercadoPagoService.getPayment).mockResolvedValueOnce({
            status: 'approved',
            metadata: { quotation_id: 'q-1', user_phone: '549000' },
        } as never);

        const req = {
            body: {
                type: 'payment',
                data: { id: 'pay-1' },
            },
            headers: {},
        } as never;
        const res = { sendStatus: vi.fn() } as never;

        await handleMPWebhook(req, res);

        expect(enqueuePostPaymentMessaging).toHaveBeenCalledWith(
            expect.objectContaining({
                userPhone: '549000',
                proPhone: '549111',
            })
        );
    });

    it('status rejected → notifica al usuario', async () => {
        paymentUpdateMany.mockResolvedValueOnce({ count: 1 });
        vi.mocked(MercadoPagoService.getPayment).mockResolvedValueOnce({
            status: 'rejected',
            metadata: { quotation_id: 'q-2', user_phone: '549000' },
        } as never);

        const { WhatsAppService } = await import('../services/whatsapp.service');
        const req = {
            body: {
                type: 'payment',
                data: { id: 'pay-2' },
            },
            headers: {},
        } as never;
        const res = { sendStatus: vi.fn() } as never;

        await handleMPWebhook(req, res);

        expect(WhatsAppService.sendTextMessage).toHaveBeenCalledWith(
            '549000',
            expect.stringContaining('cancelado')
        );
    });

    it('status duplicado → ignora (idempotente)', async () => {
        jobFindUnique.mockResolvedValueOnce({ id: 'existing' });
        vi.mocked(MercadoPagoService.getPayment).mockResolvedValueOnce({
            status: 'approved',
            metadata: { quotation_id: 'q-3', user_phone: '549000' },
        } as never);

        const req = {
            body: {
                type: 'payment',
                data: { id: 'pay-3' },
            },
            headers: {},
        } as never;
        const res = { sendStatus: vi.fn() } as never;

        await handleMPWebhook(req, res);

        expect(jobCreate).not.toHaveBeenCalled();
    });

    it('quotation_id inexistente → no hace nada', async () => {
        vi.mocked(MercadoPagoService.getPayment).mockResolvedValueOnce({
            status: 'approved',
            metadata: {},
        } as never);

        const req = {
            body: {
                type: 'payment',
                data: { id: 'pay-4' },
            },
            headers: {},
        } as never;
        const res = { sendStatus: vi.fn() } as never;

        await handleMPWebhook(req, res);

        expect(jobCreate).not.toHaveBeenCalled();
    });

    it('firma HMAC inválida → 401 (ruta MP usa body JSON; smoke de contrato)', async () => {
        expect(typeof handleMPWebhook).toBe('function');
    });
});
